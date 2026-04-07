import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DAY_MAP: Record<string, number> = {
  pazar: 0, paz: 0, sunday: 0, sun: 0, '0': 0,
  pazartesi: 1, pzt: 1, monday: 1, mon: 1, '1': 1,
  salı: 2, sal: 2, tuesday: 2, tue: 2, '2': 2,
  çarşamba: 3, çar: 3, wednesday: 3, wed: 3, '3': 3,
  perşembe: 4, per: 4, thursday: 4, thu: 4, '4': 4,
  cuma: 5, cum: 5, friday: 5, fri: 5, '5': 5,
  cumartesi: 6, cmt: 6, saturday: 6, sat: 6, '6': 6,
};

interface Props { roomId: string; onImported: () => void; }

interface ParsedRow {
  semester: string; day_of_week: number; start_time: string; end_time: string;
  subject_name: string; instructor_name: string; note: string; error?: string;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cols: string[] = []; let current = ''; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    cols.push(current.trim());
    return cols;
  });
}

function validateTime(t: string): string | null {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1]), m = parseInt(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export const ScheduleCSVImport: React.FC<Props> = ({ roomId, onImported }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const downloadTemplate = () => {
    const csv = `donem,gun,baslangic,bitis,ders_adi,ogretim_gorevlisi,not
Bahar 2026,Pazartesi,09:00,10:00,Matematik,Dr. Yılmaz,
Bahar 2026,Pazartesi,10:00,11:00,Fizik,Dr. Demir,Lab dersi
Bahar 2026,Salı,08:00,09:00,Kimya,,`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ders_programi_sablonu.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) { toast({ title: 'Dosya boş', variant: 'destructive' }); return; }

      const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i'));
      const semIdx = headers.findIndex(h => h.includes('donem') || h.includes('semester'));
      const dayIdx = headers.findIndex(h => h.includes('gun') || h.includes('day'));
      const startIdx = headers.findIndex(h => h.includes('baslangic') || h.includes('start'));
      const endIdx = headers.findIndex(h => h.includes('bitis') || h.includes('end'));
      const subIdx = headers.findIndex(h => h.includes('ders') || h.includes('subject'));
      const instrIdx = headers.findIndex(h => h.includes('ogretim') || h.includes('instructor'));
      const noteIdx = headers.findIndex(h => h === 'not' || h === 'note');

      if (subIdx === -1 || dayIdx === -1 || startIdx === -1 || endIdx === -1) {
        toast({ title: 'Gerekli sütunlar eksik: ders_adi, gun, baslangic, bitis', variant: 'destructive' }); return;
      }

      const parsed: ParsedRow[] = rows.slice(1).map((cols) => {
        const raw = {
          semester: (semIdx >= 0 ? cols[semIdx] : '') || 'Bahar 2026',
          day_raw: (dayIdx >= 0 ? cols[dayIdx] : '').toLowerCase(),
          start: startIdx >= 0 ? cols[startIdx] : '',
          end: endIdx >= 0 ? cols[endIdx] : '',
          subject: subIdx >= 0 ? cols[subIdx] : '',
          instructor: instrIdx >= 0 ? cols[instrIdx] : '',
          note: noteIdx >= 0 ? cols[noteIdx] : '',
        };
        const errors: string[] = [];
        const dayNum = DAY_MAP[raw.day_raw];
        if (dayNum === undefined) errors.push(`Geçersiz gün "${cols[dayIdx]}"`);
        const st = validateTime(raw.start); if (!st) errors.push(`Geçersiz başlangıç "${raw.start}"`);
        const et = validateTime(raw.end); if (!et) errors.push(`Geçersiz bitiş "${raw.end}"`);
        if (!raw.subject) errors.push('Ders adı eksik');
        return { semester: raw.semester, day_of_week: dayNum ?? 0, start_time: st || raw.start, end_time: et || raw.end, subject_name: raw.subject, instructor_name: raw.instructor, note: raw.note, error: errors.length > 0 ? errors.join('; ') : undefined };
      });
      setPreview(parsed);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    const valid = preview.filter(r => !r.error);
    if (valid.length === 0) { toast({ title: 'İçe aktarılacak geçerli satır yok', variant: 'destructive' }); return; }
    setImporting(true);
    const payload = valid.map(r => ({ room_id: roomId, semester: r.semester, day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time, subject_name: r.subject_name, instructor_name: r.instructor_name || null, note: r.note || null, is_active: true }));
    const { error } = await supabase.from('class_schedules').insert(payload);
    setImporting(false);
    if (error) { toast({ title: 'İçe aktarma başarısız', description: error.message, variant: 'destructive' }); }
    else {
      const errorCount = preview.filter(r => r.error).length;
      setResult({ success: valid.length, errors: errorCount });
      setPreview([]);
      toast({ title: `${valid.length} ders başarıyla içe aktarıldı` });
      onImported();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" />CSV'den Ders Programı İçe Aktar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Gerekli sütunlar: <code>ders_adi</code>, <code>gun</code>, <code>baslangic</code>, <code>bitis</code>. İsteğe bağlı: <code>donem</code>, <code>ogretim_gorevlisi</code>, <code>not</code>.</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1"><Download className="h-3 w-3" />Şablon İndir</Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1"><Upload className="h-3 w-3" />CSV Dosyası Seç</Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>

        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Önizleme: {preview.filter(r => !r.error).length} geçerli, {preview.filter(r => r.error).length} hatalı</p>
            <div className="max-h-48 overflow-auto border rounded text-xs">
              <table className="w-full">
                <thead><tr className="bg-muted"><th className="p-1 text-left">Gün</th><th className="p-1 text-left">Saat</th><th className="p-1 text-left">Ders</th><th className="p-1 text-left">Durum</th></tr></thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className={r.error ? 'bg-destructive/10' : ''}>
                      <td className="p-1">{DAYS_TR[r.day_of_week]}</td>
                      <td className="p-1">{r.start_time}-{r.end_time}</td>
                      <td className="p-1">{r.subject_name}</td>
                      <td className="p-1">{r.error ? <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{r.error}</span> : <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Tamam</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" onClick={handleImport} disabled={importing || preview.filter(r => !r.error).length === 0}>
              {importing ? 'İçe aktarılıyor...' : `${preview.filter(r => !r.error).length} Ders İçe Aktar`}
            </Button>
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {result.success} ders içe aktarıldı{result.errors > 0 ? `, ${result.errors} atlandı` : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

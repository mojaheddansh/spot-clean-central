import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ParsedRoom {
  floor: string;
  room_number: string;
  room_name: string;
  room_type: string;
  building: string;
  assigned_person_name: string;
  section: string;
  selected: boolean;
  status: 'ok' | 'duplicate' | 'error' | 'missing';
  error?: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

// Detect room type from section header or room name
function detectRoomType(sectionHeader: string, roomName: string): string {
  const h = (sectionHeader + ' ' + roomName).toLowerCase();
  const t = (str: string) => h.includes(str);

  if (t('lavabo') || t('wc') || t('tuvalet')) return 'toilet_wc';
  if (t('laboratuvar') || t('lab')) return 'laboratory';
  if (t('toplantı')) return 'meeting_room';
  if (t('koridor')) return 'corridor';
  if (t('sınıf') || t('derslik')) return 'classroom';
  if (t('ofis') || t('dolu ofis') || t('boş ofis')) return 'office';
  if (t('mutfak')) return 'mutfak';
  if (t('seminer')) return 'meeting_room';
  if (t('depo') || t('arşiv')) return 'office';
  if (t('atölye') || t('atöl')) return 'laboratory';
  if (t('salon')) return 'meeting_room';
  if (t('temizlik odası')) return 'office';
  if (t('ilkyardım')) return 'office';
  if (t('fot')) return 'office';
  return 'office';
}

// Normalize floor name from sheet name
function normalizeFloor(sheetName: string): string {
  const s = sheetName.trim().toUpperCase();
  if (s.includes('BODRUM')) return 'Bodrum Kat';
  if (s.includes('ZEMİN') || s.includes('ZEMIN')) return 'Zemin Kat';
  const match = s.match(/(\d+)\s*\.?\s*KAT/);
  if (match) return `${match[1]}. Kat`;
  return sheetName.trim();
}

// Generate room name
function generateRoomName(roomNumber: string, personName: string, roomType: string, sectionHeader: string): string {
  if (personName) return `${roomNumber} ${personName}`;
  // Check if section header has a special name
  const specials = ['toplantı salonu', 'seminer odası', 'temizlik odası', 'ilkyardım odası',
    'fot.oda', 'mas.atöl', 'depo', 'arşiv', 'laboratuvar', 'salon', 'atölye', 'mutfak'];
  const headerLower = sectionHeader.toLowerCase();
  for (const sp of specials) {
    if (headerLower.includes(sp)) return `${roomNumber} ${sectionHeader}`;
  }
  const typeLabels: Record<string, string> = {
    classroom: 'Sınıf', office: 'Ofis', meeting_room: 'Toplantı Odası',
    laboratory: 'Laboratuvar', toilet_wc: 'Lavabo', corridor: 'Koridor',
  };
  return `${roomNumber} ${typeLabels[roomType] || 'Alan'}`;
}

// Check if a cell value looks like a section header
function isSectionHeader(val: string): boolean {
  if (!val) return false;
  const v = val.trim().toUpperCase();
  const headers = ['DOLU OFİS', 'BOŞ OFİS', 'SINIF', 'MUTFAK', 'LAVABO',
    'ÖZEL ALAN', 'DİĞER', 'TOPLANTI', 'SEMİNER', 'LAB', 'KORIDOR',
    'DEPO', 'ARŞİV', 'ATÖLYE', 'SALON', 'TEMİZLİK'];
  return headers.some(h => v.includes(h)) || v.endsWith('LER') || v.endsWith('LAR');
}

// Check if a value looks like a room/door number
function isRoomNumber(val: string): boolean {
  if (!val) return false;
  const v = val.trim();
  // Patterns like A1-208, A2-Z03, 208, Z03, etc.
  return /^[A-Za-z0-9][\w\-\.\/]+$/.test(v) && v.length <= 20 && !isSectionHeader(v);
}

// Parse a single sheet
function parseSheet(sheet: XLSX.WorkSheet, sheetName: string, building: string): ParsedRoom[] {
  const floor = normalizeFloor(sheetName);
  const results: ParsedRoom[] = [];
  const range = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  
  let currentSection = '';
  
  for (const row of range) {
    if (!Array.isArray(row) || row.length === 0) continue;
    
    // Check if this row is a section header
    const firstCell = String(row[0] || '').trim();
    if (firstCell && isSectionHeader(firstCell)) {
      currentSection = firstCell;
      continue;
    }
    
    // Try to extract rooms from this row
    // Pattern 1: col A = room number, col B = person name, col C = room number, col D = person name
    // Pattern 2: multiple room numbers in cells
    
    for (let col = 0; col < row.length; col++) {
      const cellVal = String(row[col] || '').trim();
      if (!cellVal) continue;
      
      // Check if this cell contains comma-separated room numbers
      if (cellVal.includes(',') && !cellVal.includes(' ')) {
        const parts = cellVal.split(',').map(p => p.trim()).filter(p => isRoomNumber(p));
        for (const part of parts) {
          const roomType = detectRoomType(currentSection, part);
          results.push({
            floor, room_number: part, building,
            room_name: generateRoomName(part, '', roomType, currentSection),
            room_type: roomType, assigned_person_name: '',
            section: currentSection, selected: true, status: 'ok',
          });
        }
        continue;
      }
      
      if (!isRoomNumber(cellVal)) continue;
      
      // Next cell might be person name
      const nextVal = col + 1 < row.length ? String(row[col + 1] || '').trim() : '';
      const personName = (nextVal && !isRoomNumber(nextVal) && !isSectionHeader(nextVal) && nextVal.length > 1 && nextVal.length < 50) ? nextVal : '';
      
      const roomType = detectRoomType(currentSection, cellVal);
      results.push({
        floor, room_number: cellVal, building,
        room_name: generateRoomName(cellVal, personName, roomType, currentSection),
        room_type: roomType, assigned_person_name: personName,
        section: currentSection, selected: true, status: 'ok',
      });
      
      if (personName) col++; // Skip the person name cell
    }
  }
  
  return results;
}

interface Props {
  onImported: () => void;
}

export const ExcelRoomImport: React.FC<Props> = ({ onImported }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rooms, setRooms] = useState<ParsedRoom[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [building, setBuilding] = useState('A Blok');
  const [existingNumbers, setExistingNumbers] = useState<Set<string>>(new Set());

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    // Fetch existing room numbers for duplicate check
    const { data: existingRooms } = await supabase.from('rooms').select('room_number').eq('is_active', true);
    const existingSet = new Set((existingRooms || []).map(r => r.room_number.trim().toUpperCase()));
    setExistingNumbers(existingSet);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allRooms: ParsedRoom[] = [];
        
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const parsed = parseSheet(sheet, sheetName, building);
          allRooms.push(...parsed);
        }

        // Check for duplicates within file
        const seen = new Map<string, number>();
        for (const room of allRooms) {
          const key = room.room_number.toUpperCase();
          if (!room.room_number) {
            room.status = 'missing';
            room.error = 'Kapı numarası eksik';
            room.selected = false;
          } else if (existingSet.has(key)) {
            room.status = 'duplicate';
            room.error = 'Sistemde zaten mevcut';
            room.selected = false;
          } else if (seen.has(key)) {
            room.status = 'duplicate';
            room.error = `Dosyada tekrar (satır ${seen.get(key)! + 1})`;
            room.selected = false;
          } else {
            seen.set(key, allRooms.indexOf(room));
          }
        }

        if (allRooms.length === 0) {
          toast({ title: 'Dosyada oda verisi bulunamadı', variant: 'destructive' });
          return;
        }

        setRooms(allRooms);
        toast({ title: `${allRooms.length} oda/alan bulundu` });
      } catch (err: any) {
        toast({ title: 'Dosya okunamadı', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = '';
  }, [building, toast]);

  const toggleAll = (checked: boolean) => {
    setRooms(prev => prev.map(r => ({ ...r, selected: r.status === 'ok' ? checked : r.selected })));
  };

  const toggleRoom = (idx: number) => {
    setRooms(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
  };

  const handleImport = async () => {
    const selected = rooms.filter(r => r.selected && r.status === 'ok');
    if (selected.length === 0) {
      toast({ title: 'İçe aktarılacak oda seçilmedi', variant: 'destructive' });
      return;
    }

    setImporting(true);
    let imported = 0;
    let errors = 0;

    // Insert in batches of 50
    for (let i = 0; i < selected.length; i += 50) {
      const batch = selected.slice(i, i + 50).map(r => ({
        building: r.building,
        floor: r.floor,
        room_number: r.room_number,
        room_name: r.room_name,
        room_type: r.room_type as any,
        is_active: true,
      }));

      const { error, data } = await supabase.from('rooms').insert(batch).select();
      if (error) {
        errors += batch.length;
        console.error('Import batch error:', error);
      } else {
        imported += (data?.length || batch.length);
      }
    }

    const duplicates = rooms.filter(r => r.status === 'duplicate').length;
    const skipped = rooms.filter(r => !r.selected || r.status !== 'ok').length;

    setResult({ total: rooms.length, imported, skipped, errors, duplicates });
    setImporting(false);

    if (imported > 0) {
      toast({ title: `${imported} oda başarıyla içe aktarıldı` });
      onImported();
    }
    if (errors > 0) {
      toast({ title: `${errors} oda içe aktarılamadı`, variant: 'destructive' });
    }
  };

  const ROOM_TYPE_LABELS: Record<string, string> = {
    classroom: 'Derslik', office: 'Ofis', meeting_room: 'Toplantı Odası',
    laboratory: 'Laboratuvar', toilet_wc: 'Lavabo', corridor: 'Koridor',
  };

  const statusIcons = {
    ok: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    duplicate: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
    missing: <XCircle className="h-4 w-4 text-destructive" />,
  };

  const okCount = rooms.filter(r => r.status === 'ok').length;
  const selectedCount = rooms.filter(r => r.selected && r.status === 'ok').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Excel ile Toplu Oda İçe Aktarma
          </CardTitle>
          <CardDescription>
            Kat sayfalarına göre düzenlenmiş Excel dosyanızı (.xlsx) yükleyin.
            Sistem dosyayı analiz edip oda/alan kayıtlarını otomatik olarak çıkarır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bina Adı</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={building}
              onChange={e => setBuilding(e.target.value)}
              placeholder="A Blok"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Excel Dosyası Seç (.xlsx)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Desteklenen dosya yapısı:</strong></p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Her kat için ayrı sayfa (ör: BODRUM KAT, ZEMİN KAT, 1.KAT, 2.KAT)</li>
              <li>Bölüm başlıkları: DOLU OFİSLER, BOŞ OFİSLER, SINIFLAR, LAVABOLAR vb.</li>
              <li>Çift sütunlu yapı: Kapı No | Personel Adı | Kapı No | Personel Adı</li>
              <li>Virgülle ayrılmış oda numaraları</li>
              <li>Özel alan isimleri: Toplantı Salonu, Laboratuvar, Depo vb.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {rooms.length > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Önizleme</CardTitle>
            <CardDescription>
              Toplam {rooms.length} kayıt bulundu · {okCount} geçerli · {rooms.length - okCount} hatalı/tekrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedCount === okCount && okCount > 0}
                onCheckedChange={(c) => toggleAll(!!c)}
              />
              <span className="text-sm font-medium">Tümünü Seç ({okCount} geçerli)</span>
            </div>

            <div className="max-h-96 overflow-auto border rounded">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    <th className="p-2 text-left">Durum</th>
                    <th className="p-2 text-left">Kat</th>
                    <th className="p-2 text-left">Kapı No</th>
                    <th className="p-2 text-left">Oda Adı</th>
                    <th className="p-2 text-left">Tür</th>
                    <th className="p-2 text-left">Personel</th>
                    <th className="p-2 text-left">Bölüm</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r, i) => (
                    <tr key={i} className={r.status !== 'ok' ? 'bg-muted/50' : r.selected ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}>
                      <td className="p-2">
                        <Checkbox
                          checked={r.selected}
                          onCheckedChange={() => toggleRoom(i)}
                          disabled={r.status !== 'ok'}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          {statusIcons[r.status]}
                          {r.error && <span className="text-muted-foreground">{r.error}</span>}
                        </div>
                      </td>
                      <td className="p-2">{r.floor}</td>
                      <td className="p-2 font-mono">{r.room_number}</td>
                      <td className="p-2">{r.room_name}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{ROOM_TYPE_LABELS[r.room_type] || r.room_type}</Badge></td>
                      <td className="p-2">{r.assigned_person_name || '—'}</td>
                      <td className="p-2 text-muted-foreground">{r.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={importing || selectedCount === 0} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {importing ? 'İçe aktarılıyor...' : `${selectedCount} Oda İçe Aktar`}
              </Button>
              <Button variant="outline" onClick={() => { setRooms([]); setResult(null); }}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">İçe aktarma tamamlandı</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>Toplam bulunan: {result.total}</p>
                  <p className="text-emerald-600">Başarıyla içe aktarılan: {result.imported}</p>
                  {result.duplicates > 0 && <p className="text-amber-600">Tekrar eden (atlandı): {result.duplicates}</p>}
                  {result.skipped > 0 && <p>Atlanan: {result.skipped}</p>}
                  {result.errors > 0 && <p className="text-destructive">Hatalı: {result.errors}</p>}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => { setRooms([]); setResult(null); }}>
                  Yeni Dosya Yükle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

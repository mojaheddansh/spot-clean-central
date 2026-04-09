import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Building2, Layers, DoorOpen, Save, RotateCcw, Info, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FLOORS = [
  { value: 'Bodrum Kat', label: 'Bodrum Kat', numeric: -1 },
  { value: 'Zemin Kat', label: 'Zemin Kat', numeric: 0 },
  { value: '1. Kat', label: '1. Kat', numeric: 1 },
  { value: '2. Kat', label: '2. Kat', numeric: 2 },
  { value: '3. Kat', label: '3. Kat', numeric: 3 },
];

const ROOM_TYPES = [
  { value: 'office', label: 'Ofis', description: 'Bu alan personel ofisi olarak kaydedilecektir.', placeholder: 'Örn: Z-12, A1-208' },
  { value: 'classroom', label: 'Sınıf', description: 'Bu alan derslik / sınıf olarak kaydedilecektir.', placeholder: 'Örn: 101, D-201' },
  { value: 'toilet_wc', label: 'WC / Tuvalet', description: 'Bu alan tuvalet / lavabo olarak kaydedilecektir.', placeholder: 'Örn: WC-01, 2-WC-03' },
  { value: 'mutfak', label: 'Mutfak', description: 'Bu alan mutfak veya servis alanı olarak kaydedilecektir.', placeholder: 'Örn: M-01, ZK-M1' },
  { value: 'corridor', label: 'Koridor', description: 'Bu alan ortak geçiş alanı olarak kaydedilecektir.', placeholder: 'Örn: K-01, Koridor-A' },
  { value: 'meeting_room', label: 'Toplantı Odası', description: 'Bu alan toplantı ve görüşme odası olarak kaydedilecektir.', placeholder: 'Örn: T-301, TS-01' },
  { value: 'laboratory', label: 'Laboratuvar', description: 'Bu alan laboratuvar olarak kaydedilecektir.', placeholder: 'Örn: LAB-01, L-101' },
];

const TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(ROOM_TYPES.map(t => [t.value, t.label]));

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export const RoomCreateForm: React.FC<Props> = ({ onCreated, onCancel }) => {
  const { toast } = useToast();
  const [floor, setFloor] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [building, setBuilding] = useState('');
  const [assignedPerson, setAssignedPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [managerId, setManagerId] = useState('');
  const [cleanerId, setCleanerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingRooms, setExistingRooms] = useState<{ floor: string; room_number: string }[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [roomsRes, managersRes, cleanersRes] = await Promise.all([
        supabase.from('rooms').select('floor, room_number').eq('is_active', true),
        supabase.from('profiles').select('id, full_name').eq('role', 'manager').eq('is_active', true),
        supabase.from('profiles').select('id, full_name').eq('role', 'cleaner').eq('is_active', true),
      ]);
      setExistingRooms(roomsRes.data || []);
      setManagers(managersRes.data || []);
      setCleaners(cleanersRes.data || []);
    };
    fetchData();
  }, []);

  const selectedType = useMemo(() => ROOM_TYPES.find(t => t.value === roomType), [roomType]);

  const autoName = useMemo(() => {
    if (!roomNumber || !roomType) return '';
    const typeLabel = TYPE_LABEL_MAP[roomType] || 'Alan';
    return `${roomNumber} ${typeLabel}`;
  }, [roomNumber, roomType]);

  const isDuplicate = useMemo(() => {
    if (!floor || !roomNumber) return false;
    return existingRooms.some(
      r => r.floor?.toLowerCase() === floor.toLowerCase() && r.room_number?.toLowerCase() === roomNumber.trim().toLowerCase()
    );
  }, [floor, roomNumber, existingRooms]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!floor) newErrors.floor = 'Kat seçimi zorunludur.';
    if (!roomType) newErrors.roomType = 'Oda türü seçimi zorunludur.';
    if (!roomNumber.trim()) newErrors.roomNumber = 'Oda numarası alanı boş bırakılamaz.';
    else if (roomNumber.trim().length > 20) newErrors.roomNumber = 'Oda numarası çok uzun.';
    if (isDuplicate) newErrors.roomNumber = 'Bu katta aynı oda numarasına sahip bir kayıt zaten mevcut.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const finalName = roomName.trim() || autoName;

    const { error } = await supabase.from('rooms').insert({
      building: building.trim() || 'Ana Bina',
      floor,
      room_number: roomNumber.trim(),
      room_name: finalName,
      room_type: roomType as any,
      assigned_person_name: assignedPerson.trim() || null,
      notes: notes.trim() || null,
      is_active: isActive,
      manager_id: managerId || null,
      cleaner_id: cleanerId || null,
    });

    setSaving(false);

    if (error) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Oda başarıyla oluşturuldu', description: `${finalName} sisteme eklendi.` });
      onCreated();
    }
  };

  const handleReset = () => {
    setFloor('');
    setRoomType('');
    setRoomNumber('');
    setRoomName('');
    setBuilding('');
    setAssignedPerson('');
    setNotes('');
    setIsActive(true);
    setManagerId('');
    setCleanerId('');
    setErrors({});
  };

  const step = !floor ? 1 : !roomType ? 2 : 3;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Yeni Oda / Alan Ekle
        </CardTitle>
        <CardDescription>
          Kat ve oda türünü seçtikten sonra detay bilgilerini girin. QR kodu otomatik oluşturulur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step indicators */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={step >= 1 ? 'default' : 'outline'} className="text-xs">1. Kat</Badge>
            <span>→</span>
            <Badge variant={step >= 2 ? 'default' : 'outline'} className="text-xs">2. Oda Türü</Badge>
            <span>→</span>
            <Badge variant={step >= 3 ? 'default' : 'outline'} className="text-xs">3. Detaylar</Badge>
          </div>

          {/* Step 1: Floor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Kat Seçimi <span className="text-destructive">*</span>
            </Label>
            <Select value={floor} onValueChange={v => { setFloor(v); setErrors(prev => ({ ...prev, floor: '' })); }}>
              <SelectTrigger className={errors.floor ? 'border-destructive' : ''}>
                <SelectValue placeholder="Kat seçiniz..." />
              </SelectTrigger>
              <SelectContent>
                {FLOORS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.floor && <p className="text-xs text-destructive">{errors.floor}</p>}
          </div>

          {/* Step 2: Room type */}
          {floor && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <DoorOpen className="h-4 w-4" />
                Oda Türü <span className="text-destructive">*</span>
              </Label>
              <Select value={roomType} onValueChange={v => { setRoomType(v); setErrors(prev => ({ ...prev, roomType: '' })); }}>
                <SelectTrigger className={errors.roomType ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Oda türü seçiniz..." />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomType && <p className="text-xs text-destructive">{errors.roomType}</p>}
              {selectedType && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{selectedType.description}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Details */}
          {floor && roomType && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Oda Numarası <span className="text-destructive">*</span></Label>
                  <Input
                    value={roomNumber}
                    onChange={e => { setRoomNumber(e.target.value); setErrors(prev => ({ ...prev, roomNumber: '' })); }}
                    placeholder={selectedType?.placeholder || 'Oda numarası'}
                    className={errors.roomNumber ? 'border-destructive' : ''}
                  />
                  {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber}</p>}
                  {isDuplicate && !errors.roomNumber && (
                    <p className="text-xs text-amber-600">Bu katta aynı numaraya sahip bir oda zaten var.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Oda Adı</Label>
                  <Input
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder={autoName || 'Otomatik oluşturulur'}
                  />
                  {!roomName && autoName && (
                    <p className="text-xs text-muted-foreground">Boş bırakılırsa: <span className="font-medium">{autoName}</span></p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bina</Label>
                  <Input
                    value={building}
                    onChange={e => setBuilding(e.target.value)}
                    placeholder="Ana Bina"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sorumlu Kişi Adı</Label>
                  <Input
                    value={assignedPerson}
                    onChange={e => setAssignedPerson(e.target.value)}
                    placeholder="İsteğe bağlı"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sorumlu Yönetici</Label>
                  <Select value={managerId} onValueChange={setManagerId}>
                    <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                    <SelectContent>
                      {managers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temizlik Personeli</Label>
                  <Select value={cleanerId} onValueChange={setCleanerId}>
                    <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                    <SelectContent>
                      {cleaners.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Açıklama / Not</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="İsteğe bağlı açıklama..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} id="room-active" />
                <Label htmlFor="room-active" className="cursor-pointer">
                  {isActive ? 'Aktif' : 'Pasif'}
                </Label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button type="submit" disabled={saving || step < 3} className="gap-1.5">
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Kaydediliyor...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Kaydet
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Temizle
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              İptal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

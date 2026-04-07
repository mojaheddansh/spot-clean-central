import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoomTypeBadge } from '@/components/StatusBadges';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExcelRoomImport } from '@/components/ExcelRoomImport';

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Derslik', office: 'Ofis', meeting_room: 'Toplantı Odası',
  laboratory: 'Laboratuvar', toilet_wc: 'Tuvalet / WC', corridor: 'Koridor',
};

const RoomsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    building: '', floor: '', room_number: '', room_name: '', room_type: 'classroom',
    manager_id: '', cleaner_id: '',
  });
  const [managers, setManagers] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*, manager:profiles!rooms_manager_id_fkey(full_name), cleaner:profiles!rooms_cleaner_id_fkey(full_name)').eq('is_active', true).order('building').order('room_number');
    setRooms(data || []);
  };

  const fetchUsers = async () => {
    const [m, c] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'manager').eq('is_active', true),
      supabase.from('profiles').select('id, full_name').eq('role', 'cleaner').eq('is_active', true),
    ]);
    setManagers(m.data || []);
    setCleaners(c.data || []);
  };

  useEffect(() => { fetchRooms(); fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('rooms').insert({
      ...formData,
      room_type: formData.room_type as any,
      manager_id: formData.manager_id || null,
      cleaner_id: formData.cleaner_id || null,
    });
    if (error) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Oda başarıyla oluşturuldu' });
      setShowCreate(false);
      setFormData({ building: '', floor: '', room_number: '', room_name: '', room_type: 'classroom', manager_id: '', cleaner_id: '' });
      fetchRooms();
    }
  };

  const filtered = rooms.filter(r =>
    r.room_name.toLowerCase().includes(search.toLowerCase()) ||
    r.room_number.toLowerCase().includes(search.toLowerCase()) ||
    r.building.toLowerCase().includes(search.toLowerCase())
  );

  const roomTypes = Object.keys(ROOM_TYPE_LABELS);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Odalar</h1>
        </div>

        {profile?.role === 'admin' && (
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">Oda Listesi</TabsTrigger>
              <TabsTrigger value="import">Excel ile Toplu İçe Aktar</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Oda Oluştur</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Oda Oluştur</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Bina</Label><Input value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} required /></div>
                        <div><Label>Kat</Label><Input value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} required /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Oda Numarası</Label><Input value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} required /></div>
                        <div><Label>Oda Adı</Label><Input value={formData.room_name} onChange={e => setFormData({...formData, room_name: e.target.value})} required /></div>
                      </div>
                      <div><Label>Oda Türü</Label>
                        <Select value={formData.room_type} onValueChange={v => setFormData({...formData, room_type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{roomTypes.map(rt => <SelectItem key={rt} value={rt}>{ROOM_TYPE_LABELS[rt]}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Sorumlu Yönetici</Label>
                        <Select value={formData.manager_id} onValueChange={v => setFormData({...formData, manager_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                          <SelectContent>{managers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Temizlik Personeli</Label>
                        <Select value={formData.cleaner_id} onValueChange={v => setFormData({...formData, cleaner_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                          <SelectContent>{cleaners.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">Oluştur</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <RoomGrid rooms={filtered} />
            </TabsContent>

            <TabsContent value="import">
              <ExcelRoomImport onImported={fetchRooms} />
            </TabsContent>
          </Tabs>
        )}

        {profile?.role !== 'admin' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <RoomGrid rooms={filtered} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

const RoomGrid = ({ rooms }: { rooms: any[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {rooms.map(room => (
      <Link key={room.id} to={`/rooms/${room.id}`}>
        <Card className="hover:shadow-md transition cursor-pointer">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{room.room_name}</p>
                <p className="text-sm text-muted-foreground">{room.room_number} · {room.building} · Kat {room.floor}</p>
              </div>
              <RoomTypeBadge type={room.room_type} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {room.manager && <p>Yönetici: {room.manager.full_name}</p>}
              {room.cleaner && <p>Temizlik Personeli: {room.cleaner.full_name}</p>}
              {room.last_cleaned_at && <p>Son Temizlik: {new Date(room.last_cleaned_at).toLocaleString('tr-TR')}</p>}
            </div>
          </CardContent>
        </Card>
      </Link>
    ))}
    {rooms.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Oda bulunamadı</p>}
  </div>
);

export default RoomsPage;

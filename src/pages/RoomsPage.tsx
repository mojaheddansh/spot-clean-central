import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoomTypeBadge } from '@/components/StatusBadges';
import { Plus, Search } from 'lucide-react';
import { ExcelRoomImport } from '@/components/ExcelRoomImport';
import { RoomCreateForm } from '@/components/RoomCreateForm';

const RoomsPage = () => {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*, manager:profiles!rooms_manager_id_fkey(full_name), cleaner:profiles!rooms_cleaner_id_fkey(full_name)')
      .eq('is_active', true)
      .order('building')
      .order('room_number');
    setRooms(data || []);
  };

  useEffect(() => { fetchRooms(); }, []);

  const filtered = rooms.filter(r =>
    (r.room_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.room_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.building || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.floor || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Odalar</h1>
        </div>

        {profile?.role === 'admin' ? (
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">Oda Listesi</TabsTrigger>
              <TabsTrigger value="add">Manuel Oda Ekle</TabsTrigger>
              <TabsTrigger value="import">Excel ile Toplu İçe Aktar</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Oda, numara veya bina ara..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <RoomGrid rooms={filtered} />
            </TabsContent>

            <TabsContent value="add">
              <RoomCreateForm
                onCreated={() => { fetchRooms(); }}
                onCancel={() => {}}
              />
            </TabsContent>

            <TabsContent value="import">
              <ExcelRoomImport onImported={fetchRooms} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Oda, numara veya bina ara..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <p className="text-sm text-muted-foreground">
                  {room.room_number} · {room.building} · {room.floor}
                </p>
              </div>
              <RoomTypeBadge type={room.room_type} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {room.manager && <p>Yönetici: {room.manager.full_name}</p>}
              {room.cleaner && <p>Temizlik Personeli: {room.cleaner.full_name}</p>}
              {room.assigned_person_name && <p>Sorumlu: {room.assigned_person_name}</p>}
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

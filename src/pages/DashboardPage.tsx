import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, AlertTriangle, Sparkles, Users } from 'lucide-react';

const STATUS_TR: Record<string, string> = { new: 'Yeni', in_review: 'İnceleniyor', resolved: 'Çözüldü', closed: 'Kapatıldı' };

const DashboardPage = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ rooms: 0, openComplaints: 0, cleanedToday: 0, users: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [roomsRes, complaintsRes, cleaningRes, usersRes] = await Promise.all([
        supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).in('status', ['new', 'in_review']),
        supabase.from('cleaning_records').select('id', { count: 'exact', head: true }).gte('cleaned_at', today),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      setStats({
        rooms: roomsRes.count || 0,
        openComplaints: complaintsRes.count || 0,
        cleanedToday: cleaningRes.count || 0,
        users: usersRes.count || 0,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Toplam Oda', value: stats.rooms, icon: Building2, color: 'text-primary' },
    { label: 'Açık Şikâyetler', value: stats.openComplaints, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Bugün Temizlenen', value: stats.cleanedToday, icon: Sparkles, color: 'text-success' },
    { label: 'Aktif Kullanıcılar', value: stats.users, icon: Users, color: 'text-info' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Panel</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                  <span className="text-2xl font-bold">{card.value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {profile?.role === 'cleaner' && <CleanerQuickView />}
        {profile?.role === 'user' && <UserQuickView />}
        {(profile?.role === 'admin' || profile?.role === 'manager') && <AdminManagerView />}
      </div>
    </AppLayout>
  );
};

const CleanerQuickView = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('cleaner_id', user!.id).eq('is_active', true);
      setRooms(data || []);
    };
    fetch();
  }, [user]);

  return (
    <Card>
      <CardHeader><CardTitle>Atanmış Odalar</CardTitle></CardHeader>
      <CardContent>
        {rooms.length === 0 ? <p className="text-muted-foreground">Atanmış oda yok</p> : (
          <div className="space-y-2">
            {rooms.map(room => (
              <a key={room.id} href={`/cleaning/room/${room.id}`} className="block p-3 rounded-lg border hover:bg-accent transition">
                <p className="font-medium">{room.room_name}</p>
                <p className="text-sm text-muted-foreground">{room.room_number} · {room.building}</p>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UserQuickView = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('complaints').select('*, rooms(room_name, room_number)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5);
      setComplaints(data || []);
    };
    fetch();
  }, [user]);

  return (
    <Card>
      <CardHeader><CardTitle>Şikâyetlerim</CardTitle></CardHeader>
      <CardContent>
        {complaints.length === 0 ? <p className="text-muted-foreground">Henüz şikâyet yok</p> : (
          <div className="space-y-2">
            {complaints.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg border">
                <p className="font-medium">{c.complaint_type}</p>
                <p className="text-sm text-muted-foreground">{c.rooms?.room_name} · {new Date(c.created_at).toLocaleDateString('tr-TR')}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminManagerView = () => {
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('complaints').select('*, rooms(room_name, room_number)').order('created_at', { ascending: false }).limit(5);
      setRecentComplaints(data || []);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Son Aktivite</CardTitle></CardHeader>
      <CardContent>
        {recentComplaints.length === 0 ? <p className="text-muted-foreground">Son aktivite yok</p> : (
          <div className="space-y-2">
            {recentComplaints.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.complaint_type}</p>
                    <p className="text-sm text-muted-foreground">{c.rooms?.room_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'new' ? 'status-new' : c.status === 'in_review' ? 'status-in-review' : c.status === 'resolved' ? 'status-resolved' : 'status-closed'}`}>
                    {STATUS_TR[c.status] || c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardPage;

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, AlertTriangle, Sparkles, Users } from 'lucide-react';

const DashboardPage = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
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
    { label: t.total_rooms, value: stats.rooms, icon: Building2, color: 'text-primary' },
    { label: t.open_complaints, value: stats.openComplaints, icon: AlertTriangle, color: 'text-warning' },
    { label: t.cleaned_today, value: stats.cleanedToday, icon: Sparkles, color: 'text-success' },
    { label: t.active_users, value: stats.users, icon: Users, color: 'text-info' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t.dashboard as string}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label as string}</CardTitle>
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

        {/* Role-specific content */}
        {profile?.role === 'cleaner' && <CleanerQuickView />}
        {profile?.role === 'user' && <UserQuickView />}
        {(profile?.role === 'admin' || profile?.role === 'manager') && <AdminManagerView />}
      </div>
    </AppLayout>
  );
};

const CleanerQuickView = () => {
  const { t } = useLanguage();
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
      <CardHeader><CardTitle>{t.assigned_rooms as string}</CardTitle></CardHeader>
      <CardContent>
        {rooms.length === 0 ? <p className="text-muted-foreground">No assigned rooms</p> : (
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
  const { t } = useLanguage();
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
      <CardHeader><CardTitle>{t.my_complaints as string}</CardTitle></CardHeader>
      <CardContent>
        {complaints.length === 0 ? <p className="text-muted-foreground">No complaints yet</p> : (
          <div className="space-y-2">
            {complaints.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg border">
                <p className="font-medium">{c.complaint_type}</p>
                <p className="text-sm text-muted-foreground">{c.rooms?.room_name} · {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminManagerView = () => {
  const { t } = useLanguage();
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
      <CardHeader><CardTitle>{t.recent_activity as string}</CardTitle></CardHeader>
      <CardContent>
        {recentComplaints.length === 0 ? <p className="text-muted-foreground">No recent activity</p> : (
          <div className="space-y-2">
            {recentComplaints.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.complaint_type}</p>
                    <p className="text-sm text-muted-foreground">{c.rooms?.room_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'new' ? 'status-new' : c.status === 'in_review' ? 'status-in-review' : c.status === 'resolved' ? 'status-resolved' : 'status-closed'}`}>
                    {c.status}
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

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomTypeBadge } from '@/components/StatusBadges';
import { Link } from 'react-router-dom';

const CleaningPage = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      if (profile?.role === 'cleaner') {
        const { data } = await supabase.from('rooms').select('*').eq('cleaner_id', user!.id).eq('is_active', true);
        setRooms(data || []);
      } else {
        const { data } = await supabase.from('rooms').select('*').eq('is_active', true);
        setRooms(data || []);
      }

      const { data: recs } = await supabase.from('cleaning_records').select('*, rooms(room_name, room_number), cleaner:profiles!cleaning_records_cleaner_id_fkey(full_name)').order('cleaned_at', { ascending: false }).limit(20);
      setRecords(recs || []);
    };
    fetch();
  }, [user, profile]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t.nav_cleaning as string}</h1>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t.assigned_rooms as string}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(room => (
              <Link key={room.id} to={`/cleaning/room/${room.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{room.room_name}</p>
                        <p className="text-sm text-muted-foreground">{room.room_number} · {room.building}</p>
                      </div>
                      <RoomTypeBadge type={room.room_type} />
                    </div>
                    {room.last_cleaned_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t.room_last_cleaned as string}: {new Date(room.last_cleaned_at).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t.recent_activity as string}</h2>
          <div className="space-y-2">
            {records.map(r => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{r.rooms?.room_name} - {r.rooms?.room_number}</p>
                      <p className="text-xs text-muted-foreground">{r.cleaner?.full_name}</p>
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'status-resolved' : 'status-in-review'}`}>
                        {r.status === 'completed' ? (t.cleaning_status_completed as string) : (t.cleaning_status_partial as string)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(r.cleaned_at).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CleaningPage;

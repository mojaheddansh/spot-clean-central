import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomTypeBadge } from '@/components/StatusBadges';
import { QRTimetableGrid } from '@/components/QRTimetableGrid';
import { Building2, AlertTriangle, LogIn, CalendarDays, Sparkles } from 'lucide-react';

const QRLandingPage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms').select('*').eq('qr_token', token).eq('is_active', true).single();
      if (error || !data) { setError('Oda bulunamadı'); setLoading(false); return; }
      setRoom(data);
      const { data: sched } = await supabase
        .from('class_schedules').select('*').eq('room_id', data.id).eq('is_active', true)
        .order('day_of_week').order('start_time');
      setSchedules(sched || []);
      setLoading(false);
    };
    if (token) fetchRoom();
  }, [token]);

  useEffect(() => {
    if (!authLoading && user && profile && room) {
      const role = profile.role;
      if (role === 'cleaner') navigate(`/cleaning/room/${room.id}`);
      else if (role === 'user') navigate(`/complaint/room/${room.id}`);
      else navigate(`/rooms/${room.id}`);
    }
  }, [authLoading, user, profile, room]);

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Yükleniyor...</p></div>;
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6"><p className="text-destructive">{error || 'Oda bulunamadı'}</p></CardContent>
        </Card>
      </div>
    );
  }

  const loginUrl = `/login?returnTo=/qr/${token}`;
  const showSchedule = schedules.length > 0 && (settings.show_today_schedule_on_qr_page || settings.show_weekly_schedule_on_qr_page);
  const showLastCleaning = settings.show_last_cleaning_time_on_qr_page;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        {/* Oda Bilgisi */}
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{room.room_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center space-y-1">
              <p className="text-muted-foreground">{room.room_number}</p>
              <div className="flex justify-center gap-2"><RoomTypeBadge type={room.room_type} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Bina: <span className="font-medium text-foreground">{room.building}</span></div>
              <div>Kat: <span className="font-medium text-foreground">{room.floor}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* 1. Ders Programı */}
        {showSchedule && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Ders Programı</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <QRTimetableGrid schedules={schedules} />
            </CardContent>
          </Card>
        )}

        {/* 2. Şikâyet */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Link to={`/complaint/anonymous/${room.id}`}>
              <Button className="w-full gap-2" size="lg">
                <AlertTriangle className="h-5 w-5" />
                Anonim Şikâyet Oluştur
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 3. Giriş */}
        <Card>
          <CardContent className="pt-4">
            <Link to={loginUrl}>
              <Button variant="outline" className="w-full gap-2" size="lg">
                <LogIn className="h-5 w-5" />
                Tam erişim için giriş yapın
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 4. Son Temizlik */}
        {showLastCleaning && (
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Son Temizlik</p>
                <p className="text-sm font-medium">
                  {room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleString('tr-TR') : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QRLandingPage;

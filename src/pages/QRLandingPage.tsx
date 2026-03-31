import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomTypeBadge } from '@/components/StatusBadges';
import { Building2, AlertTriangle, LogIn, CalendarDays, Sparkles, Clock } from 'lucide-react';
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const QRLandingPage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('qr_token', token)
        .eq('is_active', true)
        .single();
      if (error || !data) {
        setError('Room not found');
        setLoading(false);
        return;
      }
      setRoom(data);
      // Fetch schedules
      const { data: sched } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('room_id', data.id)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      setSchedules(sched || []);
      setLoading(false);
    };
    if (token) fetchRoom();
  }, [token]);

  // Redirect logged-in users based on role
  useEffect(() => {
    if (!authLoading && user && profile && room) {
      const role = profile.role;
      if (role === 'cleaner') navigate(`/cleaning/room/${room.id}`);
      else if (role === 'user') navigate(`/complaint/room/${room.id}`);
      else if (role === 'manager') navigate(`/rooms/${room.id}`);
      else if (role === 'admin') navigate(`/rooms/${room.id}`);
    }
  }, [authLoading, user, profile, room]);

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>{t.loading as string}</p></div>;
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || 'Room not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loginUrl = `/login?returnTo=/qr/${token}`;
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  const todaySchedules = schedules.filter(s => s.day_of_week === currentDay);
  const isCurrentLesson = (s: any) => {
    const start = s.start_time?.slice(0, 5);
    const end = s.end_time?.slice(0, 5);
    return s.day_of_week === currentDay && start <= currentTime && currentTime < end;
  };

  // Group weekly schedule by day
  const weeklyByDay = DAYS.map((name, idx) => ({
    name,
    idx,
    lessons: schedules.filter(s => s.day_of_week === idx),
  })).filter(d => d.lessons.length > 0);

  const showSchedule = schedules.length > 0;
  const showLastCleaning = settings.show_last_cleaning_time_on_qr_page ?? DEFAULT_SETTINGS.show_last_cleaning_time_on_qr_page;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-sm mx-auto mt-12 space-y-4">
        {/* Room Info */}
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
              <div className="flex justify-center gap-2">
                <RoomTypeBadge type={room.room_type} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>{t.building as string}: <span className="font-medium text-foreground">{room.building}</span></div>
              <div>{t.floor as string}: <span className="font-medium text-foreground">{room.floor}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* 1. CLASS SCHEDULE */}
        {showSchedule && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Class Schedule</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Today's lessons */}
              {todaySchedules.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t.today as string} — {DAYS[currentDay]}</p>
                  <div className="space-y-1">
                    {todaySchedules.map(s => {
                      const isCurrent = isCurrentLesson(s);
                      return (
                        <div key={s.id} className={`p-2 rounded-lg border text-sm ${isCurrent ? 'bg-success/10 border-success' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>{' '}
                              <span>{s.subject_name}</span>
                            </div>
                            {isCurrent && (
                              <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded-full font-medium">Current</span>
                            )}
                          </div>
                          {s.instructor_name && <p className="text-xs text-muted-foreground">{s.instructor_name}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {todaySchedules.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No lessons today</p>
              )}

              {/* Weekly schedule */}
              {weeklyByDay.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Weekly Schedule</p>
                  {weeklyByDay.map(day => (
                    <div key={day.idx} className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground">{day.name}</p>
                      {day.lessons.map(s => (
                        <div key={s.id} className={`p-1.5 text-xs rounded ${isCurrentLesson(s) ? 'bg-success/10 border border-success' : ''}`}>
                          <span className="font-medium">{s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}</span>{' '}
                          {s.subject_name}
                          {s.instructor_name && <span className="text-muted-foreground"> · {s.instructor_name}</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2. COMPLAINT SECTION */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Link to={`/complaint/anonymous/${room.id}`}>
              <Button className="w-full gap-2" size="lg">
                <AlertTriangle className="h-5 w-5" />
                {t.complaint_anonymous as string}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 3. LOGIN SECTION */}
        <Card>
          <CardContent className="pt-4">
            <Link to={loginUrl}>
              <Button variant="outline" className="w-full gap-2" size="lg">
                <LogIn className="h-5 w-5" />
                {t.qr_login_prompt as string}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 4. LAST CLEANING */}
        {showLastCleaning && (
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t.room_last_cleaned as string}</p>
                <p className="text-sm font-medium">
                  {room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleString() : '—'}
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

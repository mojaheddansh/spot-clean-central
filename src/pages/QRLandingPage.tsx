import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomTypeBadge } from '@/components/StatusBadges';
import { Building2, AlertTriangle, LogIn } from 'lucide-react';

const QRLandingPage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } else {
        setRoom(data);
      }
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

  // Store room context for after login
  const loginUrl = `/login?returnTo=/qr/${token}`;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-sm mx-auto mt-16 space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{t.qr_landing_title as string}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center space-y-1">
              <h2 className="font-semibold text-xl">{room.room_name}</h2>
              <p className="text-muted-foreground">{room.room_number}</p>
              <div className="flex justify-center gap-2 mt-2">
                <RoomTypeBadge type={room.room_type} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>{t.building as string}: <span className="font-medium text-foreground">{room.building}</span></div>
              <div>{t.floor as string}: <span className="font-medium text-foreground">{room.floor}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Link to={`/complaint/anonymous/${room.id}`}>
            <Button className="w-full gap-2" size="lg">
              <AlertTriangle className="h-5 w-5" />
              {t.complaint_anonymous as string}
            </Button>
          </Link>

          <Link to={loginUrl}>
            <Button variant="outline" className="w-full gap-2 mt-2" size="lg">
              <LogIn className="h-5 w-5" />
              {t.qr_login_prompt as string}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QRLandingPage;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download } from 'lucide-react';

const QRManagementPage = () => {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('is_active', true).order('building').order('room_number');
      setRooms(data || []);
    };
    fetch();
  }, []);

  const getQRUrl = (token: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/qr/' + token)}`;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t.nav_qr as string}</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => (
            <Card key={room.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{room.room_name}</CardTitle>
                <p className="text-xs text-muted-foreground">{room.room_number} · {room.building}</p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <img src={getQRUrl(room.qr_token)} alt={`QR ${room.room_name}`} className="w-32 h-32" />
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">/qr/{room.qr_token}</code>
                <a href={getQRUrl(room.qr_token)} download={`qr-${room.room_number}.png`} target="_blank">
                  <Button size="sm" variant="outline" className="gap-1">
                    <Download className="h-3 w-3" />{t.qr_download as string}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default QRManagementPage;

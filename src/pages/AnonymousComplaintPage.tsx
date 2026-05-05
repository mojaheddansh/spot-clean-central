import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isComplaintAllowed, COMPLAINT_NOT_ALLOWED_MESSAGE } from '@/lib/complaintRules';
import { Link } from 'react-router-dom';

const COMPLAINT_TYPES: Record<string, string> = {
  dirty_floor: 'Kirli Zemin', dirty_desk: 'Kirli Masa', trash_full: 'Çöp Dolu',
  dirty_glass: 'Kirli Cam', bad_smell: 'Kötü Koku', dirty_toilet: 'Kirli Tuvalet',
  cleaning_not_done: 'Temizlik Yapılmadı', other: 'Diğer',
};

const AnonymousComplaintPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [complaintType, setComplaintType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const complaintsAllowed = room ? isComplaintAllowed(room.room_type) : true;

  useEffect(() => {
    if (roomId) {
      supabase.from('rooms').select('*').eq('id', roomId).single().then(({ data }) => { if (data) setRoom(data); });
    }
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType) return;
    setLoading(true);

    const ipHash = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const sessionKey = sessionStorage.getItem('complaint_session') || ipHash;
    if (!sessionStorage.getItem('complaint_session')) sessionStorage.setItem('complaint_session', sessionKey);

    const { count } = await supabase.from('complaint_rate_limit').select('*', { count: 'exact', head: true }).eq('ip_hash', sessionKey).gte('created_at', oneHourAgo);
    if ((count || 0) >= 5) {
      toast({ title: 'Hız sınırı', description: 'Çok fazla şikâyet gönderdiniz. Lütfen daha sonra tekrar deneyin.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    await supabase.from('complaint_rate_limit').insert({ ip_hash: sessionKey });

    const { error } = await supabase.from('complaints').insert({
      room_id: roomId!, guest_name: guestName || null, complaint_type: complaintType,
      priority: priority as any, description: description || null, status: 'new' as any,
    });

    await supabase.from('room_timelines').insert({
      room_id: roomId!, event_type: 'complaint_created',
      description: `Anonim şikâyet: ${COMPLAINT_TYPES[complaintType] || complaintType}`,
      metadata: { complaint_type: complaintType, priority, guest_name: guestName || 'Anonim' },
    });

    setLoading(false);
    if (error) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="font-semibold text-lg">Şikâyetiniz başarıyla gönderildi</h2>
            <Button variant="outline" onClick={() => navigate(-1)}>Geri</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (room && !complaintsAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <h2 className="font-semibold text-lg">Şikâyet Kullanılamaz</h2>
            <p className="text-sm text-muted-foreground">{COMPLAINT_NOT_ALLOWED_MESSAGE}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Geri</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-sm mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anonim Şikâyet Oluştur</CardTitle>
            {room && <p className="text-sm text-muted-foreground">{room.room_name} - {room.room_number}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>İsminiz (isteğe bağlı)</Label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="İsteğe bağlı" />
              </div>
              <div className="space-y-2">
                <Label>Şikâyet Türü *</Label>
                <Select value={complaintType} onValueChange={setComplaintType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLAINT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !complaintType}>
                {loading ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnonymousComplaintPage;

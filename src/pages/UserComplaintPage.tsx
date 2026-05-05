import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isComplaintAllowed, COMPLAINT_NOT_ALLOWED_MESSAGE } from '@/lib/complaintRules';

const COMPLAINT_TYPES: Record<string, string> = {
  dirty_floor: 'Kirli Zemin', dirty_desk: 'Kirli Masa', trash_full: 'Çöp Dolu',
  dirty_glass: 'Kirli Cam', bad_smell: 'Kötü Koku', dirty_toilet: 'Kirli Tuvalet',
  cleaning_not_done: 'Temizlik Yapılmadı', other: 'Diğer',
};

const UserComplaintPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [complaintType, setComplaintType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const complaintsAllowed = room ? isComplaintAllowed(room.room_type) : true;

  useEffect(() => {
    if (roomId) supabase.from('rooms').select('*').eq('id', roomId).single().then(({ data }) => setRoom(data));
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType) return;
    setLoading(true);

    const { error } = await supabase.from('complaints').insert({
      room_id: roomId!, user_id: user!.id, complaint_type: complaintType,
      priority: priority as any, description: description || null, status: 'new' as any,
    });

    await supabase.from('room_timelines').insert({
      room_id: roomId!, event_type: 'complaint_created', user_id: user!.id,
      description: `Şikâyet: ${COMPLAINT_TYPES[complaintType] || complaintType}`,
      metadata: { complaint_type: complaintType, priority },
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
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <CheckCircle className="h-16 w-16 text-success" />
          <h2 className="text-xl font-semibold">Şikâyetiniz başarıyla gönderildi</h2>
          <Button onClick={() => navigate('/dashboard')}>Panel</Button>
        </div>
      </AppLayout>
    );
  }

  if (room && !complaintsAllowed) {
    return (
      <AppLayout>
        <div className="max-w-lg space-y-4">
          <h1 className="text-xl font-bold">Şikâyet Kullanılamaz</h1>
          <p className="text-muted-foreground">{COMPLAINT_NOT_ALLOWED_MESSAGE}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Geri</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-bold">Şikâyet Oluştur</h1>
        {room && <p className="text-muted-foreground">{room.room_name} - {room.room_number}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
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
      </div>
    </AppLayout>
  );
};

export default UserComplaintPage;

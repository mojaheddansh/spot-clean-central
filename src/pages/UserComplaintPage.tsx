import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

const UserComplaintPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [complaintType, setComplaintType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (roomId) {
      supabase.from('rooms').select('*').eq('id', roomId).single().then(({ data }) => setRoom(data));
    }
  }, [roomId]);

  const complaintTypes = t.complaint_types as Record<string, string>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType) return;
    setLoading(true);

    const { error } = await supabase.from('complaints').insert({
      room_id: roomId!,
      user_id: user!.id,
      complaint_type: complaintType,
      priority: priority as any,
      description: description || null,
      status: 'new' as any,
    });

    await supabase.from('room_timelines').insert({
      room_id: roomId!,
      event_type: 'complaint_created',
      user_id: user!.id,
      description: `Complaint: ${complaintType}`,
      metadata: { complaint_type: complaintType, priority },
    });

    setLoading(false);
    if (error) {
      toast({ title: t.error_message as string, description: error.message, variant: 'destructive' });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <CheckCircle className="h-16 w-16 text-success" />
          <h2 className="text-xl font-semibold">{t.complaint_submitted as string}</h2>
          <Button onClick={() => navigate('/dashboard')}>{t.nav_dashboard as string}</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-bold">{t.complaint_create as string}</h1>
        {room && <p className="text-muted-foreground">{room.room_name} - {room.room_number}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.complaint_type as string} *</Label>
            <Select value={complaintType} onValueChange={setComplaintType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(complaintTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.complaint_priority as string}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t.priority_low as string}</SelectItem>
                <SelectItem value="medium">{t.priority_medium as string}</SelectItem>
                <SelectItem value="high">{t.priority_high as string}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.description as string}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !complaintType}>
            {loading ? (t.loading as string) : (t.submit as string)}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default UserComplaintPage;

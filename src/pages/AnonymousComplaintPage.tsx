import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AnonymousComplaintPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [complaintType, setComplaintType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (data) setRoom(data);
    };
    if (roomId) fetch();
  }, [roomId]);

  const complaintTypes = t.complaint_types as Record<string, string>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintType) return;
    setLoading(true);

    // Rate limiting: hash based on timestamp (simplified client-side)
    const ipHash = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Check rate limit (max 5 complaints per hour from same session)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const sessionKey = sessionStorage.getItem('complaint_session') || ipHash;
    if (!sessionStorage.getItem('complaint_session')) {
      sessionStorage.setItem('complaint_session', sessionKey);
    }

    const { count } = await supabase
      .from('complaint_rate_limit')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', sessionKey)
      .gte('created_at', oneHourAgo);

    if ((count || 0) >= 5) {
      toast({ title: 'Rate limit', description: 'Too many complaints. Please try again later.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Insert rate limit record
    await supabase.from('complaint_rate_limit').insert({ ip_hash: sessionKey });

    // Insert complaint
    const { error } = await supabase.from('complaints').insert({
      room_id: roomId!,
      guest_name: guestName || null,
      complaint_type: complaintType,
      priority: priority as any,
      description: description || null,
      status: 'new' as any,
    });

    // Insert timeline entry
    await supabase.from('room_timelines').insert({
      room_id: roomId!,
      event_type: 'complaint_created',
      description: `Anonymous complaint: ${complaintType}`,
      metadata: { complaint_type: complaintType, priority, guest_name: guestName || 'Anonymous' },
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="font-semibold text-lg">{t.complaint_submitted as string}</h2>
            <Button variant="outline" onClick={() => navigate(-1)}>{t.back as string}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <div className="max-w-sm mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.complaint_anonymous as string}</CardTitle>
            {room && <p className="text-sm text-muted-foreground">{room.room_name} - {room.room_number}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.complaint_guest_name as string}</Label>
                <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Optional" />
              </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnonymousComplaintPage;

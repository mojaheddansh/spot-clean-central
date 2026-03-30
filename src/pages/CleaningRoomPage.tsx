import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StatusBadge, PriorityBadge, RoomTypeBadge } from '@/components/StatusBadges';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CHECKLIST_KEYS = ['floor_cleaning', 'wipe_desks', 'empty_trash', 'glass_cleaning', 'toilet_cleaning'];

const CleaningRoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [openIssues, setOpenIssues] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const fetch = async () => {
      const [roomRes, issuesRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('complaints').select('*').eq('room_id', roomId).in('status', ['new', 'in_review']).order('created_at', { ascending: false }),
      ]);
      setRoom(roomRes.data);
      setOpenIssues(issuesRes.data || []);
    };
    fetch();
  }, [roomId]);

  const cleaningItems = t.cleaning_items as Record<string, string>;

  const toggle = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    const status = checkedCount === CHECKLIST_KEYS.length ? 'completed' : 'partial';

    const { data: record, error } = await supabase.from('cleaning_records').insert({
      room_id: roomId!,
      cleaner_id: user!.id,
      notes: notes || null,
      status: status as any,
    }).select().single();

    if (error) {
      toast({ title: t.error_message as string, description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Insert checklist items
    const items = CHECKLIST_KEYS.map(key => ({
      cleaning_record_id: record.id,
      item_name: key,
      is_checked: !!checkedItems[key],
    }));
    await supabase.from('cleaning_record_items').insert(items);

    // Insert timeline event
    await supabase.from('room_timelines').insert({
      room_id: roomId!,
      event_type: 'cleaning_done',
      user_id: user!.id,
      description: `Cleaning ${status} by cleaner`,
      metadata: { status, checked_items: Object.keys(checkedItems).filter(k => checkedItems[k]) },
    });

    setLoading(false);
    setSubmitted(true);
    toast({ title: t.cleaning_completed as string });
  };

  if (!room) return <AppLayout><p>{t.loading as string}</p></AppLayout>;

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <CheckCircle className="h-16 w-16 text-success" />
          <h2 className="text-xl font-semibold">{t.cleaning_completed as string}</h2>
          <Button onClick={() => navigate('/dashboard')}>{t.nav_dashboard as string}</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-lg">
        <div>
          <h1 className="text-xl font-bold">{room.room_name}</h1>
          <p className="text-sm text-muted-foreground">{room.room_number} · {room.building} · {t.floor as string} {room.floor}</p>
          <div className="mt-1"><RoomTypeBadge type={room.room_type} /></div>
        </div>

        {openIssues.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t.open_complaints as string} ({openIssues.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {openIssues.map(issue => (
                <div key={issue.id} className="flex justify-between items-center text-sm p-2 border rounded">
                  <span>{issue.complaint_type}</span>
                  <div className="flex gap-1">
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>{t.cleaning_checklist as string}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {CHECKLIST_KEYS.map(key => (
              <div key={key} className="flex items-center gap-3">
                <Checkbox
                  id={key}
                  checked={!!checkedItems[key]}
                  onCheckedChange={() => toggle(key)}
                />
                <Label htmlFor={key} className="cursor-pointer">{cleaningItems[key]}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label>{t.notes as string}</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </div>

        <Button onClick={handleSubmit} className="w-full" size="lg" disabled={loading}>
          {loading ? (t.loading as string) : (t.cleaning_submit as string)}
        </Button>
      </div>
    </AppLayout>
  );
};

export default CleaningRoomPage;

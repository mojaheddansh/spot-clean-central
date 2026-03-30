import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge, RoomTypeBadge } from '@/components/StatusBadges';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, AlertTriangle, Sparkles } from 'lucide-react';

const RoomDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [room, setRoom] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [cleaningRecords, setCleaningRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [roomRes, complaintsRes, timelineRes, cleaningRes] = await Promise.all([
        supabase.from('rooms').select('*, manager:profiles!rooms_manager_id_fkey(full_name), cleaner:profiles!rooms_cleaner_id_fkey(full_name)').eq('id', id).single(),
        supabase.from('complaints').select('*').eq('room_id', id).order('created_at', { ascending: false }),
        supabase.from('room_timelines').select('*').eq('room_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('cleaning_records').select('*, cleaner:profiles!cleaning_records_cleaner_id_fkey(full_name)').eq('room_id', id).order('cleaned_at', { ascending: false }).limit(10),
      ]);
      setRoom(roomRes.data);
      setComplaints(complaintsRes.data || []);
      setTimeline(timelineRes.data || []);
      setCleaningRecords(cleaningRes.data || []);
    };
    fetch();
  }, [id]);

  if (!room) return <AppLayout><p>{t.loading as string}</p></AppLayout>;

  const openComplaints = complaints.filter(c => ['new', 'in_review'].includes(c.status));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{room.room_name}</h1>
            <p className="text-muted-foreground">{room.room_number} · {room.building} · {t.floor as string} {room.floor}</p>
          </div>
          <RoomTypeBadge type={room.room_type} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-warning">{openComplaints.length}</p><p className="text-xs text-muted-foreground">{t.open_complaints as string}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{complaints.length}</p><p className="text-xs text-muted-foreground">{t.total as string} {t.complaints as string}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-success">{cleaningRecords.length}</p><p className="text-xs text-muted-foreground">{t.cleaning_record as string}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">{t.room_last_cleaned as string}</p><p className="text-sm font-medium">{room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleString() : '-'}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">{t.room_manager as string}:</span> {room.manager?.full_name || '-'}</div>
          <div><span className="text-muted-foreground">{t.room_cleaner as string}:</span> {room.cleaner?.full_name || '-'}</div>
          <div><span className="text-muted-foreground">{t.room_qr_code as string}:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{room.qr_token}</code></div>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">{t.timeline as string}</TabsTrigger>
            <TabsTrigger value="complaints">{t.complaints as string}</TabsTrigger>
            <TabsTrigger value="cleaning">{t.cleaning_record as string}</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-2">
            {timeline.map(event => (
              <div key={event.id} className="flex gap-3 p-3 border rounded-lg">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-muted-foreground text-sm">No activity yet</p>}
          </TabsContent>

          <TabsContent value="complaints" className="space-y-2">
            {complaints.map(c => (
              <div key={c.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{c.complaint_type}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="cleaning" className="space-y-2">
            {cleaningRecords.map(cr => (
              <div key={cr.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{cr.cleaner?.full_name}</p>
                    {cr.notes && <p className="text-xs text-muted-foreground">{cr.notes}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(cr.cleaned_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default RoomDetailPage;

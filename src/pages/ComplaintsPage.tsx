import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadges';
import { useToast } from '@/hooks/use-toast';

const COMPLAINT_TYPES_TR: Record<string, string> = {
  dirty_floor: 'Kirli Zemin', dirty_desk: 'Kirli Masa', trash_full: 'Çöp Dolu',
  dirty_glass: 'Kirli Cam', bad_smell: 'Kötü Koku', dirty_toilet: 'Kirli Tuvalet',
  cleaning_not_done: 'Temizlik Yapılmadı', other: 'Diğer',
};

const ComplaintsPage = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchComplaints = async () => {
    let query = supabase.from('complaints').select('*, rooms(room_name, room_number)').order('created_at', { ascending: false });
    if (filterStatus !== 'all') query = query.eq('status', filterStatus as any);
    const { data } = await query;
    setComplaints(data || []);
  };

  useEffect(() => { fetchComplaints(); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user?.id;
    }
    const { error } = await supabase.from('complaints').update(updates).eq('id', id);
    if (!error) {
      toast({ title: 'İşlem başarılı' });
      fetchComplaints();
    }
  };

  const statuses = ['new', 'in_review', 'resolved', 'closed'];
  const statusLabels: Record<string, string> = { new: 'Yeni', in_review: 'İnceleniyor', resolved: 'Çözüldü', closed: 'Kapatıldı' };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Şikâyetler</h1>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {complaints.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{COMPLAINT_TYPES_TR[c.complaint_type] || c.complaint_type}</p>
                    <p className="text-sm text-muted-foreground">{c.rooms?.room_name} · {c.rooms?.room_number}</p>
                    {c.description && <p className="text-sm mt-1">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.guest_name ? `${c.guest_name} (misafir)` : c.user_id ? 'Kayıtlı kullanıcı' : 'Anonim'}
                      {' · '}{new Date(c.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                  </div>
                </div>

                {(profile?.role === 'admin' || profile?.role === 'manager') && c.status !== 'closed' && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {c.status === 'new' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'in_review')}>
                        İncele
                      </Button>
                    )}
                    {(c.status === 'new' || c.status === 'in_review') && (
                      <Button size="sm" variant="default" onClick={() => updateStatus(c.id, 'resolved')}>
                        Çöz
                      </Button>
                    )}
                    {c.status === 'resolved' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'closed')}>
                        Kapat
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {complaints.length === 0 && <p className="text-muted-foreground text-center py-8">Şikâyet bulunamadı</p>}
        </div>
      </div>
    </AppLayout>
  );
};

export default ComplaintsPage;

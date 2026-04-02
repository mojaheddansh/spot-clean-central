import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StatusBadge, PriorityBadge, RoomTypeBadge } from '@/components/StatusBadges';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, Pencil, Trash2, Plus, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleCSVImport } from '@/components/ScheduleCSVImport';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const roomTypes = ['classroom', 'office', 'meeting_room', 'laboratory', 'toilet_wc', 'corridor'];

const RoomDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [cleaningRecords, setCleaningRecords] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Edit room
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Schedule CRUD
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<any>({ subject_name: '', day_of_week: 1, start_time: '09:00', end_time: '10:00', instructor_name: '', note: '', semester: 'Spring 2026', is_active: true });
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const canEdit = isAdmin || isManager;

  const fetchAll = async () => {
    if (!id) return;
    const [roomRes, complaintsRes, timelineRes, cleaningRes, schedRes] = await Promise.all([
      supabase.from('rooms').select('*, manager:profiles!rooms_manager_id_fkey(full_name), cleaner:profiles!rooms_cleaner_id_fkey(full_name)').eq('id', id).single(),
      supabase.from('complaints').select('*').eq('room_id', id).order('created_at', { ascending: false }),
      supabase.from('room_timelines').select('*').eq('room_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('cleaning_records').select('*, cleaner:profiles!cleaning_records_cleaner_id_fkey(full_name)').eq('room_id', id).order('cleaned_at', { ascending: false }).limit(10),
      supabase.from('class_schedules').select('*').eq('room_id', id).order('day_of_week').order('start_time'),
    ]);
    setRoom(roomRes.data);
    setComplaints(complaintsRes.data || []);
    setTimeline(timelineRes.data || []);
    setCleaningRecords(cleaningRes.data || []);
    setSchedules(schedRes.data || []);
  };

  const fetchUsers = async () => {
    const [m, c] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'manager').eq('is_active', true),
      supabase.from('profiles').select('id, full_name').eq('role', 'cleaner').eq('is_active', true),
    ]);
    setManagers(m.data || []);
    setCleaners(c.data || []);
  };

  useEffect(() => { fetchAll(); fetchUsers(); }, [id]);

  const openEditRoom = () => {
    setEditForm({ room_name: room.room_name, room_number: room.room_number, building: room.building, floor: room.floor, room_type: room.room_type, is_active: room.is_active, manager_id: room.manager_id || '', cleaner_id: room.cleaner_id || '' });
    setShowEditRoom(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('rooms').update({
      ...editForm,
      manager_id: editForm.manager_id || null,
      cleaner_id: editForm.cleaner_id || null,
    }).eq('id', id);
    setSaving(false);
    if (error) {
      toast({ title: t.error_message as string, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.success_message as string });
      setShowEditRoom(false);
      fetchAll();
    }
  };

  const handleDeleteRoom = async () => {
    const { error } = await supabase.from('rooms').update({ is_active: false }).eq('id', id);
    if (error) {
      toast({ title: t.error_message as string, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.success_message as string });
      navigate('/rooms');
    }
  };

  // Schedule handlers
  const openAddSchedule = () => {
    setEditingScheduleId(null);
    setScheduleForm({ subject_name: '', day_of_week: 1, start_time: '09:00', end_time: '10:00', instructor_name: '', note: '', semester: 'Spring 2026', is_active: true });
    setShowScheduleDialog(true);
  };

  const openEditSchedule = (s: any) => {
    setEditingScheduleId(s.id);
    setScheduleForm({ subject_name: s.subject_name, day_of_week: s.day_of_week, start_time: s.start_time?.slice(0, 5), end_time: s.end_time?.slice(0, 5), instructor_name: s.instructor_name || '', note: s.note || '', semester: s.semester, is_active: s.is_active });
    setShowScheduleDialog(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...scheduleForm, room_id: id, day_of_week: Number(scheduleForm.day_of_week) };
    let error;
    if (editingScheduleId) {
      ({ error } = await supabase.from('class_schedules').update(payload).eq('id', editingScheduleId));
    } else {
      ({ error } = await supabase.from('class_schedules').insert(payload));
    }
    if (error) {
      toast({ title: t.error_message as string, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.success_message as string });
      setShowScheduleDialog(false);
      fetchAll();
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const { error } = await supabase.from('class_schedules').delete().eq('id', scheduleId);
    if (error) {
      toast({ title: t.error_message as string, description: error.message, variant: 'destructive' });
    } else {
      fetchAll();
    }
  };

  if (!room) return <AppLayout><p>{t.loading as string}</p></AppLayout>;

  const openComplaints = complaints.filter(c => ['new', 'in_review'].includes(c.status));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{room.room_name}</h1>
              <p className="text-muted-foreground">{room.room_number} · {room.building} · {t.floor as string} {room.floor}</p>
            </div>
            <RoomTypeBadge type={room.room_type} />
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEditRoom} className="gap-1"><Pencil className="h-4 w-4" />{t.edit as string}</Button>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-4 w-4" />{t.delete as string}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete room?</AlertDialogTitle>
                      <AlertDialogDescription>This will deactivate the room. It can be restored later.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.cancel as string}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteRoom}>{t.delete as string}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
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

        {/* Edit Room Dialog */}
        <Dialog open={showEditRoom} onOpenChange={setShowEditRoom}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.room_edit as string}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveRoom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.building as string}</Label><Input value={editForm.building || ''} onChange={e => setEditForm({...editForm, building: e.target.value})} required /></div>
                <div><Label>{t.floor as string}</Label><Input value={editForm.floor || ''} onChange={e => setEditForm({...editForm, floor: e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.room_number as string}</Label><Input value={editForm.room_number || ''} onChange={e => setEditForm({...editForm, room_number: e.target.value})} required /></div>
                <div><Label>{t.room_name as string}</Label><Input value={editForm.room_name || ''} onChange={e => setEditForm({...editForm, room_name: e.target.value})} required /></div>
              </div>
              <div><Label>{t.room_type as string}</Label>
                <Select value={editForm.room_type} onValueChange={v => setEditForm({...editForm, room_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roomTypes.map(rt => <SelectItem key={rt} value={rt}>{(t as any)[`room_${rt}`] || rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t.room_manager as string}</Label>
                <Select value={editForm.manager_id} onValueChange={v => setEditForm({...editForm, manager_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t.room_cleaner as string}</Label>
                <Select value={editForm.cleaner_id} onValueChange={v => setEditForm({...editForm, cleaner_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {cleaners.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.active as string}</Label>
                <Switch checked={editForm.is_active} onCheckedChange={v => setEditForm({...editForm, is_active: v})} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? (t.loading as string) : (t.save as string)}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule"><CalendarDays className="h-4 w-4 mr-1" />Schedule</TabsTrigger>
            <TabsTrigger value="timeline">{t.timeline as string}</TabsTrigger>
            <TabsTrigger value="complaints">{t.complaints as string}</TabsTrigger>
            <TabsTrigger value="cleaning">{t.cleaning_record as string}</TabsTrigger>
          </TabsList>

          {/* Schedule tab */}
          <TabsContent value="schedule" className="space-y-3">
            {canEdit && (
              <Button size="sm" onClick={openAddSchedule} className="gap-1"><Plus className="h-4 w-4" />Add Lesson</Button>
            )}
            {DAYS.map((dayName, dayIdx) => {
              const daySchedules = schedules.filter(s => s.day_of_week === dayIdx);
              if (daySchedules.length === 0) return null;
              return (
                <div key={dayIdx}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">{dayName}</h3>
                  <div className="space-y-1">
                    {daySchedules.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                        <div>
                          <span className="font-medium">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>{' '}
                          <span>{s.subject_name}</span>
                          {s.instructor_name && <span className="text-muted-foreground ml-2">({s.instructor_name})</span>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSchedule(s)}><Pencil className="h-3 w-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete this lesson?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.cancel as string}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSchedule(s.id)}>{t.delete as string}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && <p className="text-muted-foreground text-sm py-4">No schedule entries yet</p>}
            {canEdit && <ScheduleCSVImport roomId={id!} onImported={fetchAll} />}
          </TabsContent>

          {/* Schedule dialog */}
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingScheduleId ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSaveSchedule} className="space-y-3">
                <div><Label>Subject Name</Label><Input value={scheduleForm.subject_name} onChange={e => setScheduleForm({...scheduleForm, subject_name: e.target.value})} required /></div>
                <div><Label>Day of Week</Label>
                  <Select value={String(scheduleForm.day_of_week)} onValueChange={v => setScheduleForm({...scheduleForm, day_of_week: Number(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Time</Label><Input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm({...scheduleForm, start_time: e.target.value})} required /></div>
                  <div><Label>End Time</Label><Input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm({...scheduleForm, end_time: e.target.value})} required /></div>
                </div>
                <div><Label>Instructor (optional)</Label><Input value={scheduleForm.instructor_name} onChange={e => setScheduleForm({...scheduleForm, instructor_name: e.target.value})} /></div>
                <div><Label>Semester</Label><Input value={scheduleForm.semester} onChange={e => setScheduleForm({...scheduleForm, semester: e.target.value})} /></div>
                <div><Label>Note (optional)</Label><Input value={scheduleForm.note} onChange={e => setScheduleForm({...scheduleForm, note: e.target.value})} /></div>
                <Button type="submit" className="w-full">{t.save as string}</Button>
              </form>
            </DialogContent>
          </Dialog>

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

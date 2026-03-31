import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RoleBadge } from '@/components/StatusBadges';
import { Plus, Search, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const UsersPage = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', institution_number: '', role: 'user', password: '',
  });
  const [editData, setEditData] = useState({
    user_id: '', full_name: '', institution_number: '', role: 'user', is_active: true, password: '',
  });

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { action: 'create', ...formData },
    });
    setCreating(false);
    if (error || data?.error) {
      toast({ title: t.error_message as string, description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: t.success_message as string });
    setShowCreate(false);
    setFormData({ full_name: '', institution_number: '', role: 'user', password: '' });
    fetchUsers();
  };

  const openEdit = (user: any) => {
    setEditData({
      user_id: user.id, full_name: user.full_name,
      institution_number: user.institution_number, role: user.role,
      is_active: user.is_active, password: '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body: any = { action: 'update', user_id: editData.user_id, full_name: editData.full_name, institution_number: editData.institution_number, role: editData.role, is_active: editData.is_active };
    if (editData.password) body.password = editData.password;
    const { data, error } = await supabase.functions.invoke('create-user', { body });
    setSaving(false);
    if (error || data?.error) {
      toast({ title: t.error_message as string, description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: t.success_message as string });
    setShowEdit(false);
    fetchUsers();
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.institution_number.toLowerCase().includes(search.toLowerCase())
  );

  const roles = ['admin', 'manager', 'cleaner', 'user'];

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{t.nav_users as string}</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />{t.user_create as string}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.user_create as string}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div><Label>{t.full_name as string}</Label><Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required /></div>
                <div><Label>{t.institution_number as string}</Label><Input value={formData.institution_number} onChange={e => setFormData({...formData, institution_number: e.target.value})} required /></div>
                <div><Label>{t.password as string}</Label><Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required minLength={6} /></div>
                <div><Label>{t.user_role as string}</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{(t as any)[`role_${r}`]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (t.loading as string) : (t.create as string)}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t.search as string} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Edit dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.user_edit as string}</DialogTitle></DialogHeader>
            <form onSubmit={handleEdit} className="space-y-3">
              <div><Label>{t.full_name as string}</Label><Input value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} required /></div>
              <div><Label>{t.institution_number as string}</Label><Input value={editData.institution_number} onChange={e => setEditData({...editData, institution_number: e.target.value})} required /></div>
              <div><Label>{t.password as string} (leave empty to keep)</Label><Input type="password" value={editData.password} onChange={e => setEditData({...editData, password: e.target.value})} minLength={6} placeholder="••••••" /></div>
              <div><Label>{t.user_role as string}</Label>
                <Select value={editData.role} onValueChange={v => setEditData({...editData, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{(t as any)[`role_${r}`]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.active as string}</Label>
                <Switch checked={editData.is_active} onCheckedChange={v => setEditData({...editData, is_active: v})} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (t.loading as string) : (t.save as string)}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {filtered.map(user => (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.institution_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <span className={`text-xs ${user.is_active ? 'text-success' : 'text-destructive'}`}>
                    {user.is_active ? (t.active as string) : (t.inactive as string)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">No users found</p>}
        </div>
      </div>
    </AppLayout>
  );
};

export default UsersPage;

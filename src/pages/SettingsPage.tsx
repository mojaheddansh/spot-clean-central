import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSettings, saveSettings, DEFAULT_SETTINGS, type SystemSettings } from '@/hooks/useSettings';
import { Settings, Globe, Shield, Bell, MessageSquare, Loader2, Save } from 'lucide-react';

const SettingsPage = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { settings: loadedSettings, loading } = useSettings();
  const [form, setForm] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading && !initialized) {
      setForm(loadedSettings);
      setInitialized(true);
    }
  }, [loading, loadedSettings, initialized]);

  const update = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveSettings(form);
    setSaving(false);
    if (error) {
      toast({ title: t.error_message as string, description: error, variant: 'destructive' });
    } else {
      toast({ title: t.success_message as string });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.settings as string}</h1>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.save as string}
          </Button>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">General</CardTitle>
            </div>
            <CardDescription>Basic site configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={form.site_name} onChange={e => update('site_name', e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Site Description</Label>
              <Textarea value={form.site_description} onChange={e => update('site_description', e.target.value)} rows={2} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder="admin@university.edu" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={v => update('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Istanbul">Europe/Istanbul (UTC+3)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (UTC+0/+1)</SelectItem>
                  <SelectItem value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (UTC-5/-4)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">When enabled, only admins can access the system</p>
              </div>
              <Switch checked={form.maintenance_mode} onCheckedChange={v => update('maintenance_mode', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Localization Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Localization</CardTitle>
            </div>
            <CardDescription>Language and regional preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select value={form.default_language} onValueChange={v => update('default_language', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Complaint Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Complaints</CardTitle>
            </div>
            <CardDescription>Complaint system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Priority</Label>
              <Select value={form.complaint_default_priority} onValueChange={v => update('complaint_default_priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t.priority_low as string}</SelectItem>
                  <SelectItem value="medium">{t.priority_medium as string}</SelectItem>
                  <SelectItem value="high">{t.priority_high as string}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Anonymous Complaints</Label>
                <p className="text-xs text-muted-foreground">Allow guests to submit complaints without logging in</p>
              </div>
              <Switch checked={form.enable_anonymous_complaints} onCheckedChange={v => update('enable_anonymous_complaints', v)} />
            </div>
          </CardContent>
        </Card>

        {/* QR Page Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">QR Page & Rooms</CardTitle>
            </div>
            <CardDescription>QR landing page display options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Today's Schedule on QR Page</Label>
                <p className="text-xs text-muted-foreground">Display today's lessons on QR landing page</p>
              </div>
              <Switch checked={form.show_today_schedule_on_qr_page} onCheckedChange={v => update('show_today_schedule_on_qr_page', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Weekly Schedule on QR Page</Label>
                <p className="text-xs text-muted-foreground">Display full weekly schedule on QR landing page</p>
              </div>
              <Switch checked={form.show_weekly_schedule_on_qr_page} onCheckedChange={v => update('show_weekly_schedule_on_qr_page', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Last Cleaning Time on QR Page</Label>
                <p className="text-xs text-muted-foreground">Display when the room was last cleaned</p>
              </div>
              <Switch checked={form.show_last_cleaning_time_on_qr_page} onCheckedChange={v => update('show_last_cleaning_time_on_qr_page', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Room Deletion</Label>
                <p className="text-xs text-muted-foreground">Allow admins to permanently delete rooms</p>
              </div>
              <Switch checked={form.allow_room_deletion} onCheckedChange={v => update('allow_room_deletion', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send email alerts for new complaints and events</p>
              </div>
              <Switch checked={form.enable_email_notifications} onCheckedChange={v => update('enable_email_notifications', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Bottom save button for mobile */}
        <div className="pb-4">
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.save as string}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;

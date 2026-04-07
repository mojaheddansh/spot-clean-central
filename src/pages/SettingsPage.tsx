import { useEffect, useState } from 'react';
import { useSettings, saveSettings, DEFAULT_SETTINGS, type SystemSettings } from '@/contexts/SettingsContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Settings, Shield, Bell, MessageSquare, Loader2, Save } from 'lucide-react';

const SettingsPage = () => {
  const { toast } = useToast();
  const { settings: loadedSettings, loading, refetch } = useSettings();
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
      toast({ title: 'Hata', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Ayarlar başarıyla kaydedildi' });
      await refetch();
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
          <h1 className="text-2xl font-bold">Sistem Ayarları</h1>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
        </div>

        {/* Genel Ayarlar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Genel Ayarlar</CardTitle>
            </div>
            <CardDescription>Temel site yapılandırması</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Adı</Label>
              <Input value={form.site_name} onChange={e => update('site_name', e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Site Açıklaması</Label>
              <Textarea value={form.site_description} onChange={e => update('site_description', e.target.value)} rows={2} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>İletişim E-postası</Label>
              <Input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder="admin@universite.edu.tr" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Saat Dilimi</Label>
              <Select value={form.timezone} onValueChange={v => update('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Istanbul">Europe/Istanbul (UTC+3)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (UTC+0/+1)</SelectItem>
                  <SelectItem value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Bakım Modu</Label>
                <p className="text-xs text-muted-foreground">Etkinleştirildiğinde sadece yöneticiler sisteme erişebilir</p>
              </div>
              <Switch checked={form.maintenance_mode} onCheckedChange={v => update('maintenance_mode', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Şikâyet Ayarları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Şikâyet Ayarları</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Varsayılan Öncelik</Label>
              <Select value={form.complaint_default_priority} onValueChange={v => update('complaint_default_priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Anonim Şikâyetleri Etkinleştir</Label>
                <p className="text-xs text-muted-foreground">Misafirlerin giriş yapmadan şikâyet göndermesine izin verir</p>
              </div>
              <Switch checked={form.enable_anonymous_complaints} onCheckedChange={v => update('enable_anonymous_complaints', v)} />
            </div>
          </CardContent>
        </Card>

        {/* QR Sayfası Ayarları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">QR Sayfası ve Oda Ayarları</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label>QR Sayfasında Bugünkü Programı Göster</Label></div>
              <Switch checked={form.show_today_schedule_on_qr_page} onCheckedChange={v => update('show_today_schedule_on_qr_page', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>QR Sayfasında Haftalık Programı Göster</Label></div>
              <Switch checked={form.show_weekly_schedule_on_qr_page} onCheckedChange={v => update('show_weekly_schedule_on_qr_page', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>QR Sayfasında Son Temizlik Zamanını Göster</Label></div>
              <Switch checked={form.show_last_cleaning_time_on_qr_page} onCheckedChange={v => update('show_last_cleaning_time_on_qr_page', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Oda Silmeye İzin Ver</Label></div>
              <Switch checked={form.allow_room_deletion} onCheckedChange={v => update('allow_room_deletion', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Bildirim Ayarları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Bildirim Ayarları</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>E-posta Bildirimlerini Etkinleştir</Label>
                <p className="text-xs text-muted-foreground">Yeni şikâyet ve olaylar için e-posta uyarıları gönderir</p>
              </div>
              <Switch checked={form.enable_email_notifications} onCheckedChange={v => update('enable_email_notifications', v)} />
            </div>
          </CardContent>
        </Card>

        <div className="pb-4">
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;

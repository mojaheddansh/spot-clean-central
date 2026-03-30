import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SettingsPage = () => {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t.settings as string}</h1>
        <Card>
          <CardHeader><CardTitle className="text-sm">System Configuration</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">System settings can be configured here. This section is reserved for future enhancements such as notification preferences, maintenance schedules, and system-wide configurations.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;

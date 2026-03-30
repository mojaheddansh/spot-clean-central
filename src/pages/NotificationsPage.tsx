import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setNotifications(data || []);
  };

  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    fetchNotifications();
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.notifications as string}</h1>
          {notifications.some(n => !n.is_read) && (
            <Button size="sm" variant="outline" onClick={markAllRead}>{t.mark_read as string}</Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t.no_notifications as string}</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <Card key={n.id} className={n.is_read ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && (
                      <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>✓</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NotificationsPage;

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface SystemSettings {
  site_name: string;
  site_description: string;
  default_language: string;
  supported_languages: string[];
  timezone: string;
  complaint_default_priority: string;
  enable_anonymous_complaints: boolean;
  enable_email_notifications: boolean;
  show_last_cleaning_time_on_qr_page: boolean;
  show_today_schedule_on_qr_page: boolean;
  show_weekly_schedule_on_qr_page: boolean;
  allow_room_deletion: boolean;
  contact_email: string;
  maintenance_mode: boolean;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  site_name: 'CampusClean',
  site_description: 'University Cleaning & Complaint Management System',
  default_language: 'en',
  supported_languages: ['en', 'tr'],
  timezone: 'Europe/Istanbul',
  complaint_default_priority: 'medium',
  enable_anonymous_complaints: true,
  enable_email_notifications: false,
  show_last_cleaning_time_on_qr_page: true,
  show_today_schedule_on_qr_page: true,
  show_weekly_schedule_on_qr_page: true,
  allow_room_deletion: false,
  contact_email: '',
  maintenance_mode: false,
};

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refetch: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from('system_settings').select('key, value');
      if (data && data.length > 0) {
        const merged = { ...DEFAULT_SETTINGS };
        data.forEach((row: { key: string; value: Json }) => {
          const key = row.key as keyof SystemSettings;
          if (key in merged) {
            (merged as any)[key] = row.value;
          }
        });
        setSettings(merged);
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export async function saveSettings(settings: SystemSettings): Promise<{ error: string | null }> {
  try {
    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { key, value: value as Json, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

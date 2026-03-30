import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';

export const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useLanguage();
  const map: Record<string, { label: string; className: string }> = {
    new: { label: t.status_new as string, className: 'status-new' },
    in_review: { label: t.status_in_review as string, className: 'status-in-review' },
    resolved: { label: t.status_resolved as string, className: 'status-resolved' },
    closed: { label: t.status_closed as string, className: 'status-closed' },
  };
  const s = map[status] || { label: status, className: '' };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
};

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const { t } = useLanguage();
  const map: Record<string, { label: string; className: string }> = {
    low: { label: t.priority_low as string, className: 'priority-low' },
    medium: { label: t.priority_medium as string, className: 'priority-medium' },
    high: { label: t.priority_high as string, className: 'priority-high' },
  };
  const p = map[priority] || { label: priority, className: '' };
  return <Badge variant="outline" className={p.className}>{p.label}</Badge>;
};

export const RoleBadge = ({ role }: { role: string }) => {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    admin: t.role_admin as string,
    manager: t.role_manager as string,
    cleaner: t.role_cleaner as string,
    user: t.role_user as string,
  };
  return <Badge variant="secondary">{map[role] || role}</Badge>;
};

export const RoomTypeBadge = ({ type }: { type: string }) => {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    classroom: t.room_classroom as string,
    office: t.room_office as string,
    meeting_room: t.room_meeting_room as string,
    laboratory: t.room_laboratory as string,
    toilet_wc: t.room_toilet_wc as string,
    corridor: t.room_corridor as string,
  };
  return <Badge variant="outline">{map[type] || type}</Badge>;
};

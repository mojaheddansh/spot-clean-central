import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  in_review: 'İnceleniyor',
  resolved: 'Çözüldü',
  closed: 'Kapatıldı',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  manager: 'Sorumlu Yönetici',
  cleaner: 'Temizlik Personeli',
  user: 'Kullanıcı',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Derslik',
  office: 'Ofis',
  meeting_room: 'Toplantı Odası',
  laboratory: 'Laboratuvar',
  toilet_wc: 'Tuvalet / WC',
  corridor: 'Koridor',
  mutfak: 'Mutfak',
};

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: STATUS_LABELS.new, className: 'status-new' },
    in_review: { label: STATUS_LABELS.in_review, className: 'status-in-review' },
    resolved: { label: STATUS_LABELS.resolved, className: 'status-resolved' },
    closed: { label: STATUS_LABELS.closed, className: 'status-closed' },
  };
  const s = map[status] || { label: status, className: '' };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
};

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    low: { label: PRIORITY_LABELS.low, className: 'priority-low' },
    medium: { label: PRIORITY_LABELS.medium, className: 'priority-medium' },
    high: { label: PRIORITY_LABELS.high, className: 'priority-high' },
  };
  const p = map[priority] || { label: priority, className: '' };
  return <Badge variant="outline" className={p.className}>{p.label}</Badge>;
};

export const RoleBadge = ({ role }: { role: string }) => {
  return <Badge variant="secondary">{ROLE_LABELS[role] || role}</Badge>;
};

export const RoomTypeBadge = ({ type }: { type: string }) => {
  return <Badge variant="outline">{ROOM_TYPE_LABELS[type] || type}</Badge>;
};

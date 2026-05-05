// Centralized rule: complaints are only allowed for toilets/WC and corridors.
export const COMPLAINT_ALLOWED_ROOM_TYPES = ['toilet_wc', 'corridor'] as const;

export const isComplaintAllowed = (roomType?: string | null): boolean => {
  if (!roomType) return false;
  return (COMPLAINT_ALLOWED_ROOM_TYPES as readonly string[]).includes(roomType);
};

export const COMPLAINT_NOT_ALLOWED_MESSAGE =
  'Bu oda türü için şikâyet oluşturulamaz. Şikâyetler yalnızca tuvalet/WC ve koridorlar için kullanılabilir.';
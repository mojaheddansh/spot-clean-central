CREATE OR REPLACE FUNCTION public.enforce_complaint_room_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rtype text;
BEGIN
  SELECT room_type::text INTO rtype FROM public.rooms WHERE id = NEW.room_id;
  IF rtype IS NULL THEN
    RAISE EXCEPTION 'Oda bulunamadı';
  END IF;
  IF rtype NOT IN ('toilet_wc', 'corridor') THEN
    RAISE EXCEPTION 'Bu oda türü için şikâyet oluşturulamaz. Şikâyetler yalnızca tuvalet/WC ve koridorlar için kullanılabilir.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_complaint_room_type_trigger ON public.complaints;
CREATE TRIGGER enforce_complaint_room_type_trigger
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.enforce_complaint_room_type();
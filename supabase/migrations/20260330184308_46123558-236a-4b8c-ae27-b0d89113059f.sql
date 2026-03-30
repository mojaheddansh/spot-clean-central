
-- Fix notification insert policy to be more restrictive
DROP POLICY "Auth can insert notifications" ON public.notifications;
CREATE POLICY "Auth can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'cleaner')
  );

-- Fix auth complaint insert to require user_id match
DROP POLICY "Auth can insert complaints" ON public.complaints;
CREATE POLICY "Auth can insert complaints" ON public.complaints
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Fix timeline insert for auth users
DROP POLICY "Auth can insert timelines" ON public.room_timelines;
CREATE POLICY "Auth can insert timelines" ON public.room_timelines
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);


-- Create class_schedules table
CREATE TABLE public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  semester text NOT NULL DEFAULT 'Spring 2026',
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject_name text NOT NULL,
  instructor_name text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_schedules_room_id ON public.class_schedules(room_id);
CREATE INDEX idx_class_schedules_day ON public.class_schedules(day_of_week);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Anyone can read schedules (needed for QR page)
CREATE POLICY "Schedules readable by anyone" ON public.class_schedules
  FOR SELECT TO anon, authenticated USING (true);

-- Admin can manage schedules
CREATE POLICY "Admin manages schedules" ON public.class_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Manager can manage schedules for assigned rooms
CREATE POLICY "Manager manages assigned room schedules" ON public.class_schedules
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager'::app_role) AND 
    room_id IN (SELECT id FROM public.rooms WHERE manager_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'manager'::app_role) AND 
    room_id IN (SELECT id FROM public.rooms WHERE manager_id = auth.uid())
  );

-- Add update policy for admin on profiles
CREATE POLICY "Admin can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anon to read settings for QR page
CREATE POLICY "Anon can read settings" ON public.system_settings
  FOR SELECT TO anon USING (true);

-- Allow admin to insert cleaning items too
CREATE POLICY "Admin can insert cleaning items" ON public.cleaning_record_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add show_today_schedule and show_weekly_schedule settings support
-- (these are stored as key-value pairs in system_settings, no schema change needed)


-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cleaner', 'user');
CREATE TYPE public.room_type AS ENUM ('classroom', 'office', 'meeting_room', 'laboratory', 'toilet_wc', 'corridor');
CREATE TYPE public.complaint_status AS ENUM ('new', 'in_review', 'resolved', 'closed');
CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.cleaning_status AS ENUM ('completed', 'partial');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  institution_number TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (for RLS helper)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building TEXT NOT NULL,
  floor TEXT NOT NULL,
  room_number TEXT NOT NULL,
  room_name TEXT NOT NULL,
  room_type public.room_type NOT NULL,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  manager_id UUID REFERENCES public.profiles(id),
  cleaner_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_cleaned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  guest_name TEXT,
  complaint_type TEXT NOT NULL,
  priority public.complaint_priority NOT NULL DEFAULT 'medium',
  description TEXT,
  status public.complaint_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id)
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Cleaning records table
CREATE TABLE public.cleaning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  cleaned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.cleaning_status NOT NULL DEFAULT 'completed'
);
ALTER TABLE public.cleaning_records ENABLE ROW LEVEL SECURITY;

-- Cleaning record items table
CREATE TABLE public.cleaning_record_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_record_id UUID NOT NULL REFERENCES public.cleaning_records(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.cleaning_record_items ENABLE ROW LEVEL SECURITY;

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Room timelines table
CREATE TABLE public.room_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_timelines ENABLE ROW LEVEL SECURITY;

-- System settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anti-spam: rate limiting table
CREATE TABLE public.complaint_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.complaint_rate_limit ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_rooms_qr_token ON public.rooms(qr_token);
CREATE INDEX idx_rooms_manager ON public.rooms(manager_id);
CREATE INDEX idx_rooms_cleaner ON public.rooms(cleaner_id);
CREATE INDEX idx_complaints_room ON public.complaints(room_id);
CREATE INDEX idx_complaints_user ON public.complaints(user_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_cleaning_records_room ON public.cleaning_records(room_id);
CREATE INDEX idx_cleaning_records_cleaner ON public.cleaning_records(cleaner_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_room_timelines_room ON public.room_timelines(room_id);
CREATE INDEX idx_complaint_rate_limit_ip ON public.complaint_rate_limit(ip_hash);

-- RLS Policies

-- Profiles
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "User roles readable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert user roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete user roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rooms
CREATE POLICY "Rooms readable by authenticated" ON public.rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rooms readable by anon" ON public.rooms
  FOR SELECT TO anon USING (true);
CREATE POLICY "Admin manages rooms insert" ON public.rooms
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages rooms update" ON public.rooms
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages rooms delete" ON public.rooms
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Complaints
CREATE POLICY "Anon can insert complaints" ON public.complaints
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth can insert complaints" ON public.complaints
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can read complaints" ON public.complaints
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'manager') AND room_id IN (SELECT id FROM public.rooms WHERE manager_id = auth.uid()))
    OR (public.has_role(auth.uid(), 'cleaner') AND room_id IN (SELECT id FROM public.rooms WHERE cleaner_id = auth.uid()))
    OR user_id = auth.uid()
  );
CREATE POLICY "Manager or Admin can update complaints" ON public.complaints
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'manager') AND room_id IN (SELECT id FROM public.rooms WHERE manager_id = auth.uid()))
  );

-- Cleaning records
CREATE POLICY "Auth can read cleaning records" ON public.cleaning_records
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'manager') AND room_id IN (SELECT id FROM public.rooms WHERE manager_id = auth.uid()))
    OR cleaner_id = auth.uid()
  );
CREATE POLICY "Cleaner can insert cleaning records" ON public.cleaning_records
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'cleaner') AND cleaner_id = auth.uid()
  );

-- Cleaning record items
CREATE POLICY "Auth can read cleaning items" ON public.cleaning_record_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cleaner can insert cleaning items" ON public.cleaning_record_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'cleaner'));

-- Notifications
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Room timelines
CREATE POLICY "Auth can read timelines" ON public.room_timelines
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'manager') AND room_id IN (SELECT id FROM public.rooms WHERE manager_id = auth.uid()))
    OR (public.has_role(auth.uid(), 'cleaner') AND room_id IN (SELECT id FROM public.rooms WHERE cleaner_id = auth.uid()))
  );
CREATE POLICY "Anon can read timelines" ON public.room_timelines
  FOR SELECT TO anon USING (true);
CREATE POLICY "Auth can insert timelines" ON public.room_timelines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can insert timelines" ON public.room_timelines
  FOR INSERT TO anon WITH CHECK (true);

-- System settings
CREATE POLICY "Admin manages settings" ON public.system_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth can read settings" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

-- Rate limit
CREATE POLICY "Anon can insert rate limit" ON public.complaint_rate_limit
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read rate limit" ON public.complaint_rate_limit
  FOR SELECT TO anon USING (true);

-- Trigger to sync user_roles when profile is created/updated
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, NEW.role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_roles_on_profile_change
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles();

-- Trigger to update room last_cleaned_at
CREATE OR REPLACE FUNCTION public.update_room_last_cleaned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rooms SET last_cleaned_at = NEW.cleaned_at WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_last_cleaned
AFTER INSERT ON public.cleaning_records
FOR EACH ROW EXECUTE FUNCTION public.update_room_last_cleaned();

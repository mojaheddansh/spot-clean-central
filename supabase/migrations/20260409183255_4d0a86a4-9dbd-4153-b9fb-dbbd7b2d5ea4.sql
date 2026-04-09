
-- Add mutfak to room_type enum
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'mutfak';

-- Add new columns to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS assigned_person_name text;

-- Add display_name column to user_stats
ALTER TABLE public.user_stats ADD COLUMN display_name TEXT;

-- Update RLS policy to allow admins to manage user stats
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;

CREATE POLICY "Users can update own stats or admins can update all"
ON public.user_stats
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user stats"
ON public.user_stats
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user stats"
ON public.user_stats
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert dummy users for presentation
INSERT INTO public.user_stats (user_id, display_name, badge_level, points, total_reports, total_verifications, total_votes)
VALUES
  (gen_random_uuid(), 'Mansi M', 'legend', 520, 35, 45, 35),
  (gen_random_uuid(), 'Atharva C', 'expert', 285, 20, 25, 20),
  (gen_random_uuid(), 'Pratham C', 'guardian', 145, 10, 15, 10),
  (gen_random_uuid(), 'Ananya S', 'protector', 75, 5, 8, 5),
  (gen_random_uuid(), 'Rohan K', 'helper', 42, 3, 4, 4),
  (gen_random_uuid(), 'Isha P', 'guardian', 128, 9, 12, 9),
  (gen_random_uuid(), 'Arjun M', 'expert', 265, 18, 23, 17),
  (gen_random_uuid(), 'Diya R', 'protector', 88, 6, 9, 7),
  (gen_random_uuid(), 'Kabir J', 'helper', 35, 2, 4, 3),
  (gen_random_uuid(), 'Saanvi T', 'guardian', 112, 8, 10, 8)
ON CONFLICT (user_id) DO NOTHING;
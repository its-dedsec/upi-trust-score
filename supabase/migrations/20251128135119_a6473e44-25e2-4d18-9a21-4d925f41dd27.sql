-- Create user_stats table to track user contributions
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_reports integer NOT NULL DEFAULT 0,
  total_verifications integer NOT NULL DEFAULT 0,
  total_votes integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  badge_level text NOT NULL DEFAULT 'rookie',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view stats"
  ON public.user_stats
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own stats"
  ON public.user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update user stats
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  new_points integer;
  new_badge text;
BEGIN
  -- Determine which user to update based on the table
  IF TG_TABLE_NAME = 'fraud_reports' THEN
    target_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'verifications' THEN
    target_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'verification_votes' THEN
    target_user_id := NEW.user_id;
  END IF;

  -- Insert or update user stats
  INSERT INTO public.user_stats (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Calculate totals
  UPDATE public.user_stats
  SET
    total_reports = (SELECT COUNT(*) FROM fraud_reports WHERE user_id = target_user_id),
    total_verifications = (SELECT COUNT(*) FROM verifications WHERE user_id = target_user_id),
    total_votes = (SELECT COUNT(*) FROM verification_votes WHERE user_id = target_user_id),
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Calculate points (reports: 10pts, verifications: 5pts, votes: 2pts)
  new_points := (
    SELECT (total_reports * 10) + (total_verifications * 5) + (total_votes * 2)
    FROM user_stats
    WHERE user_id = target_user_id
  );

  -- Determine badge level
  IF new_points >= 500 THEN
    new_badge := 'legend';
  ELSIF new_points >= 250 THEN
    new_badge := 'expert';
  ELSIF new_points >= 100 THEN
    new_badge := 'guardian';
  ELSIF new_points >= 50 THEN
    new_badge := 'protector';
  ELSIF new_points >= 10 THEN
    new_badge := 'helper';
  ELSE
    new_badge := 'rookie';
  END IF;

  -- Update points and badge
  UPDATE public.user_stats
  SET
    points = new_points,
    badge_level = new_badge,
    updated_at = now()
  WHERE user_id = target_user_id;

  RETURN NEW;
END;
$$;

-- Triggers to auto-update stats
CREATE TRIGGER update_stats_on_report
  AFTER INSERT ON public.fraud_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();

CREATE TRIGGER update_stats_on_verification
  AFTER INSERT ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();

CREATE TRIGGER update_stats_on_vote
  AFTER INSERT ON public.verification_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();

-- Create index for leaderboard queries
CREATE INDEX idx_user_stats_points ON public.user_stats(points DESC);
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);
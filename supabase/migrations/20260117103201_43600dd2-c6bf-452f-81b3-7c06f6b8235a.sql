-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own reports or admins view all" ON public.fraud_reports;

-- Create new policy allowing all authenticated users to view all fraud reports for risk assessment
CREATE POLICY "Authenticated users can view all reports for risk assessment"
ON public.fraud_reports
FOR SELECT
TO authenticated
USING (true);

-- Keep the existing INSERT, UPDATE, DELETE policies intact for proper access control
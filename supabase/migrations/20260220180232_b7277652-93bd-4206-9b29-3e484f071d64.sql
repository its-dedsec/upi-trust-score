
-- Drop the potentially restrictive policy and recreate it explicitly as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view all reports for risk assessment" ON public.fraud_reports;

-- Recreate as explicitly PERMISSIVE so all authenticated users can read all fraud reports
CREATE POLICY "Authenticated users can view all reports for risk assessment"
ON public.fraud_reports
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

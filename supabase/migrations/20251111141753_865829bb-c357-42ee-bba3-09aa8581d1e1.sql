-- Fix fraud_reports visibility - restrict to owners and admins only
DROP POLICY IF EXISTS "Users can view all reports" ON fraud_reports;
CREATE POLICY "Users can view own reports or admins view all" 
ON fraud_reports 
FOR SELECT 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Add admin-only policies for fraud_reports modifications
CREATE POLICY "Admins can delete reports" 
ON fraud_reports 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix upi_identities to require admin role for updates and deletes
CREATE POLICY "Admins can update UPI identities" 
ON upi_identities 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete UPI identities" 
ON upi_identities 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict user_roles SELECT to own roles or admins
DROP POLICY IF EXISTS "Users can view roles" ON user_roles;
CREATE POLICY "Users can view own role or admins view all" 
ON user_roles 
FOR SELECT 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
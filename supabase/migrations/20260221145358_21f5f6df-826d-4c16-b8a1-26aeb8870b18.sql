
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can create activity" ON public.activity_log;

-- Recreate with auth.uid() check
CREATE POLICY "Authenticated users can create movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

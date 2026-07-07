CREATE TABLE public.math_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question TEXT NOT NULL,
  solution TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.math_solutions TO authenticated;
GRANT ALL ON public.math_solutions TO service_role;
ALTER TABLE public.math_solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own math solutions" ON public.math_solutions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own math solutions" ON public.math_solutions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own math solutions" ON public.math_solutions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX math_solutions_user_created_idx ON public.math_solutions (user_id, created_at DESC);
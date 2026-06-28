
CREATE TABLE public.learning_explanations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  learning_mode TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  response_length TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_explanations TO authenticated;
GRANT ALL ON public.learning_explanations TO service_role;

ALTER TABLE public.learning_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own explanations"
  ON public.learning_explanations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX learning_explanations_user_created_idx
  ON public.learning_explanations (user_id, created_at DESC);


CREATE TABLE public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom',
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  favorite BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  last_studied_at TIMESTAMPTZ,
  summary_id UUID REFERENCES public.notes_summaries(id) ON DELETE SET NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  explanation_id UUID REFERENCES public.learning_explanations(id) ON DELETE SET NULL,
  planner_task_id UUID REFERENCES public.study_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own catalog items"
  ON public.catalog_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own catalog items"
  ON public.catalog_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own catalog items"
  ON public.catalog_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own catalog items"
  ON public.catalog_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX catalog_items_user_id_idx ON public.catalog_items(user_id);
CREATE INDEX catalog_items_category_idx ON public.catalog_items(category);

CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_study_tasks_updated_at();

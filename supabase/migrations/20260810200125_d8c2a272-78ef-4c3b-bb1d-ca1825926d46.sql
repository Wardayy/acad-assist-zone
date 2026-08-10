ALTER TABLE public.math_solutions ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE POLICY "Users read own math images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'math-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own math images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'math-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own math images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'math-images' AND (storage.foldername(name))[1] = auth.uid()::text);
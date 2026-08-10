# Math Tutor history: remember uploaded images

Right now a past solution only stores the question text and the AI answer. Any images you attached are lost once you leave the page. This adds image persistence so opening a past entry shows the original pictures again.

## What changes for you

- When you solve a problem with images, those images are saved with the entry.
- Opening a past solution shows the images above the question, alongside the full re-rendered solution.
- Deleting a past solution also deletes its stored images.
- Text-only entries and existing history entries keep working exactly as today (they just show no images).

## How it works

- A new private storage bucket `math-images` holds the files, organised per user (`<user-id>/<solution-id>/<n>.<ext>`), so nobody else can read them.
- Access rules on storage let each signed-in user read, upload, and delete only files inside their own folder.
- The `math_solutions` table gets an `image_paths` text array column (defaults to empty) recording which files belong to the entry.

## Technical notes

- `solveMath` in `src/lib/math.functions.ts` keeps its current behaviour (base64 straight to the AI). After the row is inserted, it decodes each data URL and uploads it to the bucket using the request-scoped authenticated Supabase client, then updates the row's `image_paths`. Upload failures are non-fatal — the solution still returns.
- `getMathSolution` returns the row plus short-lived signed URLs generated from `image_paths`.
- `deleteMathSolution` removes the bucket objects for the entry before deleting the row.
- `math.tsx` stores the returned signed URLs in state and renders them in a small preview grid inside the Solution card when viewing a past entry. The upload/compose UI is untouched.
- No other feature, table, or shared component is modified.

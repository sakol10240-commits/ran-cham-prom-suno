# Review of the original `songStudioDb.js` (Supabase)

| # | Problem in the original | Risk | Fix in this package |
|---|---|---|---|
| 1 | Uses `import.meta.env` and bare imports (Vite) in a project that is plain HTML + Vercel functions | Does not run at all | Browser code calls `/api/library`; Supabase is used only on the server |
| 2 | `../sunoSanitizer` does not exist | Import error | `api/_lib/sanitizer.js` (server) and `services/sunoSanitizer.js` (browser copy) with the same rules |
| 3 | `upsert()` from the browser with the anon key and no owner column | If RLS is off, anyone can read/overwrite any row. If RLS is on without policies, the app simply fails | Table locked by RLS with no public policies; writes only through the server (service key) with an owner hash per device |
| 4 | Validation only in the browser | A tampered request skips it | Server validates and sanitizes again; the database also has CHECK constraints (lengths, mode, content required) |
| 5 | `select("*")` on the table | Would expose every column (owner, moderation flags) | Public reads use the view `public_song_packages` with safe columns only |
| 6 | No pagination or search | Whole table downloaded as it grows | `limit`/`offset` (max 30 per page) and a title/style search |
| 7 | `throw error` passes raw database errors to the UI | Leaks table and column names | Short messages; details only in server logs (or when DEBUG_ERRORS=1) |
| 8 | Public content could contain links, emails or HTML | Spam, phishing, XSS | Public packages reject links and emails; HTML tags and control/bidi characters are stripped; the UI escapes all text |
| 9 | `is_public` not controlled | Anyone could publish anything | Publishing is an explicit action (two taps in the UI) and is checked again at the moment it becomes public |
| 10 | No moderation | Cannot take a bad item down | `is_hidden` column: set it to true in the Supabase dashboard and the item disappears from the public view |
| 11 | No `updated_at` trigger | Ordering by `updated_at` is wrong after edits | Trigger plus a partial index |
| 12 | No delete or unpublish | Users cannot remove their own items | `delete` and `visibility` actions, restricted to the owner device |

Known limits
- There is no user login, so "owner" means "this browser" (a random id stored on the device, hashed on the server). Clearing browser data loses access to your own items. Real accounts would need Supabase Auth.
- Delete-and-recreate can bypass the 30-new-items-per-day cap, but the cap of 200 items per device and the access code still apply.
- The service role key bypasses all security rules. Keep it only in Vercel environment variables, never in the repository or the browser.

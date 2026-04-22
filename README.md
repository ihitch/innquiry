# innquiry

Search and browse drug entries from the WHO **International Nonproprietary Names (INN) for Pharmaceutical Substances** lists.

- **Web:** Next.js dashboard — search, filter, deep-link to the source PDF with the INN highlighted.
- **Extractor:** Python pipeline that turns a WHO INN PDF into structured rows in Supabase using Claude.
- **Data:** Supabase Postgres (`drugs` table) + Supabase Storage bucket `inn-pdfs` for hosted PDFs.

## Runbook — publishing a new INN list

When WHO publishes a new list (roughly every 6 months):

1. **Download the PDF** from the WHO site (e.g. `pl135.pdf`).
2. **Upload to Supabase Storage** — bucket `inn-pdfs`, object name `pl<N>.pdf` (e.g. `pl135.pdf`). Use the Supabase dashboard or:
   ```bash
   curl -X POST "$SUPABASE_URL/storage/v1/object/inn-pdfs/pl135.pdf" \
     -H "apikey: $SUPABASE_SERVICE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
     -H "Content-Type: application/pdf" \
     -H "x-upsert: true" \
     --data-binary "@pl135.pdf"
   ```
3. **Trigger extraction** — GitHub → Actions → **Extract WHO INN PDF** → *Run workflow*. Inputs:
   - `pdf_url`: public URL of the PDF (the WHO URL or the Supabase Storage public URL).
   - `publication_date` *(optional)*: `YYYY-MM-DD`.
   - `model` *(optional)*: defaults to `claude-haiku-4-5-20251001`. Amendment chunks always use `claude-sonnet-4-6`.
4. **Verify** — open the deployed dashboard, filter by the new list number, spot-check a few entries against the PDF.

Re-running against the same list UPSERTs on `(inn_name, list_number, is_amendment)` — safe to re-run after a prompt fix.

## Local development

### Web

```bash
cd packages/web
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

### Extractor

```bash
cd packages/extractor
pip install -e .
cp .env.example .env                # fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
python -m src.pipeline --url <pdf_url>
# or against a local file:
python -m src.pipeline --url <pdf_url> --local ~/Downloads/pl134.pdf
```

## Repository layout

```
packages/
  web/          Next.js dashboard (Vercel)
  extractor/    Python pipeline (GitHub Actions)
supabase/
  migrations/   Schema
.github/workflows/
  extract.yml   workflow_dispatch — run the pipeline on demand
```

## Required secrets

GitHub repo secrets (set via `gh secret set -R <repo>`):

- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Vercel env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (server-only)

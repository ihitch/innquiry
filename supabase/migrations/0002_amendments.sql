-- Add support for Amendments section of WHO INN PDFs.
-- Amendments are corrections/updates to previously published INNs (often from earlier lists).
-- They may reference an INN that does not yet exist in our `drugs` table.

ALTER TABLE drugs
    ADD COLUMN is_amendment BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN original_list_reference TEXT;

-- A drug may appear in the same list as both a new entry AND an amendment, so the
-- uniqueness key now includes is_amendment.
ALTER TABLE drugs DROP CONSTRAINT drugs_inn_list_unique;
ALTER TABLE drugs
    ADD CONSTRAINT drugs_inn_list_amendment_unique UNIQUE (inn_name, list_number, is_amendment);

CREATE INDEX idx_drugs_amendment ON drugs(is_amendment) WHERE is_amendment = TRUE;

CREATE TABLE drugs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- INN names (4 languages)
    inn_name              TEXT NOT NULL,
    inn_name_latin        TEXT,
    inn_name_french       TEXT,
    inn_name_spanish      TEXT,
    is_recommended        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Entry classification
    entry_type            TEXT NOT NULL CHECK (entry_type IN (
                              'small_molecule', 'peptide', 'monoclonal_antibody',
                              'antibody_drug_conjugate', 'fusion_protein',
                              'oligonucleotide', 'cell_gene_therapy', 'other'
                          )),

    -- Chemical identification (nullable for biologics / cell therapies)
    molecular_formula     TEXT,
    cas_number            TEXT,

    -- Pharmacological descriptions (English primary)
    chemical_name         TEXT,
    chemical_name_french  TEXT,
    chemical_name_spanish TEXT,
    action_and_use        TEXT,
    action_and_use_french TEXT,
    action_and_use_spanish TEXT,

    -- Provenance
    list_number           INTEGER NOT NULL,
    publication_date      DATE,
    source_pdf_url        TEXT NOT NULL,
    source_page           INTEGER,
    extraction_run        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT drugs_inn_list_unique UNIQUE (inn_name, list_number)
);

-- Indexes
CREATE INDEX idx_drugs_cas        ON drugs(cas_number);
CREATE INDEX idx_drugs_entry_type ON drugs(entry_type);
CREATE INDEX idx_drugs_list       ON drugs(list_number);

CREATE INDEX idx_drugs_name_fts ON drugs
    USING gin(to_tsvector('english',
        coalesce(inn_name, '') || ' ' || coalesce(inn_name_latin, '')
    ));

CREATE INDEX idx_drugs_action_fts ON drugs
    USING gin(to_tsvector('english', coalesce(action_and_use, '')));

-- Row Level Security: public read, writes via service role only
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON drugs
    FOR SELECT USING (true);

"""Validate and deduplicate extracted drug entries using Pydantic."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

EntryType = Literal[
    "small_molecule",
    "peptide",
    "monoclonal_antibody",
    "antibody_drug_conjugate",
    "fusion_protein",
    "oligonucleotide",
    "cell_gene_therapy",
    "other",
]


class DrugEntry(BaseModel):
    inn_name: str
    inn_name_latin: Optional[str] = None
    inn_name_french: Optional[str] = None
    inn_name_spanish: Optional[str] = None
    is_recommended: bool = False
    is_amendment: bool = False
    original_list_reference: Optional[str] = None
    entry_type: EntryType = "other"
    chemical_name: Optional[str] = None
    chemical_name_french: Optional[str] = None
    chemical_name_spanish: Optional[str] = None
    action_and_use: Optional[str] = None
    action_and_use_french: Optional[str] = None
    action_and_use_spanish: Optional[str] = None
    molecular_formula: Optional[str] = None
    cas_number: Optional[str] = None
    source_page: Optional[int] = Field(default=None, ge=0)

    @field_validator("inn_name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("cas_number")
    @classmethod
    def validate_cas(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v if v else None


def _merge(existing: DrugEntry, new: DrugEntry) -> DrugEntry:
    """Merge two duplicates of the same (inn_name, is_amendment).

    Prefer non-null values; when both sides have a value, keep the longer one
    (covers cases where one chunk has a truncated chemical name). Entries may
    appear in two overlapping chunks, so we can't rely on first-wins.
    """
    merged = existing.model_dump()
    for field, new_val in new.model_dump().items():
        cur = merged.get(field)
        if new_val is None or new_val == "":
            continue
        if cur is None or cur == "":
            merged[field] = new_val
        elif isinstance(new_val, str) and isinstance(cur, str) and len(new_val) > len(cur):
            merged[field] = new_val
    return DrugEntry.model_validate(merged)


def validate_and_deduplicate(
    raw_entries: list[dict], list_number: int
) -> list[DrugEntry]:
    """Validate entries with Pydantic and merge duplicates on (inn_name, is_amendment).

    A drug may appear both as a new INN and as an amendment to a previously
    published INN in the same document, so both variants must be kept. Chunks
    overlap, so the same entry may appear twice — merge non-null fields.
    """
    seen: dict[tuple[str, bool], DrugEntry] = {}
    errors: list[str] = []

    for raw in raw_entries:
        try:
            entry = DrugEntry.model_validate(raw)
            key = (entry.inn_name, entry.is_amendment)
            if key in seen:
                seen[key] = _merge(seen[key], entry)
            else:
                seen[key] = entry
        except Exception as e:
            errors.append(f"Skipped invalid entry {raw.get('inn_name', '?')}: {e}")

    if errors:
        for err in errors:
            print(f"  [warn] {err}")

    return list(seen.values())

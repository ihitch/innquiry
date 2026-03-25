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
    entry_type: EntryType = "other"
    chemical_name: Optional[str] = None
    chemical_name_french: Optional[str] = None
    chemical_name_spanish: Optional[str] = None
    action_and_use: Optional[str] = None
    action_and_use_french: Optional[str] = None
    action_and_use_spanish: Optional[str] = None
    molecular_formula: Optional[str] = None
    cas_number: Optional[str] = None
    source_page: int = Field(default=0, ge=0)

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


def validate_and_deduplicate(
    raw_entries: list[dict], list_number: int
) -> list[DrugEntry]:
    """Validate entries with Pydantic and deduplicate on inn_name."""
    seen: dict[str, DrugEntry] = {}
    errors: list[str] = []

    for raw in raw_entries:
        try:
            entry = DrugEntry.model_validate(raw)
            key = entry.inn_name  # already lowercased by validator
            if key not in seen:
                seen[key] = entry
        except Exception as e:
            errors.append(f"Skipped invalid entry {raw.get('inn_name', '?')}: {e}")

    if errors:
        for err in errors:
            print(f"  [warn] {err}")

    return list(seen.values())

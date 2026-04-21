"""Upsert validated drug entries into Supabase."""

from __future__ import annotations

import os
from datetime import date

from supabase import Client, create_client

from .normalizer import DrugEntry


def _get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def write_batch(
    entries: list[DrugEntry],
    list_number: int,
    pdf_url: str,
    publication_date: date | None = None,
) -> int:
    """Upsert all entries; returns count of rows written."""
    if not entries:
        return 0

    client = _get_client()

    rows = [
        {
            "inn_name": entry.inn_name,
            "inn_name_latin": entry.inn_name_latin,
            "inn_name_french": entry.inn_name_french,
            "inn_name_spanish": entry.inn_name_spanish,
            "is_recommended": entry.is_recommended,
            "is_amendment": entry.is_amendment,
            "original_list_reference": entry.original_list_reference,
            "entry_type": entry.entry_type,
            "molecular_formula": entry.molecular_formula,
            "cas_number": entry.cas_number,
            "chemical_name": entry.chemical_name,
            "chemical_name_french": entry.chemical_name_french,
            "chemical_name_spanish": entry.chemical_name_spanish,
            "action_and_use": entry.action_and_use,
            "action_and_use_french": entry.action_and_use_french,
            "action_and_use_spanish": entry.action_and_use_spanish,
            "list_number": list_number,
            "publication_date": publication_date.isoformat() if publication_date else None,
            "source_pdf_url": pdf_url,
            "source_page": entry.source_page,
        }
        for entry in entries
    ]

    # Upsert on (inn_name, list_number, is_amendment) — constraint from 0002_amendments.sql
    result = (
        client.table("drugs")
        .upsert(rows, on_conflict="inn_name,list_number,is_amendment")
        .execute()
    )

    return len(result.data)

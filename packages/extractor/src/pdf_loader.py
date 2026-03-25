"""Download and chunk a WHO INN PDF into page groups for extraction."""

from __future__ import annotations

import re
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber
import requests


@dataclass
class PageChunk:
    pages: list[int]          # 1-based page numbers
    text: str                 # combined extracted text
    has_tables: bool          # pdfplumber detected table structure
    pdf_url: str
    list_number: int


def _detect_list_number(text: str) -> int:
    """Extract the INN list number from the first page text."""
    match = re.search(r"List\s+(\d+)", text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 0


def download_and_chunk(pdf_url: str, chunk_size: int = 5) -> list[PageChunk]:
    """Download PDF from url, extract text per page, return chunks."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        response = requests.get(pdf_url, stream=True, timeout=60)
        response.raise_for_status()
        for block in response.iter_content(chunk_size=8192):
            tmp.write(block)
        tmp_path = Path(tmp.name)

    return chunk_pdf(tmp_path, pdf_url, chunk_size)


def chunk_pdf(pdf_path: Path, pdf_url: str, chunk_size: int = 5) -> list[PageChunk]:
    """Chunk an already-downloaded PDF file."""
    chunks: list[PageChunk] = []
    list_number = 0

    with pdfplumber.open(pdf_path) as pdf:
        pages_data: list[tuple[int, str, bool]] = []

        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            has_tables = bool(page.extract_tables())
            pages_data.append((i + 1, text, has_tables))

        if pages_data:
            list_number = _detect_list_number(pages_data[0][1])

        for start in range(0, len(pages_data), chunk_size):
            batch = pages_data[start : start + chunk_size]
            combined_text = "\n\n".join(text for _, text, _ in batch)
            has_tables = any(ht for _, _, ht in batch)
            page_nums = [pn for pn, _, _ in batch]
            chunks.append(
                PageChunk(
                    pages=page_nums,
                    text=combined_text,
                    has_tables=has_tables,
                    pdf_url=pdf_url,
                    list_number=list_number,
                )
            )

    return chunks

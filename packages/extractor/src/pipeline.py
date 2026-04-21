"""CLI entrypoint: run the full extraction pipeline for a WHO INN PDF."""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from tqdm import tqdm

from .claude_extractor import ClaudeExtractor, DEFAULT_AMENDMENT_MODEL, DEFAULT_MODEL
from .db_writer import write_batch
from .normalizer import validate_and_deduplicate
from .pdf_loader import PageChunk, chunk_pdf, download_and_chunk


def run(
    pdf_url: str,
    model: str = DEFAULT_MODEL,
    amendment_model: str = DEFAULT_AMENDMENT_MODEL,
    local_path: Path | None = None,
    publication_date: date | None = None,
    dry_run: bool = False,
) -> None:
    print(f"innquiry extractor — model: {model} (amendments: {amendment_model})")
    print(f"Source: {pdf_url}")

    # Load PDF
    if local_path:
        print(f"Using local file: {local_path}")
        chunks = chunk_pdf(local_path, pdf_url)
    else:
        print("Downloading PDF...")
        chunks = download_and_chunk(pdf_url)

    if not chunks:
        print("No pages extracted. Exiting.")
        sys.exit(1)

    list_number = chunks[0].list_number
    amendment_chunks = sum(1 for c in chunks if c.is_amendment_section)
    print(f"INN List number detected: {list_number}")
    print(f"Total chunks: {len(chunks)} ({amendment_chunks} amendment-section)")

    extractor = ClaudeExtractor(model=model, amendment_model=amendment_model)
    all_raw: list[dict] = []

    for chunk in tqdm(chunks, desc="Extracting"):
        page_range = f"{chunk.pages[0]}-{chunk.pages[-1]}"
        try:
            entries = extractor.extract_chunk(chunk)
            all_raw.extend(entries)
        except Exception as e:
            cause = getattr(e, "last_attempt", None)
            if cause:
                inner = cause.exception()
                print(f"\n  [error] chunk pages {page_range}: {type(inner).__name__}: {inner}")
            else:
                print(f"\n  [error] chunk pages {page_range}: {type(e).__name__}: {e}")

    print(f"\nRaw entries extracted: {len(all_raw)}")

    validated = validate_and_deduplicate(all_raw, list_number)
    print(f"Valid unique entries: {len(validated)}")

    # Print type breakdown
    from collections import Counter
    counts = Counter(e.entry_type for e in validated)
    for etype, n in sorted(counts.items()):
        print(f"  {etype}: {n}")

    if dry_run:
        print("\n[dry-run] Skipping database write.")
        return

    written = write_batch(validated, list_number, pdf_url, publication_date)
    print(f"\nRows upserted to Supabase: {written}")


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Extract WHO INN PDF into Supabase")
    parser.add_argument("--url", required=True, help="Public URL of the WHO INN PDF")
    parser.add_argument("--local", help="Path to local PDF file (skips download)")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Anthropic model for regular INN chunks (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--amendment-model",
        default=DEFAULT_AMENDMENT_MODEL,
        help=f"Anthropic model for Amendments-section chunks (default: {DEFAULT_AMENDMENT_MODEL})",
    )
    parser.add_argument(
        "--date",
        help="Publication date (YYYY-MM-DD), e.g. 2026-01-30",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract and validate but do not write to database",
    )
    args = parser.parse_args()

    pub_date = date.fromisoformat(args.date) if args.date else None
    local_path = Path(args.local) if args.local else None

    run(
        pdf_url=args.url,
        model=args.model,
        amendment_model=args.amendment_model,
        local_path=local_path,
        publication_date=pub_date,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()

"""Send PDF page chunks to Claude API and return structured drug entries."""

from __future__ import annotations

import json
import re
from pathlib import Path

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from .pdf_loader import PageChunk

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extraction.txt"


def _load_prompt() -> str:
    return PROMPT_PATH.read_text()


def _parse_json(text: str) -> list[dict]:
    """Extract JSON array from Claude's response, even if wrapped in markdown."""
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    return json.loads(text)


class ClaudeExtractor:
    def __init__(self, model: str = "claude-opus-4-6"):
        self.client = anthropic.Anthropic()
        self.model = model
        self._prompt_template = _load_prompt()

    def _build_messages(self, chunk: PageChunk) -> list[dict]:
        page_range = f"{chunk.pages[0]}-{chunk.pages[-1]}"
        user_content = (
            self._prompt_template
            .split("USER:\n", 1)[1]
            .format(
                pdf_url=chunk.pdf_url,
                list_number=chunk.list_number,
                page_range=page_range,
                has_tables=chunk.has_tables,
                page_text=chunk.text,
            )
        )
        system_content = self._prompt_template.split("\nUSER:\n", 1)[0].removeprefix("SYSTEM:\n")
        return [{"role": "user", "content": user_content}], system_content

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=30))
    def extract_chunk(self, chunk: PageChunk) -> list[dict]:
        """Extract drug entries from a single page chunk."""
        messages, system = self._build_messages(chunk)

        response = self.client.messages.create(
            model=self.model,
            max_tokens=8096,
            system=system,
            messages=messages,
        )

        raw = response.content[0].text.strip()

        try:
            entries = _parse_json(raw)
        except json.JSONDecodeError:
            # Retry with a fix-it prompt
            fix_response = self.client.messages.create(
                model=self.model,
                max_tokens=8096,
                system="You are a JSON repair assistant. Return only valid JSON.",
                messages=[
                    {"role": "user", "content": f"Fix this invalid JSON and return only the corrected JSON array:\n\n{raw}"},
                ],
            )
            entries = _parse_json(fix_response.content[0].text.strip())

        return entries if isinstance(entries, list) else []

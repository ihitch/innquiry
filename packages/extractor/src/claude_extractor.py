"""Send PDF page chunks to Claude and return structured drug entries."""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path

import anthropic
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .pdf_loader import PageChunk

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extraction.txt"

# claude-haiku-4-5-20251001 for cost-effective extraction (~$1/list); swap to claude-opus-4-6 for best accuracy
DEFAULT_MODEL = "claude-haiku-4-5-20251001"
# Amendments section has a denser, easy-to-confuse layout — use a stronger model by default.
DEFAULT_AMENDMENT_MODEL = "claude-sonnet-4-6"

# Small delay between requests
REQUEST_DELAY_SECONDS = 0.5


def _load_prompt() -> str:
    return PROMPT_PATH.read_text()


def _parse_json(text: str) -> list[dict]:
    """Extract JSON array from the response, even if wrapped in markdown."""
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    return json.loads(text)


def _build_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


class ClaudeExtractor:
    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        amendment_model: str = DEFAULT_AMENDMENT_MODEL,
    ):
        self.client = _build_client()
        self.model = model
        self.amendment_model = amendment_model
        self._prompt_template = _load_prompt()

    def _model_for(self, chunk: PageChunk) -> str:
        return self.amendment_model if chunk.is_amendment_section else self.model

    def _build_messages(self, chunk: PageChunk) -> tuple[list[dict], str]:
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

    @retry(
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIStatusError)),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=10, max=120),
    )
    def extract_chunk(self, chunk: PageChunk) -> list[dict]:
        """Extract drug entries from a single page chunk."""
        messages, system = self._build_messages(chunk)
        model = self._model_for(chunk)

        time.sleep(REQUEST_DELAY_SECONDS)

        response = self.client.messages.create(
            model=model,
            max_tokens=16000,
            system=system,
            messages=messages,
        )

        content = response.content[0].text if response.content else ""
        if not content:
            raise ValueError("Model returned empty response")
        raw = content.strip()

        try:
            entries = _parse_json(raw)
        except json.JSONDecodeError:
            # Retry with a fix-it prompt
            time.sleep(REQUEST_DELAY_SECONDS)
            fix_response = self.client.messages.create(
                model=self.model,
                max_tokens=16000,
                system="You are a JSON repair assistant. Return only valid JSON.",
                messages=[
                    {"role": "user", "content": f"Fix this invalid JSON and return only the corrected JSON array:\n\n{raw}"},
                ],
            )
            entries = _parse_json(fix_response.content[0].text.strip())

        return entries if isinstance(entries, list) else []

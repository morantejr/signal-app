from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping

from dotenv import load_dotenv

load_dotenv()

# Pinned from https://openrouter.ai/api/v1/models on 2026-09-23 (ids ending in ":free").
DEFAULT_FREE_MODEL = "google/gemma-4-31b-it:free"
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
# Tried in order when the requested model is rate-limited or empty. All free on 2026-09-23.
DEFAULT_FALLBACK_MODELS = ["nvidia/nemotron-3-super-120b-a12b:free", "qwen/qwen3.8-27b:free", "nex-agi/nex-n2.5-pro:free", "google/gemma-4-26b-a4b-it:free"]


@dataclass(frozen=True)
class Settings:
    openrouter_api_key: str
    openrouter_base_url: str
    openrouter_model: str
    model_evidence: str
    model_bull: str
    model_bear: str
    model_synthesis: str
    model_critic: str
    fallback_models: tuple[str, ...]
    app_referer: str
    app_title: str
    langfuse_host: str | None
    langfuse_public_key: str | None
    langfuse_secret_key: str | None
    fred_api_key: str | None
    edgar_user_agent: str
    runs_dir: str

    @property
    def llm_enabled(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def langfuse_enabled(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key)


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    e = dict(os.environ) if env is None else dict(env)
    default_model = e.get("OPENROUTER_MODEL") or DEFAULT_FREE_MODEL

    def model(key: str) -> str:
        return e.get(key) or default_model

    return Settings(
        openrouter_api_key=e.get("OPENROUTER_API_KEY", ""),
        openrouter_base_url=e.get("OPENROUTER_BASE_URL") or DEFAULT_BASE_URL,
        openrouter_model=default_model,
        model_evidence=model("MODEL_EVIDENCE"),
        model_bull=model("MODEL_BULL"),
        model_bear=model("MODEL_BEAR"),
        model_synthesis=model("MODEL_SYNTHESIS"),
        model_critic=model("MODEL_CRITIC"),
        fallback_models=tuple(m.strip() for m in e.get("OPENROUTER_FALLBACK_MODELS", ",".join(DEFAULT_FALLBACK_MODELS)).split(",") if m.strip()),
        app_referer=e.get("APP_REFERER", "https://morantejr.github.io/signal-app/"),
        app_title=e.get("APP_TITLE", "SIGNAL research"),
        langfuse_host=e.get("LANGFUSE_HOST") or None,
        langfuse_public_key=e.get("LANGFUSE_PUBLIC_KEY") or None,
        langfuse_secret_key=e.get("LANGFUSE_SECRET_KEY") or None,
        fred_api_key=e.get("FRED_API_KEY") or None,
        edgar_user_agent=e.get("EDGAR_USER_AGENT", "SIGNAL research contact@example.com"),
        runs_dir=e.get("RUNS_DIR", "runs"),
    )

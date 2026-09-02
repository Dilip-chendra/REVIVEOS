"""
ReviveAI — Application Configuration

All settings are loaded from environment variables (or .env file).
No hardcoded secrets anywhere in the codebase.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_env: str = "development"
    app_secret_key: str = "change-me-before-production"
    log_level: str = "INFO"
    app_title: str = "ReviveAI"
    app_version: str = "1.0.0"
    app_description: str = (
        "Autonomous Revenue Recovery Agent — "
        "Detect revenue at risk. Diagnose why. Recover it safely."
    )

    # ── CORS / Frontend ───────────────────────────────────────────────────────
    # In Render, set: FRONTEND_URL=https://reviveai-five.vercel.app
    frontend_url: str = "http://localhost:5173"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./reviveai.db"

    # ── AI Configuration ─────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_timeout_seconds: int = 30
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_free_only: bool = True
    openrouter_timeout_seconds: int = 10
    ai_global_deadline_seconds: float = 8.0
    ai_enabled: bool = True  # Set False to run fully deterministic mode

    # ── Razorpay ─────────────────────────────────────────────────────────────
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_enabled: bool = False  # True only when real keys are present
    active_environment: str = "DEMO"  # DEMO | RAZORPAY_TEST | RAZORPAY_LIVE
    live_mode_read_only: bool = True
    production_actions_enabled: bool = False
    credential_encryption_key: str = ""  # Base64 32-byte key for Fernet, auto-generated if blank

    # ── Recovery Policy Limits (deterministic safety gates) ──────────────────
    max_retries_per_case: int = 3
    max_automated_amount_inr: int = 50_000  # ₹50,000 ceiling for automation
    max_consecutive_failures: int = 2
    reminder_cooldown_hours: int = 24
    retry_cooldown_minutes: int = 60
    require_human_above_inr: int = 50_000

    # ── Recovery Cost Model (for EV calculation) ──────────────────────────────
    cost_per_retry_inr: float = 2.0       # Infrastructure cost per retry
    cost_per_reminder_inr: float = 0.50   # Cost of sending a reminder
    cost_per_escalation_inr: float = 50.0 # Ops cost of human review

    # ── Simulation ────────────────────────────────────────────────────────────
    default_simulation_scale: int = 10_000
    default_simulation_seed: int = 42
    precomputed_100k_path: str = "./data/eval_100k.parquet"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def razorpay_configured(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    @property
    def detected_razorpay_environment(self) -> str:
        """Detect environment from key prefix."""
        if self.razorpay_key_id.startswith("rzp_live_"):
            return "live"
        if self.razorpay_key_id.startswith("rzp_test_"):
            return "test"
        return "unknown"

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def openrouter_configured(self) -> bool:
        return bool(self.openrouter_api_key)


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()

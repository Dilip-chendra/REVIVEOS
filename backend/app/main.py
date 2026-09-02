"""
ReviveAI 2.0 — FastAPI Application Entry Point
The Revenue Recovery & Monetization Operating System
Built for Razorpay Buildathon — Track 03: AI Revenue Recovery
"""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db
from app.auth import get_current_user

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("reviveai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("ReviveAI 2.0 starting up...")
    await init_db()
    logger.info("Database initialized.")

    if settings.razorpay_configured:
        logger.info(f"Razorpay test-mode: ENABLED ({settings.razorpay_key_id[:12]}...)")
    else:
        logger.warning("Razorpay test-mode: NOT CONFIGURED (synthetic mode only)")

    if settings.gemini_configured:
        logger.info(f"Gemini AI: ENABLED ({settings.gemini_model})")
    else:
        logger.warning("Gemini AI: NOT CONFIGURED (deterministic fallback mode)")

    yield

    logger.info("ReviveAI 2.0 shutting down.")


# Create FastAPI app
app = FastAPI(
    title="ReviveAI 2.0 — Revenue Recovery Operating System",
    version="2.0.0",
    description="The complete revenue recovery, decision intelligence & experimentation operating system.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Always allow production frontend + standard local dev origins.
# FRONTEND_URL env var controls the production origin (set in Render dashboard).
_cors_origins: list[str] = [
    settings.frontend_url,                  # e.g. https://reviveai-five.vercel.app
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
# Deduplicate while preserving order
_seen = set()
_allowed_origins = []
for _o in _cors_origins:
    if _o and _o not in _seen:
        _seen.add(_o)
        _allowed_origins.append(_o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-Ms"],
)


# ── Request ID Middleware ─────────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add a unique request ID to every request for traceability."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.perf_counter()
    response: Response = await call_next(request)
    elapsed = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{elapsed:.1f}"
    return response


# ── Global Exception Handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Recovery automation paused. No financial action was executed.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


# ── Include Routers ───────────────────────────────────────────────────────────
from app.routers import (
    dashboard,
    recovery,
    simulation,
    audit,
    evaluation,
    ai_chat,
    razorpay_data,
    impact,
    onboarding,
    merchants,
    controls,
    security_tests,
    webhooks,
    counterfactuals,
    policies,
    orchestrator,
    experiments,
    incidents,
    chaos,
    judge,
    portfolio,
    agents,
)
from app.routers import arbitration, toctou, benchmark, opportunity_queue, attribution

auth_deps = [Depends(get_current_user)]

app.include_router(onboarding.router,        prefix="/api", tags=["Onboarding"])
app.include_router(merchants.router,         prefix="/api", tags=["Merchant"])
app.include_router(controls.router,          prefix="/api", tags=["Controls"],                dependencies=auth_deps)
app.include_router(dashboard.router,         prefix="/api", tags=["Dashboard"],               dependencies=auth_deps)
app.include_router(opportunity_queue.router, prefix="/api", tags=["Opportunity Queue"],       dependencies=auth_deps)
app.include_router(attribution.router,       prefix="/api", tags=["Attribution & Benchmark"], dependencies=auth_deps)
app.include_router(portfolio.router,         prefix="/api", tags=["Recovery Capital Portfolio"], dependencies=auth_deps)
app.include_router(agents.router,            prefix="/api", tags=["Agent Interoperability Gateway"])
app.include_router(recovery.router,          prefix="/api", tags=["Recovery"],                dependencies=auth_deps)
app.include_router(simulation.router,        prefix="/api", tags=["Simulation"],              dependencies=auth_deps)
app.include_router(audit.router,             prefix="/api", tags=["Audit"],                   dependencies=auth_deps)
app.include_router(evaluation.router,        prefix="/api", tags=["Evaluation"],              dependencies=auth_deps)
app.include_router(ai_chat.router,           prefix="/api/ai", tags=["AI Copilot"],          dependencies=auth_deps)
app.include_router(razorpay_data.router,     prefix="/api", tags=["Razorpay"],                dependencies=auth_deps)
app.include_router(impact.router,            prefix="/api", tags=["Impact"],                  dependencies=auth_deps)
app.include_router(security_tests.router,    prefix="/api", tags=["Security"],                dependencies=auth_deps)
app.include_router(webhooks.router,          prefix="/api", tags=["Webhooks"])

# ReviveAI 2.0 Routers
app.include_router(counterfactuals.router,   prefix="/api", tags=["Counterfactual Lab"],      dependencies=auth_deps)
app.include_router(policies.router,          prefix="/api", tags=["Policy Studio"],           dependencies=auth_deps)
app.include_router(orchestrator.router,      prefix="/api", tags=["Orchestrator"],            dependencies=auth_deps)
app.include_router(experiments.router,       prefix="/api", tags=["Experiments & Backtest"], dependencies=auth_deps)
app.include_router(incidents.router,         prefix="/api", tags=["Incident Commander"],      dependencies=auth_deps)
app.include_router(chaos.router,             prefix="/api", tags=["Chaos & Red Team Lab"],   dependencies=auth_deps)
app.include_router(judge.router,             prefix="/api", tags=["Judge Mode"],              dependencies=auth_deps)
app.include_router(arbitration.router,       prefix="/api", tags=["Agent Arbitration"],       dependencies=auth_deps)
app.include_router(toctou.router,            prefix="/api", tags=["TOCTOU Security"],         dependencies=auth_deps)
app.include_router(benchmark.router,         prefix="/api", tags=["Recovery Benchmark"],      dependencies=auth_deps)



# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ReviveAI 2.0 — Revenue Recovery Operating System",
        "version": "2.0.0",
        "environment": settings.app_env,
        "capabilities": {
            "ai_enabled": settings.gemini_configured,
            "razorpay_enabled": settings.razorpay_configured,
            "counterfactual_lab": True,
            "policy_studio": True,
            "action_graph": True,
            "incident_commander": True,
            "chaos_lab": True,
            "judge_mode": True,
        },
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "ReviveAI 2.0 — Revenue Recovery Operating System",
        "tagline": "Detect revenue leakage. Simulate decisions. Recover safely. Prove financial ROI.",
        "docs": "/api/docs",
        "version": "2.0.0",
    }
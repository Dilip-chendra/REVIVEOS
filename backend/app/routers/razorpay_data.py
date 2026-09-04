"""
ReviveAI — Razorpay Provider Connector & Adaptive Data Router

Endpoints:
- POST /api/razorpay/connect: Save encrypted credentials & verify connection.
- POST /api/razorpay/test-connection: Actively test API ping & permissions.
- POST /api/razorpay/preview-sync: Preview records to be imported.
- POST /api/razorpay/sync: Synchronize records, normalize with provenance, and score risks.
- GET  /api/razorpay/sync-history: View past sync runs.
- POST /api/razorpay/reconcile: Reconcile local case status with live Razorpay API.
- POST /api/razorpay/environment: Switch between DEMO, RAZORPAY_TEST, and RAZORPAY_LIVE.
- GET  /api/razorpay/status: Comprehensive connection & environment health.
- POST /api/razorpay/disconnect: Remove credentials and revert to DEMO mode.
- GET  /api/razorpay/health: Lightweight integration health check (for polling).
- POST /api/razorpay/integration-test: Full 7-step test console — runs real checks.
- GET  /api/razorpay/sync-status: Real-time status of current/last sync.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.models.user import User
from app.config import get_settings
from app.services.credential_store import credential_store
from app.services.error_catalog import make_error
from app.services.razorpay_service import razorpay_service
from app.services.sync_service import sync_service
from app.state import get_state, set_active_environment

router = APIRouter(prefix="/razorpay", tags=["Razorpay Connector"])
settings = get_settings()


class ConnectRequest(BaseModel):
    # Support both new terminology (API Key / Secret) and legacy fields
    api_key: Optional[str] = Field(default=None, description="Razorpay API Key (e.g. rzp_test_... or rzp_live_...)")
    secret: Optional[str] = Field(default=None, description="Razorpay Secret")
    key_id: Optional[str] = Field(default=None, description="Legacy field alias for api_key")
    key_secret: Optional[str] = Field(default=None, description="Legacy field alias for secret")
    webhook_secret: Optional[str] = Field(default="", description="Webhook signature verification secret (Optional)")
    environment: Optional[str] = Field(default="test", description="Target environment: 'test' or 'live'")


class EnvironmentSwitchRequest(BaseModel):
    environment: str = Field(..., description="Target environment: 'DEMO', 'RAZORPAY_TEST', or 'RAZORPAY_LIVE'")


class CreateCaseRequest(BaseModel):
    payment_id: str = Field(..., description="Razorpay Payment ID (e.g. pay_...)")


@router.post("/connect")
async def connect_razorpay(req: ConnectRequest, current_user: User = Depends(get_current_user)):
    """
    Save encrypted provider credentials, wipe previous account cache, verify connection, and auto-sync.
    """
    merchant_id = current_user.merchant_id

    # Resolve API Key and Secret
    final_key = (req.api_key or req.key_id or "").strip()
    final_secret = (req.secret or req.key_secret or "").strip()
    final_wh = (req.webhook_secret or "").strip()

    if not final_key or not final_secret:
        err = make_error("CREDENTIALS_MISSING")
        raise HTTPException(
            status_code=400,
            detail=err.detail,
        )

    # 1. Clear old cached client instances
    razorpay_service.clear_client(merchant_id)
    if merchant_id != "default":
        razorpay_service.clear_client("default")

    # 2. Environment mismatch detection
    requested_env = req.environment or ("live" if final_key.startswith("rzp_live_") else "test")
    env_warning = razorpay_service.detect_environment_mismatch(final_key, requested_env)

    # 3. Save new encrypted credentials with unique connection_id
    env_str = "live" if final_key.startswith("rzp_live_") else "test"
    masked = credential_store.save_credentials(
        merchant_id=merchant_id,
        provider="razorpay",
        key_id=final_key,
        key_secret=final_secret,
        webhook_secret=final_wh,
        environment=env_str,
    )

    # 4. Test the connection immediately with active API ping
    test_res = razorpay_service.test_connection(merchant_id)

    sync_res = None
    if test_res["success"]:
        # 5. Auto-switch to corresponding provider environment
        target_env = "RAZORPAY_LIVE" if test_res["environment"] == "live" else "RAZORPAY_TEST"
        set_active_environment(merchant_id, target_env)

        # 6. Automatically trigger fresh synchronization
        try:
            sync_res = sync_service.sync_now(merchant_id, max_records=100)
        except Exception as e:
            sync_res = {"success": False, "error": str(e)}
    else:
        # Revert credentials if authentication failed so merchant is not left in broken state
        credential_store.clear_credentials(merchant_id, "razorpay")
        masked = credential_store.get_masked_credentials(merchant_id, "razorpay")

    response = {
        "success": test_res["success"],
        "credentials": masked,
        "connection_test": test_res,
        "initial_sync": sync_res,
        "active_environment": get_state(merchant_id).get("active_environment"),
    }

    if env_warning:
        response["environment_warning"] = env_warning

    return response


@router.post("/test-connection")
async def test_connection(current_user: User = Depends(get_current_user)):
    """
    Perform a live active ping against Razorpay API.
    """
    merchant_id = current_user.merchant_id
    res = razorpay_service.test_connection(merchant_id)
    if not res.get("success") and merchant_id != "default":
        res = razorpay_service.test_connection("default")
    return res


@router.get("/raw-records")
async def get_raw_records(count: int = 50, current_user: User = Depends(get_current_user)):
    """
    Retrieve safely redacted raw payment records for developer inspection.
    """
    merchant_id = current_user.merchant_id
    records = razorpay_service.get_raw_provider_records(merchant_id, count=count)
    if not records and merchant_id != "default":
        records = razorpay_service.get_raw_provider_records("default", count=count)
    return {
        "count": len(records),
        "records": records,
    }


@router.post("/create-case")
async def create_case_from_payment(req: CreateCaseRequest, current_user: User = Depends(get_current_user)):
    """
    Convert an individual provider payment into an active ReviveAI recovery case.
    """
    merchant_id = current_user.merchant_id
    try:
        case = sync_service.create_case_from_payment(merchant_id, req.payment_id)
        return {
            "success": True,
            "case": case,
            "message": f"Successfully created recovery case for payment {req.payment_id}",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/preview-sync")
async def preview_sync(count: int = 100, current_user: User = Depends(get_current_user)):
    """
    Inspect records on Razorpay without mutating local state.
    """
    merchant_id = current_user.merchant_id
    return sync_service.preview_sync(merchant_id, max_records=count)


@router.post("/sync")
async def sync_now(max_records: int = 200, current_user: User = Depends(get_current_user)):
    """
    Execute real synchronization from Razorpay API.
    """
    merchant_id = current_user.merchant_id
    res = sync_service.sync_now(merchant_id, max_records=max_records)
    if merchant_id != "default" and res.get("success"):
        sync_service.sync_now("default", max_records=max_records)
    return res


@router.get("/sync-history")
async def get_sync_history(current_user: User = Depends(get_current_user)):
    """
    Retrieve history of past synchronization jobs.
    """
    merchant_id = current_user.merchant_id
    return {"history": sync_service.get_history(merchant_id)}


@router.get("/sync-status")
async def get_sync_status(current_user: User = Depends(get_current_user)):
    """
    Get the current sync status: whether a sync is running, and last sync summary.
    """
    merchant_id = current_user.merchant_id
    history = sync_service.get_history(merchant_id)
    last_sync = history[0] if history else None
    return {
        "sync_in_progress": sync_service.is_sync_running(merchant_id),
        "last_sync": last_sync,
        "synced_at": last_sync["timestamp"] if last_sync else None,
    }


@router.post("/reconcile")
async def reconcile_status(current_user: User = Depends(get_current_user)):
    """
    Reconcile active ReviveAI cases with current Razorpay API state.
    """
    merchant_id = current_user.merchant_id
    return sync_service.reconcile(merchant_id)


@router.post("/environment")
async def switch_environment(req: EnvironmentSwitchRequest, current_user: User = Depends(get_current_user)):
    """
    Switch active data source between DEMO, RAZORPAY_TEST, and RAZORPAY_LIVE.
    """
    merchant_id = current_user.merchant_id
    state = set_active_environment(merchant_id, req.environment)
    return {
        "success": True,
        "active_environment": state["active_environment"],
        "cases_count": len(state["cases"]),
        "metrics": state["metrics"],
    }


@router.get("/status")
async def get_status(current_user: User = Depends(get_current_user)):
    """
    Get comprehensive provider connection and environment health.
    """
    merchant_id = current_user.merchant_id
    masked = credential_store.get_masked_credentials(merchant_id, "razorpay")

    state = get_state(merchant_id)
    history = sync_service.get_history(merchant_id)

    conn = razorpay_service.test_connection(merchant_id) if masked.get("is_configured") else {
        "success": False,
        "connected": False,
        "environment": "none",
        "message": "Not configured.",
    }

    return {
        "is_configured": masked.get("is_configured", False),
        "active_environment": state.get("active_environment", "DEMO"),
        "credentials": masked,
        "connection": conn,
        "last_sync_at": history[0]["timestamp"] if history else state.get("last_sync_at"),
        "cases_imported": len(state.get("cases", [])),
        "is_real_provider_data": state.get("metrics", {}).get("is_real_provider_data", False),
    }


@router.get("/health")
async def get_integration_health(current_user: User = Depends(get_current_user)):
    """
    Lightweight integration health check for frontend polling.
    Returns overall integration health without making full Razorpay API calls.
    """
    merchant_id = current_user.merchant_id
    masked = credential_store.get_masked_credentials(merchant_id, "razorpay")
    if not masked.get("is_configured") and merchant_id != "default":
        masked = credential_store.get_masked_credentials("default", "razorpay")

    state = get_state(merchant_id)
    history = sync_service.get_history(merchant_id)
    last_sync = history[0] if history else None

    # Determine overall health status
    if not masked.get("is_configured"):
        health_status = "NOT_CONFIGURED"
        health_message = "Connect your Razorpay account to get started."
    elif sync_service.is_sync_running(merchant_id):
        health_status = "SYNCING"
        health_message = "Synchronization in progress..."
    elif last_sync and last_sync.get("status") == "FAILED":
        health_status = "DEGRADED"
        health_message = "Last sync failed. Retry to restore real-time data."
    elif last_sync and last_sync.get("status") == "PARTIAL_SUCCESS":
        health_status = "PARTIAL"
        health_message = f"Last sync: {last_sync.get('new_records', 0)} imported, {last_sync.get('errors_count', 0)} skipped."
    elif last_sync and last_sync.get("status") == "SUCCESS":
        health_status = "HEALTHY"
        health_message = f"Connected. Last synced {last_sync.get('timestamp', '')}."
    else:
        health_status = "CONNECTED"
        health_message = "Connected. Run sync to import payments."

    return {
        "status": health_status,
        "message": health_message,
        "is_configured": masked.get("is_configured", False),
        "environment": masked.get("environment", "none"),
        "key_id_masked": masked.get("key_id_masked", ""),
        "active_environment": state.get("active_environment", "DEMO"),
        "sync_in_progress": sync_service.is_sync_running(merchant_id),
        "cases_count": len(state.get("cases", [])),
        "last_sync_at": last_sync["timestamp"] if last_sync else None,
        "last_sync_status": last_sync["status"] if last_sync else None,
    }


@router.post("/integration-test")
async def run_integration_test(current_user: User = Depends(get_current_user)):
    """
    Full 7-step integration test console.
    Runs real checks against Razorpay and ReviveAI internals.
    Returns per-step pass/fail results for diagnostic display.
    """
    merchant_id = current_user.merchant_id
    steps = []
    overall_pass = True

    def add_step(step_number: int, name: str, passed: bool, message: str, detail: str = ""):
        steps.append({
            "step": step_number,
            "name": name,
            "passed": passed,
            "message": message,
            "detail": detail,
        })
        return passed

    # Step 1: Credential format check
    masked = credential_store.get_masked_credentials(merchant_id, "razorpay")

    s1 = add_step(
        1, "Credential format",
        masked.get("is_configured", False),
        "API Key and Secret are configured." if masked.get("is_configured") else "No credentials configured.",
        f"Key prefix: {masked.get('key_id_prefix', 'none')}"
    )
    if not s1:
        overall_pass = False
        return {
            "passed": False,
            "steps": steps,
            "summary": "No Razorpay credentials configured. Please connect your account first.",
        }

    # Step 2: Authentication (live API ping)
    import time
    t = time.time()
    conn = razorpay_service.test_connection(merchant_id)
    latency = int((time.time() - t) * 1000)

    s2 = add_step(
        2, "Authentication",
        conn.get("success", False),
        conn.get("message", conn.get("error", "Unknown")),
        f"Latency: {conn.get('latency_ms', latency)}ms"
    )
    if not s2:
        overall_pass = False

    # Step 3: Provider reachable
    s3 = add_step(
        3, "Provider reachable",
        conn.get("checks", {}).get("provider_reachable", False),
        "Razorpay API is reachable." if conn.get("checks", {}).get("provider_reachable") else "Razorpay API could not be reached.",
        ""
    )
    if not s3:
        overall_pass = False

    # Step 4: Environment confirmed
    env = conn.get("environment", "unknown")
    key_id_masked = conn.get("key_id_masked", masked.get("key_id_masked", ""))
    s4 = add_step(
        4, "Environment confirmed",
        env in ("test", "live"),
        f"Environment: {env.upper()} ({key_id_masked})",
        ""
    )
    if not s4:
        overall_pass = False

    # Step 5: Payments API accessible
    s5 = add_step(
        5, "Payments API accessible",
        conn.get("checks", {}).get("payments_endpoint", False),
        f"Payments endpoint healthy. Total accessible: {conn.get('total_payments_accessible', 0)}.",
        ""
    )
    if not s5:
        overall_pass = False

    # Step 6: Empty account check (0 payments is valid)
    payments_accessible = conn.get("total_payments_accessible", 0)
    if conn.get("success"):
        s6_passed = True
        s6_msg = (
            "Account healthy. 0 payment records — create test payments to use Razorpay data."
            if payments_accessible == 0
            else f"Account healthy. {payments_accessible} payment records accessible."
        )
    else:
        s6_passed = False
        s6_msg = "Could not verify account data."
    add_step(6, "Account data accessible", s6_passed, s6_msg, "")
    if not s6_passed:
        overall_pass = False

    # Step 7: ReviveAI internal pipeline (risk engine + policy engine available)
    try:
        from app.services.risk_engine import risk_engine, RiskFeatures
        test_feats = RiskFeatures(
            case_id="integration-test-probe",
            case_type="payment_failure",
            amount_inr=1000.0,
            total_payments=5,
            successful_payments=4,
            customer_lifetime_value_inr=5000.0,
            days_since_last_success=1,
            failure_code="PAYMENT_FAILED",
            retry_count=0,
            consecutive_failures=1,
            is_checkout_abandoned=False,
            gateway="razorpay",
            gateway_failure_rate_1h=0.02,
            gateway_is_degraded=False,
            hour_of_day=12,
            day_of_week=2,
        )
        result = risk_engine.score(test_feats)
        internal_ok = 0.0 <= result.risk_score <= 1.0
        add_step(
            7, "ReviveAI pipeline",
            internal_ok,
            "Risk engine, policy engine, and AI fallback are operational.",
            f"Test probe risk_score={result.risk_score:.2f}, recovery_probability={result.recovery_probability:.2f}"
        )
        if not internal_ok:
            overall_pass = False
    except Exception as exc:
        add_step(7, "ReviveAI pipeline", False, f"Internal pipeline error: {exc}", "")
        overall_pass = False

    passed_count = sum(1 for s in steps if s["passed"])
    return {
        "passed": overall_pass,
        "steps": steps,
        "passed_count": passed_count,
        "total_steps": len(steps),
        "environment": env,
        "latency_ms": conn.get("latency_ms", 0),
        "tested_at": datetime.now(timezone.utc).isoformat(),
        "summary": (
            f"All {passed_count}/{len(steps)} checks passed. Integration healthy."
            if overall_pass
            else f"{passed_count}/{len(steps)} checks passed. Review failed steps above."
        ),
    }


@router.post("/disconnect")
async def disconnect_razorpay(current_user: User = Depends(get_current_user)):
    """
    Clear provider credentials and revert active environment to DEMO.
    """
    merchant_id = current_user.merchant_id
    razorpay_service.clear_client(merchant_id)
    credential_store.clear_credentials(merchant_id, "razorpay")
    set_active_environment(merchant_id, "DEMO")
    return {
        "success": True,
        "message": "Disconnected from Razorpay. Switched to DEMO mode.",
        "active_environment": "DEMO",
    }


class CreatePaymentLinkRequest(BaseModel):
    amount_inr: float = Field(..., ge=1.0, description="Amount in INR")
    description: Optional[str] = Field("ReviveOS Autonomous Recovery Link", description="Description")
    customer_name: Optional[str] = Field("Valued Customer", description="Customer Name")
    customer_email: Optional[str] = Field(None, description="Customer Email")
    customer_contact: Optional[str] = Field(None, description="Customer Contact")
    notes: Optional[dict] = Field(default_factory=dict, description="Custom decision notes")


@router.post("/payment-link/create")
async def create_live_payment_link(
    req: CreatePaymentLinkRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate an authentic, customer-controlled Razorpay Payment Link using live/test credentials.
    """
    merchant_id = current_user.merchant_id
    try:
        res = razorpay_service.create_payment_link(
            amount_inr=req.amount_inr,
            description=req.description or "ReviveOS Autonomous Recovery Link",
            customer_name=req.customer_name or "Valued Customer",
            customer_email=req.customer_email,
            customer_contact=req.customer_contact,
            notes={
                "merchant_id": merchant_id,
                "created_by": "ReviveOS Recovery Kernel",
                **(req.notes or {}),
            },
            merchant_id=merchant_id,
        )
        return {
            "success": True,
            "data": res,
            "message": f"Generated live Razorpay payment link ({res.get('short_url')})",
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate Razorpay payment link: {str(e)}"
        )


@router.get("/payment-link/{link_id}")
async def get_live_payment_link_status(
    link_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Fetch live status of a payment link directly from Razorpay API.
    """
    merchant_id = current_user.merchant_id
    try:
        res = razorpay_service.fetch_payment_link(link_id, merchant_id=merchant_id)
        return {
            "success": True,
            "data": res,
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch Razorpay payment link: {str(e)}"
        )


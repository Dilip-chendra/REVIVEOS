"""
ReviveOS Backend Production Server Entry Point
Ensures reliable binding to Render's dynamic $PORT environment variable.
"""
import os
import sys
import uvicorn

if __name__ == "__main__":
    port_str = os.environ.get("PORT", os.environ.get("RENDER_PORT", "10000"))
    try:
        port = int(port_str)
    except (ValueError, TypeError):
        port = 10000

    host = "0.0.0.0"
    print(f"--> [ReviveOS] Launching on {host}:{port} (PORT={port_str})...", flush=True)
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        proxy_headers=True,
        forwarded_allow_ips="*",
    )

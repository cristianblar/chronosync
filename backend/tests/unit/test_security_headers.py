from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.middleware import SecurityHeadersMiddleware


def test_security_headers_middleware_sets_headers():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    # Use HTTPS base_url so HSTS header is expected.
    client = TestClient(app, base_url="https://testserver")
    res = client.get("/ping")
    assert res.status_code == 200

    # Basic anti-XSS / clickjacking / MIME-sniffing protections
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "mode=block" in (res.headers.get("X-XSS-Protection") or "")

    # Basic CSP/Referrer Policy hardening
    assert "default-src" in (res.headers.get("Content-Security-Policy") or "")
    assert res.headers.get("Referrer-Policy")

    # HSTS should only be enabled on HTTPS, but we verify it's configured by default.
    assert "max-age" in (res.headers.get("Strict-Transport-Security") or "")

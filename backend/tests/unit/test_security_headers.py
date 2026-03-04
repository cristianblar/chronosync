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

    # Non-docs paths use the strict CSP.
    assert "default-src 'none'" in (res.headers.get("Content-Security-Policy") or "")


def test_security_headers_docs_paths_use_permissive_csp():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/docs")
    def docs():
        return {"ok": True}

    client = TestClient(app)
    res = client.get("/docs")
    csp = res.headers.get("Content-Security-Policy") or ""

    # Docs pages allow Swagger UI assets.
    assert "'unsafe-inline'" in csp
    assert "cdn.jsdelivr.net" in csp
    # But still disallow framing.
    assert "frame-ancestors 'none'" in csp

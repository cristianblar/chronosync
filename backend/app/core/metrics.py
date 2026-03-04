import time
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import APIRouter
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware


REQUEST_COUNT = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"]
)
PLAN_GENERATION_TIME = Histogram("plan_generation_seconds", "Sleep plan generation time")


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        endpoint = request.url.path
        REQUEST_COUNT.labels(
            method=request.method, endpoint=endpoint, status=response.status_code
        ).inc()
        REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(duration)
        return response


router = APIRouter()


@router.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")

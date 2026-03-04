import os

from locust import HttpUser, between, task


class ChronoSyncUser(HttpUser):
    """Basic API load test.

    - Always hits liveness (no DB/Redis needed on the server).
    - Optionally hits plan generation if CHRONOSYNC_ACCESS_TOKEN is provided.

    Notes:
    - /api/v1/plans/generate requires an authenticated user with a chronotype assessment.
      This is intentionally opt-in to keep the perf suite runnable without fixtures.
    """

    wait_time = between(0.1, 0.8)

    @task(10)
    def health_live(self):
        self.client.get("/api/v1/health/live", name="GET /api/v1/health/live")

    @task(1)
    def plans_generate(self):
        token = os.getenv("CHRONOSYNC_ACCESS_TOKEN")
        if not token:
            return
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"start_date": None}
        self.client.post(
            "/api/v1/plans/generate",
            json=payload,
            headers=headers,
            name="POST /api/v1/plans/generate",
        )

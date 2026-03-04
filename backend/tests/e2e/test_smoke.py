def test_health_endpoints(client):
    r = client.get("/api/v1/health")
    assert r.status_code in (200, 503)
    r2 = client.get("/api/v1/health/ready")
    assert r2.status_code in (200, 503)
    r3 = client.get("/api/v1/health/live")
    assert r3.status_code == 200


def test_auth_and_chronotype_flow(client, sample_user_data, sample_meq_responses):
    reg = client.post("/api/v1/auth/register", json=sample_user_data)
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    r = client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": sample_meq_responses},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201

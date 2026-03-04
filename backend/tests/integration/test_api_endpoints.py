def test_auth_register_login(client, sample_user_data):
    r = client.post("/api/v1/auth/register", json=sample_user_data)
    assert r.status_code == 201
    tokens = r.json()
    assert "access_token" in tokens
    assert "user" in tokens
    r2 = client.post(
        "/api/v1/auth/login",
        json={"email": sample_user_data["email"], "password": sample_user_data["password"]},
    )
    assert r2.status_code == 200
    assert "access_token" in r2.json()
    assert "user" in r2.json()


def test_chronotype_assessment_flow(client, sample_user_data, sample_meq_responses):
    reg = client.post("/api/v1/auth/register", json=sample_user_data)
    token = reg.json()["access_token"]
    r = client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": sample_meq_responses},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    r2 = client.get(
        "/api/v1/chronotype/current",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 200
    r3 = client.get(
        "/api/v1/chronotype/ideal-times",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r3.status_code == 200


def test_plan_generate_requires_assessment(client, sample_user_data):
    reg = client.post("/api/v1/auth/register", json=sample_user_data)
    token = reg.json()["access_token"]
    r = client.post(
        "/api/v1/plans/generate",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


def test_tracking_and_notifications(client, sample_user_data, sample_meq_responses):
    reg = client.post("/api/v1/auth/register", json=sample_user_data)
    token = reg.json()["access_token"]
    client.post(
        "/api/v1/chronotype/assessment",
        json={"responses": sample_meq_responses},
        headers={"Authorization": f"Bearer {token}"},
    )
    r = client.post(
        "/api/v1/tracking",
        json={"sleep_quality": 7, "energy_levels": {"morning": 6}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    s = client.get("/api/v1/notifications/settings", headers={"Authorization": f"Bearer {token}"})
    assert s.status_code == 200

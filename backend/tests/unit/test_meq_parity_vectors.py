import json
from pathlib import Path

from app.utils.meq_scoring import calculate_chronotype


def test_meq_vectors_parity_with_frontend():
    backend_root = Path(__file__).resolve().parents[2]
    vectors_path = backend_root / "test-vectors" / "meq.json"

    data = json.loads(vectors_path.read_text(encoding="utf-8"))
    vectors = data["vectors"]

    for v in vectors:
        responses = {f"q{i}": val for i, val in enumerate(v["values"], start=1)}
        result = calculate_chronotype(responses)

        assert result["score"] == v["expected"]["score"], v["name"]
        assert result["chronotype"].value == v["expected"]["chronotype"], v["name"]
        assert result["ideal_wake_time"] == v["expected"]["ideal_wake_time"], v["name"]
        assert result["ideal_sleep_time"] == v["expected"]["ideal_sleep_time"], v["name"]
        assert result["midpoint_of_sleep"] == v["expected"]["midpoint_of_sleep"], v["name"]

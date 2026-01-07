import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from testcontainers.redis import RedisContainer

from db.redis_client import RedisClient
from main import app


@pytest.fixture(scope="module")
def redis_container():
    """Start Redis container for tests."""
    with RedisContainer("redis:7-alpine") as redis:
        yield redis


@pytest.fixture(autouse=True)
def setup_redis(redis_container):
    """Setup Redis environment variables for each test."""
    os.environ["REDIS_HOST"] = redis_container.get_container_host_ip()
    os.environ["REDIS_PORT"] = redis_container.get_exposed_port(6379)
    os.environ["REDIS_DB"] = "0"

    redis_singleton = RedisClient()
    redis_singleton._redis = None

    yield

    redis_singleton._redis = None


@pytest.fixture
def client():
    """Create FastAPI test client."""
    return TestClient(app)


class TestRoomRoutes:
    """Test suite for room API routes."""

    def test_create_room_success(self, client):
        """Test POST /api/v1/rooms creates a room."""
        response = client.post(
            "/api/v1/rooms",
            json={"name": "Sprint 42 Planning", "creator_name": "Alice"}
        )

        assert response.status_code == 201
        data = response.json()
        assert "room_id" in data
        assert "user_id" in data
        assert "room" in data
        assert data["room"]["name"] == "Sprint 42 Planning"
        assert data["room"]["state"] == "voting"
        assert data["user_id"] in data["room"]["users"]

    def test_create_room_invalid_name(self, client):
        """Test creating room with invalid name."""
        response = client.post(
            "/api/v1/rooms",
            json={"name": "a" * 101, "creator_name": "Alice"}
        )

        assert response.status_code == 422

    def test_join_room_success(self, client):
        """Test POST /api/v1/rooms/{room_id}/join."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        room_id = create_response.json()["room_id"]

        join_response = client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={"name": "Bob"}
        )

        assert join_response.status_code == 200
        data = join_response.json()
        assert "user_id" in data
        assert "room" in data
        assert len(data["room"]["users"]) == 2
        assert data["user_id"] in data["room"]["users"]

    def test_join_room_not_found(self, client):
        """Test joining non-existent room."""
        fake_room_id = str(uuid4())

        response = client.post(
            f"/api/v1/rooms/{fake_room_id}/join",
            json={"name": "Bob"}
        )

        assert response.status_code == 404
        data = response.json()
        assert "error" in data or "detail" in data

    def test_get_room_voting_state(self, client):
        """Test GET /api/v1/rooms/{room_id} in voting state."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 5}
        )

        get_response = client.get(f"/api/v1/rooms/{room_id}?user_id={user_id}")

        assert get_response.status_code == 200
        room_data = get_response.json()
        assert room_data["state"] == "voting"
        assert "has_voted" in room_data["users"][user_id]
        assert "vote" not in room_data["users"][user_id]

    def test_get_room_complete_state(self, client):
        """Test GET /api/v1/rooms/{room_id} in complete state."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 5}
        )

        client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": user_id}
        )

        get_response = client.get(f"/api/v1/rooms/{room_id}?user_id={user_id}")

        assert get_response.status_code == 200
        room_data = get_response.json()
        assert room_data["state"] == "complete"
        assert "vote" in room_data["users"][user_id]
        assert room_data["users"][user_id]["vote"] == 5

    def test_get_room_not_found(self, client):
        """Test getting non-existent room."""
        fake_room_id = str(uuid4())
        fake_user_id = str(uuid4())

        response = client.get(f"/api/v1/rooms/{fake_room_id}?user_id={fake_user_id}")

        assert response.status_code == 404
        data = response.json()
        assert "error" in data or "detail" in data

    def test_vote_success(self, client):
        """Test POST /api/v1/rooms/{room_id}/vote."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        vote_response = client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 5}
        )

        assert vote_response.status_code == 200
        vote_data = vote_response.json()
        assert vote_data["success"] is True
        assert vote_data["room"]["users"][user_id]["has_voted"] is True

    def test_vote_invalid_fibonacci(self, client):
        """Test voting with invalid Fibonacci number."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        vote_response = client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 7}
        )

        assert vote_response.status_code in [400, 422]
        data = vote_response.json()
        assert "error" in data or "detail" in data

    def test_vote_in_complete_state(self, client):
        """Test voting when room is complete."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 5}
        )

        client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": user_id}
        )

        vote_response = client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 8}
        )

        assert vote_response.status_code == 403
        data = vote_response.json()
        assert "error" in data or "detail" in data

    def test_reveal_success(self, client):
        """Test POST /api/v1/rooms/{room_id}/reveal."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 5}
        )

        reveal_response = client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": user_id}
        )

        assert reveal_response.status_code == 200
        reveal_data = reveal_response.json()
        assert reveal_data["success"] is True
        assert reveal_data["room"]["state"] == "complete"
        assert reveal_data["room"]["users"][user_id]["vote"] == 5

    def test_reveal_already_complete(self, client):
        """Test revealing when already complete."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": user_id}
        )

        reveal_response = client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": user_id}
        )

        assert reveal_response.status_code == 403
        data = reveal_response.json()
        assert "error" in data or "detail" in data

    def test_reset_success(self, client):
        """Test POST /api/v1/rooms/{room_id}/reset."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        data = create_response.json()
        room_id = data["room_id"]
        user_id = data["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": user_id, "vote": 5}
        )

        client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": user_id}
        )

        reset_response = client.post(
            f"/api/v1/rooms/{room_id}/reset",
            json={"user_id": user_id}
        )

        assert reset_response.status_code == 200
        reset_data = reset_response.json()
        assert reset_data["success"] is True
        assert reset_data["room"]["state"] == "voting"
        assert reset_data["room"]["users"][user_id]["has_voted"] is False

    def test_multiple_users_workflow(self, client):
        """Test complete workflow with multiple users."""
        create_response = client.post(
            "/api/v1/rooms",
            json={"name": "Test Room", "creator_name": "Alice"}
        )
        alice_data = create_response.json()
        room_id = alice_data["room_id"]
        alice_id = alice_data["user_id"]

        join_response = client.post(
            f"/api/v1/rooms/{room_id}/join",
            json={"name": "Bob"}
        )
        bob_id = join_response.json()["user_id"]

        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": alice_id, "vote": 5}
        )
        client.post(
            f"/api/v1/rooms/{room_id}/vote",
            json={"user_id": bob_id, "vote": 8}
        )

        get_response = client.get(f"/api/v1/rooms/{room_id}?user_id={alice_id}")
        assert get_response.json()["state"] == "voting"

        reveal_response = client.post(
            f"/api/v1/rooms/{room_id}/reveal",
            json={"user_id": alice_id}
        )
        room_data = reveal_response.json()["room"]
        assert room_data["users"][alice_id]["vote"] == 5
        assert room_data["users"][bob_id]["vote"] == 8

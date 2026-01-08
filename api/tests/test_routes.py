import pytest
from fakeredis import aioredis
from httpx import AsyncClient

from db.redis_client import RedisClient, get_redis
from main import app


@pytest.fixture
async def redis_client():
    client = aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.flushall()
    await client.close()


@pytest.fixture
async def test_client(redis_client, monkeypatch):
    # Avoid hitting real Redis in lifespan by overriding dependency and no-op connect/disconnect.
    app.dependency_overrides[get_redis] = lambda: redis_client

    async def _connect(self):
        self._redis = redis_client

    async def _disconnect(self):
        return None

    monkeypatch.setattr(RedisClient, "connect", _connect, raising=False)
    monkeypatch.setattr(RedisClient, "disconnect", _disconnect, raising=False)

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_create_room_with_deck(test_client: AsyncClient):
    response = await test_client.post(
        "/api/v1/rooms",
        json={"name": "Sprint 1", "creator_name": "Alice", "deck": "ordinal"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["room"]["deck"] == "ordinal"
    assert data["room"]["name"] == "Sprint 1"


@pytest.mark.anyio
async def test_join_vote_reveal_reset_flow(test_client: AsyncClient):
    create_response = await test_client.post(
        "/api/v1/rooms",
        json={"name": "Flow Test", "creator_name": "Alice", "deck": "fibonacci"},
    )
    room_id = create_response.json()["room_id"]
    user_id = create_response.json()["user_id"]

    join_response = await test_client.post(
        f"/api/v1/rooms/{room_id}/join", json={"name": "Bob"}
    )
    assert join_response.status_code == 200
    bob_id = join_response.json()["user_id"]

    vote_response = await test_client.post(
        f"/api/v1/rooms/{room_id}/vote", json={"user_id": user_id, "vote": 5}
    )
    assert vote_response.status_code == 200

    reveal_response = await test_client.post(
        f"/api/v1/rooms/{room_id}/reveal", json={"user_id": user_id}
    )
    assert reveal_response.status_code == 200

    get_response = await test_client.get(
        f"/api/v1/rooms/{room_id}", params={"user_id": bob_id}
    )
    assert get_response.status_code == 200
    assert get_response.json()["state"] == "complete"

    reset_response = await test_client.post(
        f"/api/v1/rooms/{room_id}/reset", json={"user_id": user_id}
    )
    assert reset_response.status_code == 200
    assert reset_response.json()["room"]["state"] == "voting"


@pytest.mark.anyio
async def test_invalid_vote_returns_400(test_client: AsyncClient):
    create_response = await test_client.post(
        "/api/v1/rooms",
        json={"name": "Invalid Vote", "creator_name": "Alice", "deck": "fibonacci"},
    )
    room_id = create_response.json()["room_id"]
    user_id = create_response.json()["user_id"]

    response = await test_client.post(
        f"/api/v1/rooms/{room_id}/vote", json={"user_id": user_id, "vote": 7}
    )

    assert response.status_code == 400
    assert "Invalid vote value" in response.text

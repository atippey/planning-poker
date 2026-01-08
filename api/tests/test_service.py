import json
from datetime import datetime
from uuid import uuid4

import pytest
from fakeredis import aioredis

from models.room import VALID_FIBONACCI, Room, RoomState, User
from services.room_service import RoomService


@pytest.fixture
async def redis_client():
    """Create a fake Redis client for testing."""
    client = aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.flushall()
    await client.close()


@pytest.fixture
def room_service(redis_client):
    """Create RoomService instance with fake Redis."""
    return RoomService(redis_client)


class TestRoomService:
    """Test suite for RoomService."""

    async def test_create_room(self, room_service):
        """Test creating a new room."""
        room_name = "Sprint 42 Planning"
        creator_name = "Alice"

        room_id, user_id, room = await room_service.create_room(room_name, creator_name)

        assert room.id == room_id
        assert room.name == room_name
        assert room.state == RoomState.VOTING
        assert user_id in room.users
        assert room.users[user_id].name == creator_name
        assert room.users[user_id].has_voted is False

    async def test_join_room_success(self, room_service):
        """Test joining an existing room."""
        room_id, creator_id, _ = await room_service.create_room("Test Room", "Alice")

        user_id, room = await room_service.join_room(room_id, "Bob")

        assert user_id != creator_id
        assert user_id in room.users
        assert room.users[user_id].name == "Bob"
        assert room.users[user_id].has_voted is False
        assert len(room.users) == 2

    async def test_join_room_not_found(self, room_service):
        """Test joining non-existent room."""
        fake_room_id = uuid4()

        with pytest.raises(ValueError, match="Room not found"):
            await room_service.join_room(fake_room_id, "Bob")

    async def test_get_room_voting_state(self, room_service):
        """Test getting room in voting state filters votes."""
        room_id, user1_id, _ = await room_service.create_room("Test Room", "Alice")
        user2_id, _ = await room_service.join_room(room_id, "Bob")

        await room_service.vote(room_id, user1_id, 5)

        room_state = await room_service.get_room(room_id, user2_id)

        assert room_state.state == RoomState.VOTING
        assert "has_voted" in room_state.users[user1_id].model_dump()
        assert room_state.users[user1_id].has_voted is True
        assert room_state.users[user2_id].has_voted is False

    async def test_get_room_complete_state(self, room_service):
        """Test getting room in complete state shows votes."""
        room_id, user1_id, _ = await room_service.create_room("Test Room", "Alice")
        user2_id, _ = await room_service.join_room(room_id, "Bob")

        await room_service.vote(room_id, user1_id, 5)
        await room_service.vote(room_id, user2_id, 8)
        await room_service.reveal(room_id, user1_id)

        room_state = await room_service.get_room(room_id, user1_id)

        assert room_state.state == RoomState.COMPLETE
        assert room_state.users[user1_id].vote == 5
        assert room_state.users[user2_id].vote == 8

    async def test_get_room_not_found(self, room_service):
        """Test getting non-existent room."""
        fake_room_id = uuid4()
        fake_user_id = str(uuid4())

        with pytest.raises(ValueError, match="Room not found"):
            await room_service.get_room(fake_room_id, fake_user_id)

    async def test_get_room_user_not_in_room(self, room_service):
        """Test getting room with user not in room."""
        room_id, _, _ = await room_service.create_room("Test Room", "Alice")
        fake_user_id = str(uuid4())

        with pytest.raises(ValueError, match="User not in room"):
            await room_service.get_room(room_id, fake_user_id)

    async def test_vote_success(self, room_service):
        """Test submitting a vote."""
        room_id, user_id, _ = await room_service.create_room("Test Room", "Alice")

        room = await room_service.vote(room_id, user_id, 5)

        assert room.users[user_id].has_voted is True

        full_room = await room_service._get_room_from_redis(room_id)
        assert full_room.users[user_id].vote == 5

    async def test_vote_update_existing(self, room_service):
        """Test updating an existing vote."""
        room_id, user_id, _ = await room_service.create_room("Test Room", "Alice")

        await room_service.vote(room_id, user_id, 5)
        room = await room_service.vote(room_id, user_id, 8)

        full_room = await room_service._get_room_from_redis(room_id)
        assert full_room.users[user_id].vote == 8

    async def test_vote_invalid_value(self, room_service):
        """Test voting with invalid Fibonacci number."""
        room_id, user_id, _ = await room_service.create_room("Test Room", "Alice")

        with pytest.raises(ValueError, match="Invalid vote value"):
            await room_service.vote(room_id, user_id, 7)

    async def test_vote_in_complete_state(self, room_service):
        """Test voting when room is in complete state."""
        room_id, user_id, _ = await room_service.create_room("Test Room", "Alice")
        await room_service.vote(room_id, user_id, 5)
        await room_service.reveal(room_id, user_id)

        with pytest.raises(ValueError, match="Cannot vote in complete state"):
            await room_service.vote(room_id, user_id, 8)

    async def test_vote_user_not_in_room(self, room_service):
        """Test voting with user not in room."""
        room_id, _, _ = await room_service.create_room("Test Room", "Alice")
        fake_user_id = str(uuid4())

        with pytest.raises(ValueError, match="User not in room"):
            await room_service.vote(room_id, fake_user_id, 5)

    async def test_reveal_success(self, room_service):
        """Test revealing votes."""
        room_id, user_id, _ = await room_service.create_room("Test Room", "Alice")
        await room_service.vote(room_id, user_id, 5)

        room = await room_service.reveal(room_id, user_id)

        assert room.state == RoomState.COMPLETE
        assert room.users[user_id].vote == 5

    async def test_reveal_already_complete(self, room_service):
        """Test revealing when already in complete state."""
        room_id, user_id, _ = await room_service.create_room("Test Room", "Alice")
        await room_service.reveal(room_id, user_id)

        with pytest.raises(ValueError, match="Room already in complete state"):
            await room_service.reveal(room_id, user_id)

    async def test_reveal_user_not_in_room(self, room_service):
        """Test revealing with user not in room."""
        room_id, _, _ = await room_service.create_room("Test Room", "Alice")
        fake_user_id = str(uuid4())

        with pytest.raises(ValueError, match="User not in room"):
            await room_service.reveal(room_id, fake_user_id)

    async def test_reset_success(self, room_service):
        """Test resetting room for new voting round."""
        room_id, user1_id, _ = await room_service.create_room("Test Room", "Alice")
        user2_id, _ = await room_service.join_room(room_id, "Bob")

        await room_service.vote(room_id, user1_id, 5)
        await room_service.vote(room_id, user2_id, 8)
        await room_service.reveal(room_id, user1_id)

        room = await room_service.reset(room_id, user1_id)

        assert room.state == RoomState.VOTING
        assert room.users[user1_id].has_voted is False
        assert room.users[user2_id].has_voted is False

        full_room = await room_service._get_room_from_redis(room_id)
        assert full_room.users[user1_id].vote is None
        assert full_room.users[user2_id].vote is None

    async def test_reset_user_not_in_room(self, room_service):
        """Test resetting with user not in room."""
        room_id, _, _ = await room_service.create_room("Test Room", "Alice")
        fake_user_id = str(uuid4())

        with pytest.raises(ValueError, match="User not in room"):
            await room_service.reset(room_id, fake_user_id)

    async def test_room_ttl_set(self, room_service, redis_client):
        """Test that room has 48-hour TTL in Redis."""
        room_id, _, _ = await room_service.create_room("Test Room", "Alice")

        ttl = await redis_client.ttl(f"room:{room_id}")

        assert 172700 < ttl <= 172800

    async def test_multiple_users_voting(self, room_service):
        """Test multiple users voting in a room."""
        room_id, user1_id, _ = await room_service.create_room("Test Room", "Alice")
        user2_id, _ = await room_service.join_room(room_id, "Bob")
        user3_id, _ = await room_service.join_room(room_id, "Charlie")

        await room_service.vote(room_id, user1_id, 5)
        await room_service.vote(room_id, user2_id, 8)
        await room_service.vote(room_id, user3_id, 5)

        room_state = await room_service.get_room(room_id, user1_id)

        assert len(room_state.users) == 3
        assert all(user.has_voted for user in room_state.users.values())

        complete_room = await room_service.reveal(room_id, user1_id)
        assert complete_room.users[user1_id].vote == 5
        assert complete_room.users[user2_id].vote == 8
        assert complete_room.users[user3_id].vote == 5

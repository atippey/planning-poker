import json
from datetime import UTC, datetime
from typing import Union
from uuid import UUID, uuid4

import redis.asyncio as redis

from models.room import (
    VALID_FIBONACCI,
    Room,
    RoomCompleteState,
    RoomState,
    RoomVotingState,
    User,
    UserWithVote,
    UserWithVoteStatus,
)


class RoomService:
    """Service for managing planning poker rooms."""

    ROOM_TTL = 172800  # 48 hours in seconds

    def __init__(self, redis_client: redis.Redis):
        """Initialize room service with Redis client."""
        self.redis = redis_client

    async def create_room(
        self, room_name: str, creator_name: str
    ) -> tuple[UUID, str, RoomVotingState]:
        """Create a new planning poker room.

        Args:
            room_name: Name of the room
            creator_name: Name of the room creator

        Returns:
            Tuple of (room_id, user_id, room_state)
        """
        room_id = uuid4()
        user_id = str(uuid4())

        room = Room(
            id=room_id,
            name=room_name,
            state=RoomState.VOTING,
            created_at=datetime.now(UTC),
            users={
                user_id: User(name=creator_name, vote=None)
            }
        )

        await self._save_room(room)

        return room_id, user_id, self._to_voting_state(room)

    async def join_room(self, room_id: UUID, user_name: str) -> tuple[str, Union[RoomVotingState, RoomCompleteState]]:
        """Join an existing room.

        Args:
            room_id: ID of the room to join
            user_name: Name of the user joining

        Returns:
            Tuple of (user_id, room_state)

        Raises:
            ValueError: If room not found
        """
        room = await self._get_room_from_redis(room_id)
        if room is None:
            raise ValueError("Room not found")

        user_id = str(uuid4())
        room.users[user_id] = User(name=user_name, vote=None)

        await self._save_room(room)

        if room.state == RoomState.VOTING:
            return user_id, self._to_voting_state(room)
        else:
            return user_id, self._to_complete_state(room)

    async def get_room(
        self, room_id: UUID, user_id: str
    ) -> Union[RoomVotingState, RoomCompleteState]:
        """Get current room state.

        Args:
            room_id: ID of the room
            user_id: ID of the requesting user

        Returns:
            Room state (filtered based on state)

        Raises:
            ValueError: If room not found or user not in room
        """
        room = await self._get_room_from_redis(room_id)
        if room is None:
            raise ValueError("Room not found")

        if user_id not in room.users:
            raise ValueError("User not in room")

        if room.state == RoomState.VOTING:
            return self._to_voting_state(room)
        else:
            return self._to_complete_state(room)

    async def vote(self, room_id: UUID, user_id: str, vote: int) -> RoomVotingState:
        """Submit or update a vote.

        Args:
            room_id: ID of the room
            user_id: ID of the user voting
            vote: Vote value (must be valid Fibonacci number)

        Returns:
            Updated room state

        Raises:
            ValueError: If invalid vote, room not found, user not in room, or voting not allowed
        """
        if vote not in VALID_FIBONACCI:
            raise ValueError(
                f"Invalid vote value. Must be Fibonacci: {VALID_FIBONACCI}"
            )

        room = await self._get_room_from_redis(room_id)
        if room is None:
            raise ValueError("Room not found")

        if user_id not in room.users:
            raise ValueError("User not in room")

        if room.state == RoomState.COMPLETE:
            raise ValueError("Cannot vote in complete state")

        room.users[user_id].vote = vote
        await self._save_room(room)

        return self._to_voting_state(room)

    async def reveal(self, room_id: UUID, user_id: str) -> RoomCompleteState:
        """Reveal all votes and transition to complete state.

        Args:
            room_id: ID of the room
            user_id: ID of the user requesting reveal

        Returns:
            Room state with revealed votes

        Raises:
            ValueError: If room not found, user not in room, or already complete
        """
        room = await self._get_room_from_redis(room_id)
        if room is None:
            raise ValueError("Room not found")

        if user_id not in room.users:
            raise ValueError("User not in room")

        if room.state == RoomState.COMPLETE:
            raise ValueError("Room already in complete state")

        room.state = RoomState.COMPLETE
        await self._save_room(room)

        return self._to_complete_state(room)

    async def reset(self, room_id: UUID, user_id: str) -> RoomVotingState:
        """Reset room for a new voting round.

        Args:
            room_id: ID of the room
            user_id: ID of the user requesting reset

        Returns:
            Room state with votes cleared

        Raises:
            ValueError: If room not found or user not in room
        """
        room = await self._get_room_from_redis(room_id)
        if room is None:
            raise ValueError("Room not found")

        if user_id not in room.users:
            raise ValueError("User not in room")

        room.state = RoomState.VOTING
        for user in room.users.values():
            user.vote = None

        await self._save_room(room)

        return self._to_voting_state(room)

    async def _get_room_from_redis(self, room_id: UUID) -> Room | None:
        """Get room document from Redis.

        Args:
            room_id: ID of the room

        Returns:
            Room object or None if not found
        """
        key = f"room:{room_id}"
        data = await self.redis.get(key)

        if data is None:
            return None

        room_dict = json.loads(data)
        return Room(**room_dict)

    async def _save_room(self, room: Room) -> None:
        """Save room document to Redis with TTL.

        Args:
            room: Room object to save
        """
        key = f"room:{room.id}"
        data = room.model_dump_json()
        await self.redis.setex(key, self.ROOM_TTL, data)

    def _to_voting_state(self, room: Room) -> RoomVotingState:
        """Convert Room to RoomVotingState (votes hidden).

        Args:
            room: Full room object

        Returns:
            Room state with vote status only
        """
        users_with_status = {
            user_id: UserWithVoteStatus(
                name=user.name,
                has_voted=user.vote is not None
            )
            for user_id, user in room.users.items()
        }

        return RoomVotingState(
            id=room.id,
            name=room.name,
            state=room.state,
            created_at=room.created_at,
            users=users_with_status
        )

    def _to_complete_state(self, room: Room) -> RoomCompleteState:
        """Convert Room to RoomCompleteState (votes revealed).

        Args:
            room: Full room object

        Returns:
            Room state with all votes
        """
        users_with_votes = {
            user_id: UserWithVote(
                name=user.name,
                vote=user.vote
            )
            for user_id, user in room.users.items()
        }

        return RoomCompleteState(
            id=room.id,
            name=room.name,
            state=room.state,
            created_at=room.created_at,
            users=users_with_votes
        )

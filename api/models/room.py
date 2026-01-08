from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class RoomState(str, Enum):
    """Room state enum."""

    VOTING = "voting"
    COMPLETE = "complete"


class Deck(str, Enum):
    """Deck type for voting."""

    FIBONACCI = "fibonacci"
    ORDINAL = "ordinal"


VALID_FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
VALID_ORDINAL = list(range(0, 11))
VALID_VOTES = set(VALID_FIBONACCI + VALID_ORDINAL)


class User(BaseModel):
    """User in a room."""

    name: str = Field(..., max_length=50)
    vote: int | None = None

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, v: int | None) -> int | None:
        if v is not None and v not in VALID_VOTES:
            raise ValueError(f"Vote must be one of {sorted(VALID_VOTES)}")
        return v


class UserWithVoteStatus(BaseModel):
    """User with vote status for voting state."""

    name: str
    has_voted: bool


class UserWithVote(BaseModel):
    """User with revealed vote for complete state."""

    name: str
    vote: int | None


class Room(BaseModel):
    """Full room document stored in Redis."""

    id: UUID
    name: str = Field(..., max_length=100)
    state: RoomState
    deck: Deck
    created_at: datetime
    users: dict[str, User]


class RoomVotingState(BaseModel):
    """Room state response during voting (votes hidden)."""

    id: UUID
    name: str
    state: RoomState
    deck: Deck
    created_at: datetime
    users: dict[str, UserWithVoteStatus]


class RoomCompleteState(BaseModel):
    """Room state response when complete (votes revealed)."""

    id: UUID
    name: str
    state: RoomState
    deck: Deck
    created_at: datetime
    users: dict[str, UserWithVote]


class CreateRoomRequest(BaseModel):
    """Request to create a new room."""

    name: str = Field(..., max_length=100)
    creator_name: str = Field(..., max_length=50)
    deck: Deck = Deck.FIBONACCI


class CreateRoomResponse(BaseModel):
    """Response after creating a room."""

    room_id: UUID
    user_id: str
    room: RoomVotingState


class JoinRoomRequest(BaseModel):
    """Request to join an existing room."""

    name: str = Field(..., max_length=50)


class JoinRoomResponse(BaseModel):
    """Response after joining a room."""

    user_id: str
    room: RoomVotingState | RoomCompleteState


class VoteRequest(BaseModel):
    """Request to submit a vote."""

    user_id: str
    vote: int

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, v: int) -> int:
        if v not in VALID_VOTES:
            raise ValueError(f"Vote must be one of {sorted(VALID_VOTES)}")
        return v


class VoteResponse(BaseModel):
    """Response after submitting a vote."""

    success: bool
    room: RoomVotingState


class RevealRequest(BaseModel):
    """Request to reveal votes."""

    user_id: str


class RevealResponse(BaseModel):
    """Response after revealing votes."""

    success: bool
    room: RoomCompleteState


class ResetRequest(BaseModel):
    """Request to reset room for new voting round."""

    user_id: str


class ResetResponse(BaseModel):
    """Response after resetting room."""

    success: bool
    room: RoomVotingState


class ErrorResponse(BaseModel):
    """Error response."""

    error: str

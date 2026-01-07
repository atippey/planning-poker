from typing import Union
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from db.redis_client import get_redis
from models.room import (
    CreateRoomRequest,
    CreateRoomResponse,
    ErrorResponse,
    JoinRoomRequest,
    JoinRoomResponse,
    ResetRequest,
    ResetResponse,
    RevealRequest,
    RevealResponse,
    RoomCompleteState,
    RoomVotingState,
    VoteRequest,
    VoteResponse,
)
from services.room_service import RoomService

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])


@router.post(
    "",
    response_model=CreateRoomResponse,
    status_code=status.HTTP_201_CREATED,
    responses={422: {"model": ErrorResponse}}
)
async def create_room(
    request: CreateRoomRequest,
    redis=Depends(get_redis)
) -> CreateRoomResponse:
    """Create a new planning poker room."""
    service = RoomService(redis)
    room_id, user_id, room = await service.create_room(
        request.name,
        request.creator_name
    )

    return CreateRoomResponse(
        room_id=room_id,
        user_id=user_id,
        room=room
    )


@router.post(
    "/{room_id}/join",
    response_model=JoinRoomResponse,
    responses={
        404: {"model": ErrorResponse}
    }
)
async def join_room(
    room_id: UUID,
    request: JoinRoomRequest,
    redis=Depends(get_redis)
) -> JoinRoomResponse:
    """Join an existing room."""
    service = RoomService(redis)

    try:
        user_id, room = await service.join_room(room_id, request.name)
        return JoinRoomResponse(user_id=user_id, room=room)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": str(e)}
            )
        raise


@router.get(
    "/{room_id}",
    response_model=Union[RoomVotingState, RoomCompleteState],
    responses={404: {"model": ErrorResponse}}
)
async def get_room(
    room_id: UUID,
    user_id: str,
    redis=Depends(get_redis)
) -> Union[RoomVotingState, RoomCompleteState]:
    """Get current room state."""
    service = RoomService(redis)

    try:
        return await service.get_room(room_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post(
    "/{room_id}/vote",
    response_model=VoteResponse,
    responses={
        400: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse}
    }
)
async def submit_vote(
    room_id: UUID,
    request: VoteRequest,
    redis=Depends(get_redis)
) -> VoteResponse:
    """Submit or update a vote."""
    service = RoomService(redis)

    try:
        room = await service.vote(room_id, request.user_id, request.vote)
        return VoteResponse(success=True, room=room)
    except ValueError as e:
        error_msg = str(e)
        if "Invalid vote" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        elif "Cannot vote in complete state" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        elif "not found" in error_msg or "not in room" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        raise


@router.post(
    "/{room_id}/reveal",
    response_model=RevealResponse,
    responses={
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse}
    }
)
async def reveal_votes(
    room_id: UUID,
    request: RevealRequest,
    redis=Depends(get_redis)
) -> RevealResponse:
    """Reveal all votes."""
    service = RoomService(redis)

    try:
        room = await service.reveal(room_id, request.user_id)
        return RevealResponse(success=True, room=room)
    except ValueError as e:
        error_msg = str(e)
        if "already in complete state" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        elif "not found" in error_msg or "not in room" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        raise


@router.post(
    "/{room_id}/reset",
    response_model=ResetResponse,
    responses={404: {"model": ErrorResponse}}
)
async def reset_room(
    room_id: UUID,
    request: ResetRequest,
    redis=Depends(get_redis)
) -> ResetResponse:
    """Reset room for new voting round."""
    service = RoomService(redis)

    try:
        room = await service.reset(room_id, request.user_id)
        return ResetResponse(success=True, room=room)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

export type RoomState = 'voting' | 'complete';
export type Deck = 'fibonacci' | 'ordinal';

export const VALID_FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;
export const VALID_ORDINAL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type FibonacciValue = (typeof VALID_FIBONACCI)[number];
export type OrdinalValue = (typeof VALID_ORDINAL)[number];
export type VoteValue = FibonacciValue | OrdinalValue;

export interface User {
  name: string;
  vote: VoteValue | null;
}

export interface UserWithVoteStatus {
  name: string;
  has_voted: boolean;
}

export interface UserWithVote {
  name: string;
  vote: VoteValue | null;
}

export interface Room {
  id: string;
  name: string;
  state: RoomState;
  deck: Deck;
  created_at: string;
  users: Record<string, User>;
}

export interface RoomVotingState {
  id: string;
  name: string;
  state: 'voting';
  deck: Deck;
  created_at: string;
  users: Record<string, UserWithVoteStatus>;
}

export interface RoomCompleteState {
  id: string;
  name: string;
  state: 'complete';
  deck: Deck;
  created_at: string;
  users: Record<string, UserWithVote>;
}

export type RoomStateResponse = RoomVotingState | RoomCompleteState;

export interface CreateRoomRequest {
  name: string;
  creator_name: string;
  deck: Deck;
}

export interface CreateRoomResponse {
  room_id: string;
  user_id: string;
  room: RoomVotingState;
}

export interface JoinRoomRequest {
  name: string;
}

export interface JoinRoomResponse {
  user_id: string;
  room: RoomStateResponse;
}

export interface VoteRequest {
  user_id: string;
  vote: VoteValue;
}

export interface VoteResponse {
  success: boolean;
  room: RoomVotingState;
}

export interface RevealRequest {
  user_id: string;
}

export interface RevealResponse {
  success: boolean;
  room: RoomCompleteState;
}

export interface ResetRequest {
  user_id: string;
}

export interface ResetResponse {
  success: boolean;
  room: RoomVotingState;
}

export interface VoteStatistics {
  average: number;
  median: number;
  min: VoteValue;
  max: VoteValue;
  votes: Array<{ userId: string; userName: string; vote: VoteValue }>;
}

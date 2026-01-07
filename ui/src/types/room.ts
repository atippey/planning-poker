export type RoomState = 'voting' | 'complete';

export const VALID_FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;
export type FibonacciValue = (typeof VALID_FIBONACCI)[number];

export interface User {
  name: string;
  vote: FibonacciValue | null;
}

export interface UserWithVoteStatus {
  name: string;
  has_voted: boolean;
}

export interface UserWithVote {
  name: string;
  vote: FibonacciValue | null;
}

export interface Room {
  id: string;
  name: string;
  state: RoomState;
  created_at: string;
  users: Record<string, User>;
}

export interface RoomVotingState {
  id: string;
  name: string;
  state: 'voting';
  created_at: string;
  users: Record<string, UserWithVoteStatus>;
}

export interface RoomCompleteState {
  id: string;
  name: string;
  state: 'complete';
  created_at: string;
  users: Record<string, UserWithVote>;
}

export type RoomStateResponse = RoomVotingState | RoomCompleteState;

export interface CreateRoomRequest {
  name: string;
  creator_name: string;
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
  vote: FibonacciValue;
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
  min: FibonacciValue;
  max: FibonacciValue;
  votes: Array<{ userId: string; userName: string; vote: FibonacciValue }>;
}

import axios, { AxiosInstance } from 'axios';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  Deck,
  VoteValue,
  JoinRoomRequest,
  JoinRoomResponse,
  ResetResponse,
  RevealResponse,
  RoomStateResponse,
  VoteResponse,
} from '../types/room';

class PlanningPokerApi {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.REACT_APP_API_BASE_URL || '') {
    // Use window.location.origin if no base URL specified (works when UI and API are on same host via ingress)
    // In docker-compose, REACT_APP_API_BASE_URL will be set to http://localhost:8000
    const apiBase = baseURL || window.location.origin;
    this.client = axios.create({
      baseURL: `${apiBase}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createRoom(name: string, creatorName: string, deck: Deck = 'fibonacci'): Promise<CreateRoomResponse> {
    const request: CreateRoomRequest = {
      name,
      creator_name: creatorName,
      deck,
    };
    const response = await this.client.post<CreateRoomResponse>('/rooms', request);
    return response.data;
  }

  async joinRoom(roomId: string, userName: string): Promise<JoinRoomResponse> {
    const request: JoinRoomRequest = {
      name: userName,
    };
    const response = await this.client.post<JoinRoomResponse>(
      `/rooms/${roomId}/join`,
      request
    );
    return response.data;
  }

  async getRoomState(roomId: string, userId: string): Promise<RoomStateResponse> {
    const response = await this.client.get<RoomStateResponse>(`/rooms/${roomId}`, {
      params: { user_id: userId },
    });
    return response.data;
  }

  async submitVote(roomId: string, userId: string, vote: VoteValue): Promise<VoteResponse> {
    const response = await this.client.post<VoteResponse>(`/rooms/${roomId}/vote`, {
      user_id: userId,
      vote,
    });
    return response.data;
  }

  async revealVotes(roomId: string, userId: string): Promise<RevealResponse> {
    const response = await this.client.post<RevealResponse>(`/rooms/${roomId}/reveal`, {
      user_id: userId,
    });
    return response.data;
  }

  async resetRoom(roomId: string, userId: string): Promise<ResetResponse> {
    const response = await this.client.post<ResetResponse>(`/rooms/${roomId}/reset`, {
      user_id: userId,
    });
    return response.data;
  }
}

export const api = new PlanningPokerApi();
export default api;

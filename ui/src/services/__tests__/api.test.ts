import axios from 'axios';
import { api } from '../api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockClient = {
  post: jest.fn(),
  get: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('PlanningPokerApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockClient);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).client = mockClient;
  });

  describe('createRoom', () => {
    it('should create a room with correct payload', async () => {
      const mockResponse = {
        data: {
          room_id: 'room-123',
          user_id: 'user-456',
          room: {
            id: 'room-123',
            name: 'Test Room',
            state: 'voting' as const,
            created_at: '2026-01-07T10:00:00Z',
            users: {},
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await api.createRoom('Test Room', 'Alice');

      expect(mockClient.post).toHaveBeenCalledWith('/rooms', {
        name: 'Test Room',
        creator_name: 'Alice',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('joinRoom', () => {
    it('should join a room with correct payload', async () => {
      const mockResponse = {
        data: {
          user_id: 'user-789',
          room: {
            id: 'room-123',
            name: 'Test Room',
            state: 'voting' as const,
            created_at: '2026-01-07T10:00:00Z',
            users: {},
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await api.joinRoom('room-123', 'Bob');

      expect(mockClient.post).toHaveBeenCalledWith('/rooms/room-123/join', {
        name: 'Bob',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getRoomState', () => {
    it('should fetch room state with query params', async () => {
      const mockResponse = {
        data: {
          id: 'room-123',
          name: 'Test Room',
          state: 'voting' as const,
          created_at: '2026-01-07T10:00:00Z',
          users: {},
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await api.getRoomState('room-123', 'user-456');

      expect(mockClient.get).toHaveBeenCalledWith('/rooms/room-123', {
        params: { user_id: 'user-456' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('submitVote', () => {
    it('should submit vote with correct payload', async () => {
      const mockResponse = {
        data: {
          success: true,
          room: {
            id: 'room-123',
            name: 'Test Room',
            state: 'voting' as const,
            created_at: '2026-01-07T10:00:00Z',
            users: {},
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await api.submitVote('room-123', 'user-456', 5);

      expect(mockClient.post).toHaveBeenCalledWith('/rooms/room-123/vote', {
        user_id: 'user-456',
        vote: 5,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('revealVotes', () => {
    it('should reveal votes with correct payload', async () => {
      const mockResponse = {
        data: {
          success: true,
          room: {
            id: 'room-123',
            name: 'Test Room',
            state: 'complete' as const,
            created_at: '2026-01-07T10:00:00Z',
            users: {},
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await api.revealVotes('room-123', 'user-456');

      expect(mockClient.post).toHaveBeenCalledWith('/rooms/room-123/reveal', {
        user_id: 'user-456',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resetRoom', () => {
    it('should reset room with correct payload', async () => {
      const mockResponse = {
        data: {
          success: true,
          room: {
            id: 'room-123',
            name: 'Test Room',
            state: 'voting' as const,
            created_at: '2026-01-07T10:00:00Z',
            users: {},
          },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await api.resetRoom('room-123', 'user-456');

      expect(mockClient.post).toHaveBeenCalledWith('/rooms/room-123/reset', {
        user_id: 'user-456',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});

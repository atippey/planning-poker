import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinRoom from '../JoinRoom';
import api from '../../services/api';

jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('JoinRoom', () => {
  const mockOnRoomJoined = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<JoinRoom onRoomJoined={mockOnRoomJoined} />);

    expect(screen.getByLabelText(/room id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
  });

  it('should disable submit button when fields are empty', () => {
    render(<JoinRoom onRoomJoined={mockOnRoomJoined} />);

    const submitButton = screen.getByRole('button', { name: /join room/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when fields are filled', () => {
    render(<JoinRoom onRoomJoined={mockOnRoomJoined} />);

    fireEvent.change(screen.getByLabelText(/room id/i), {
      target: { value: 'room-123' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Bob' },
    });

    const submitButton = screen.getByRole('button', { name: /join room/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onRoomJoined when room is joined successfully', async () => {
    mockedApi.joinRoom.mockResolvedValue({
      user_id: 'user-789',
      room: {
        id: 'room-123',
        name: 'Sprint 42',
        state: 'voting',
        created_at: '2026-01-07T10:00:00Z',
        deck: 'fibonacci',
        users: {},
      },
    });

    render(<JoinRoom onRoomJoined={mockOnRoomJoined} />);

    fireEvent.change(screen.getByLabelText(/room id/i), {
      target: { value: 'room-123' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Bob' },
    });

    fireEvent.click(screen.getByRole('button', { name: /join room/i }));

    await waitFor(() => {
      expect(mockedApi.joinRoom).toHaveBeenCalledWith('room-123', 'Bob');
      expect(mockOnRoomJoined).toHaveBeenCalledWith('room-123', 'user-789', 'Bob');
    });
  });

  it('should show error when room is not found', async () => {
    mockedApi.joinRoom.mockRejectedValue(new Error('Not found'));

    render(<JoinRoom onRoomJoined={mockOnRoomJoined} />);

    fireEvent.change(screen.getByLabelText(/room id/i), {
      target: { value: 'invalid-room' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Bob' },
    });

    fireEvent.click(screen.getByRole('button', { name: /join room/i }));

    await waitFor(() => {
      expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    });
  });
});

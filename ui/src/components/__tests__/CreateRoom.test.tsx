import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateRoom from '../CreateRoom';
import api from '../../services/api';

jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('CreateRoom', () => {
  const mockOnRoomCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<CreateRoom onRoomCreated={mockOnRoomCreated} />);

    expect(screen.getByLabelText(/room name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
  });

  it('should disable submit button when fields are empty', () => {
    render(<CreateRoom onRoomCreated={mockOnRoomCreated} />);

    const submitButton = screen.getByRole('button', { name: /create room/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when fields are filled', () => {
    render(<CreateRoom onRoomCreated={mockOnRoomCreated} />);

    fireEvent.change(screen.getByLabelText(/room name/i), {
      target: { value: 'Sprint 42' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alice' },
    });

    const submitButton = screen.getByRole('button', { name: /create room/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onRoomCreated when room is created successfully', async () => {
    mockedApi.createRoom.mockResolvedValue({
      room_id: 'room-123',
      user_id: 'user-456',
      room: {
        id: 'room-123',
        name: 'Sprint 42',
        state: 'voting',
        created_at: '2026-01-07T10:00:00Z',
        deck: 'fibonacci',
        users: {},
      },
    });

    render(<CreateRoom onRoomCreated={mockOnRoomCreated} />);

    fireEvent.change(screen.getByLabelText(/room name/i), {
      target: { value: 'Sprint 42' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => {
      expect(mockedApi.createRoom).toHaveBeenCalledWith('Sprint 42', 'Alice', 'fibonacci');
      expect(mockOnRoomCreated).toHaveBeenCalledWith('room-123', 'user-456', 'Alice');
    });
  });

  it('should allow selecting ordinal deck', async () => {
    mockedApi.createRoom.mockResolvedValue({
      room_id: 'room-123',
      user_id: 'user-456',
      room: {
        id: 'room-123',
        name: 'Sprint 42',
        state: 'voting',
        created_at: '2026-01-07T10:00:00Z',
        deck: 'ordinal',
        users: {},
      },
    });

    render(<CreateRoom onRoomCreated={mockOnRoomCreated} />);

    fireEvent.change(screen.getByLabelText(/room name/i), {
      target: { value: 'Sprint 42' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByLabelText(/ordinal/i));
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => {
      expect(mockedApi.createRoom).toHaveBeenCalledWith('Sprint 42', 'Alice', 'ordinal');
      expect(mockOnRoomCreated).toHaveBeenCalledWith('room-123', 'user-456', 'Alice');
    });
  });

  it('should show error when room creation fails', async () => {
    mockedApi.createRoom.mockRejectedValue(new Error('Network error'));

    render(<CreateRoom onRoomCreated={mockOnRoomCreated} />);

    fireEvent.change(screen.getByLabelText(/room name/i), {
      target: { value: 'Sprint 42' },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alice' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create room/i)).toBeInTheDocument();
    });
  });
});

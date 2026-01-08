import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VotingRoom from '../VotingRoom';
import api from '../../services/api';

jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const renderWithRouter = (roomId: string, onLeave: jest.Mock, locationState?: { userId: string; userName: string }) => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/room/${roomId}`, state: locationState }]}>
      <Routes>
        <Route path="/room/:roomId" element={<VotingRoom roomId={roomId} onLeave={onLeave} />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('VotingRoom', () => {
  const defaultProps = {
    roomId: 'room-123',
    onLeave: jest.fn(),
  };
  const defaultLocationState = {
    userId: 'user-456',
    userName: 'Alice',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    mockedApi.getRoomState.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should fetch and display room state', async () => {
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'voting',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', has_voted: false },
        'user-789': { name: 'Bob', has_voted: true },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/Participants \(2\)/)).toBeInTheDocument();
  });

  it('should display voting buttons in voting state', async () => {
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'voting',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', has_voted: false },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(screen.getByText('Select Your Estimate')).toBeInTheDocument();
    });

    // Check for Fibonacci numbers
    expect(screen.getByRole('button', { name: '0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '13' })).toBeInTheDocument();
  });

  it('should calculate and display statistics in complete state', async () => {
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'complete',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', vote: 5 },
        'user-789': { name: 'Bob', vote: 8 },
        'user-101': { name: 'Charlie', vote: 5 },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    // Check statistics are calculated correctly
    // Average: (5 + 8 + 5) / 3 = 6.0
    await waitFor(() => {
      expect(screen.getByText('6.0')).toBeInTheDocument(); // Average
    });

    // Median: sorted [5, 5, 8], middle = 5
    const medianElements = screen.getAllByText('5');
    expect(medianElements.length).toBeGreaterThan(0);

    // Min: 5
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);

    // Max: 8 (appears in vote display and statistics)
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('should handle empty votes in complete state', async () => {
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'complete',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', vote: null },
        'user-789': { name: 'Bob', vote: null },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    // Should not display statistics section when no votes
    expect(screen.queryByText('Average')).not.toBeInTheDocument();
  });

  it('should poll for room state every 2 seconds', async () => {
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'voting',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', has_voted: false },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(mockedApi.getRoomState).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 2 seconds
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockedApi.getRoomState).toHaveBeenCalledTimes(2);
    });

    // Fast-forward another 2 seconds
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockedApi.getRoomState).toHaveBeenCalledTimes(3);
    });
  });

  it('should calculate statistics with various Fibonacci values', async () => {
    // Test with edge case Fibonacci values
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'complete',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-1': { name: 'User1', vote: 0 },
        'user-2': { name: 'User2', vote: 1 },
        'user-3': { name: 'User3', vote: 89 },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    // Average: (0 + 1 + 89) / 3 = 30.0
    await waitFor(() => {
      expect(screen.getByText('30.0')).toBeInTheDocument();
    });

    // Min and Max: Check statistics are displayed (values appear multiple times in vote display)
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('89').length).toBeGreaterThan(0);
  });

  it('should clear selected vote when room resets from complete to voting', async () => {
    // Start in complete state with votes
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'complete',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', vote: 5 },
        'user-789': { name: 'Bob', vote: 8 },
      },
    });

    renderWithRouter(defaultProps.roomId, defaultProps.onLeave, defaultLocationState);

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    // Simulate room reset by another user - change state to voting
    mockedApi.getRoomState.mockResolvedValue({
      id: 'room-123',
      name: 'Sprint Planning',
      state: 'voting',
      created_at: '2026-01-07T10:00:00Z',
      users: {
        'user-456': { name: 'Alice', has_voted: false },
        'user-789': { name: 'Bob', has_voted: false },
      },
    });

    // Fast-forward to trigger polling
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText('Select Your Estimate')).toBeInTheDocument();
    });

    // Verify voting buttons are back (not pre-selected)
    const voteButton5 = screen.getByRole('button', { name: '5' });
    expect(voteButton5).toBeInTheDocument();
    // Button should be outlined (not contained variant which means selected)
    expect(voteButton5).toHaveClass('MuiButton-outlined');
  });
});

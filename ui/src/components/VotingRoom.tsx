import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ShareIcon from '@mui/icons-material/Share';
import api from '../services/api';
import { VALID_FIBONACCI, FibonacciValue, RoomStateResponse } from '../types/room';

interface VotingRoomProps {
  roomId: string;
  onLeave: () => void;
}

export default function VotingRoom({ roomId, onLeave }: VotingRoomProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [roomState, setRoomState] = useState<RoomStateResponse | null>(null);
  const [selectedVote, setSelectedVote] = useState<FibonacciValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const state = location.state as { userId?: string; userName?: string } | null;
    const storedUserId = localStorage.getItem(`room_${roomId}_userId`);

    if (state?.userId) {
      setUserId(state.userId);
      localStorage.setItem(`room_${roomId}_userId`, state.userId);
      if (state.userName) {
        localStorage.setItem(`room_${roomId}_userName`, state.userName);
      }
    } else if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setShowJoinDialog(true);
    }
  }, [roomId, location.state]);

  const handleJoinRoom = async () => {
    if (!userName.trim()) return;

    setLoading(true);
    try {
      const response = await api.joinRoom(roomId, userName);
      setUserId(response.user_id);
      localStorage.setItem(`room_${roomId}_userId`, response.user_id);
      localStorage.setItem(`room_${roomId}_userName`, userName);
      setShowJoinDialog(false);
      setError(null);
    } catch (err) {
      setError('Failed to join room. Room may not exist.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomState = async () => {
    if (!userId) return;
    try {
      const state = await api.getRoomState(roomId, userId);
      setRoomState((prevState) => {
        // Clear selected vote when room resets to voting state
        if (prevState?.state === 'complete' && state.state === 'voting') {
          setSelectedVote(null);
        }
        return state;
      });
      setError(null);
    } catch (err) {
      setError('Failed to fetch room state');
    }
  };

  useEffect(() => {
    fetchRoomState();
    const interval = setInterval(fetchRoomState, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const handleVote = async (vote: FibonacciValue) => {
    if (!userId) return;
    setLoading(true);
    try {
      await api.submitVote(roomId, userId, vote);
      setSelectedVote(vote);
      await fetchRoomState();
    } catch (err) {
      setError('Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await api.revealVotes(roomId, userId);
      await fetchRoomState();
    } catch (err) {
      setError('Failed to reveal votes');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await api.resetRoom(roomId, userId);
      setSelectedVote(null);
      await fetchRoomState();
    } catch (err) {
      setError('Failed to reset room');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = async () => {
    const invitationUrl = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setSnackbarMessage('Invitation link copied to clipboard!');
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Failed to copy link');
      setSnackbarOpen(true);
    }
  };

  if (!roomState) {
    if (showJoinDialog) {
      return (
        <Dialog open={showJoinDialog} onClose={() => navigate('/')}>
          <DialogTitle>Join Room</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Your Name"
              fullWidth
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => navigate('/')}>Cancel</Button>
            <Button onClick={handleJoinRoom} disabled={loading || !userName.trim()} variant="contained">
              Join
            </Button>
          </DialogActions>
        </Dialog>
      );
    }
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const userList = Object.entries(roomState.users);
  const isVoting = roomState.state === 'voting';

  const calculateStats = () => {
    if (roomState.state !== 'complete') return null;

    const votes = Object.entries(roomState.users)
      .map(([, user]) => user.vote)
      .filter((v): v is FibonacciValue => v !== null);

    if (votes.length === 0) return null;

    const sorted = [...votes].sort((a, b) => a - b);
    const sum = votes.reduce((acc: number, v) => acc + v, 0);
    const average = sum / votes.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return { average, median, min: sorted[0], max: sorted[sorted.length - 1] };
  };

  const stats = calculateStats();

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            {roomState.name}
          </Typography>
          <Button
            size="small"
            startIcon={<ShareIcon />}
            onClick={copyInvitationLink}
            sx={{ textTransform: 'none' }}
          >
            Copy Invitation Link
          </Button>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ExitToAppIcon />}
          onClick={onLeave}
        >
          Leave Room
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isVoting && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select Your Estimate
            </Typography>
            <Grid container spacing={1}>
              {VALID_FIBONACCI.map((value) => (
                <Grid item key={value}>
                  <Button
                    variant={selectedVote === value ? 'contained' : 'outlined'}
                    onClick={() => handleVote(value)}
                    disabled={loading}
                    sx={{ minWidth: 60, height: 80, fontSize: '1.5rem' }}
                  >
                    {value}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Participants ({userList.length})
          </Typography>
          <Grid container spacing={1}>
            {userList.map(([userId, user]) => (
              <Grid item key={userId}>
                <Chip
                  label={user.name}
                  icon={
                    isVoting ? (
                      user.has_voted ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                  color={isVoting && user.has_voted ? 'primary' : 'default'}
                  variant={isVoting ? 'filled' : 'outlined'}
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {isVoting && (
        <Button
          variant="contained"
          color="secondary"
          startIcon={<VisibilityIcon />}
          onClick={handleReveal}
          disabled={loading}
          fullWidth
          size="large"
        >
          Reveal Votes
        </Button>
      )}

      {!isVoting && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Results
              </Typography>
              <Grid container spacing={2}>
                {userList.map(([userId, user]) => (
                  <Grid item xs={12} sm={6} md={4} key={userId}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {user.name}
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {user.vote ?? '-'}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {stats && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Average
                        </Typography>
                        <Typography variant="h5">{stats.average.toFixed(1)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Median
                        </Typography>
                        <Typography variant="h5">{stats.median}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Min
                        </Typography>
                        <Typography variant="h5">{stats.min}</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Max
                        </Typography>
                        <Typography variant="h5">{stats.max}</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>

          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            disabled={loading}
            fullWidth
            size="large"
          >
            Start New Round
          </Button>
        </>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

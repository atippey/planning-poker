import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import api from '../services/api';

interface JoinRoomProps {
  onRoomJoined: (roomId: string, userId: string, userName: string) => void;
}

export default function JoinRoom({ onRoomJoined }: JoinRoomProps) {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.joinRoom(roomId, userName);
      onRoomJoined(roomId, response.user_id, userName);
    } catch (err) {
      setError('Room not found. Please check the room ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Join Existing Room" />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            fullWidth
            helperText="Enter the room ID shared by the room creator"
          />
          <TextField
            label="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 50 }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
            disabled={loading || !roomId.trim() || !userName.trim()}
            fullWidth
          >
            Join Room
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

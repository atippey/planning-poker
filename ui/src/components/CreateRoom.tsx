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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';
import { Deck } from '../types/room';

interface CreateRoomProps {
  onRoomCreated: (roomId: string, userId: string, userName: string) => void;
}

export default function CreateRoom({ onRoomCreated }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [deck, setDeck] = useState<Deck>('fibonacci');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.createRoom(roomName, userName, deck);
      onRoomCreated(response.room_id, response.user_id, userName);
    } catch (err) {
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Create New Room" />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 100 }}
            helperText="Choose a name for your planning session"
          />
          <TextField
            label="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 50 }}
          />
          <FormControl component="fieldset">
            <FormLabel component="legend">Estimation deck</FormLabel>
            <RadioGroup
              row
              name="deck"
              value={deck}
              onChange={(e) => setDeck(e.target.value as Deck)}
            >
              <FormControlLabel value="fibonacci" control={<Radio />} label="Fibonacci" />
              <FormControlLabel value="ordinal" control={<Radio />} label="Ordinal" />
            </RadioGroup>
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            disabled={loading || !roomName.trim() || !userName.trim()}
            fullWidth
          >
            Create Room
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

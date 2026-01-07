import { useState } from 'react';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import VotingRoom from './components/VotingRoom';

interface RoomSession {
  roomId: string;
  userId: string;
  userName: string;
}

function App() {
  const [session, setSession] = useState<RoomSession | null>(null);

  const handleRoomCreated = (roomId: string, userId: string, userName: string) => {
    setSession({ roomId, userId, userName });
  };

  const handleRoomJoined = (roomId: string, userId: string, userName: string) => {
    setSession({ roomId, userId, userName });
  };

  const handleLeaveRoom = () => {
    setSession(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Planning Poker
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {!session ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
              mt: 4,
            }}
          >
            <CreateRoom onRoomCreated={handleRoomCreated} />
            <JoinRoom onRoomJoined={handleRoomJoined} />
          </Box>
        ) : (
          <VotingRoom
            roomId={session.roomId}
            userId={session.userId}
            onLeave={handleLeaveRoom}
          />
        )}
      </Container>
    </Box>
  );
}

export default App;

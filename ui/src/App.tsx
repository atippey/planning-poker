import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import CreateRoom from './components/CreateRoom';
import JoinRoom from './components/JoinRoom';
import VotingRoom from './components/VotingRoom';

function HomePage() {
  const navigate = useNavigate();

  const handleRoomCreated = (roomId: string, userId: string, userName: string) => {
    navigate(`/room/${roomId}`, { state: { userId, userName } });
  };

  const handleRoomJoined = (roomId: string, userId: string, userName: string) => {
    navigate(`/room/${roomId}`, { state: { userId, userName } });
  };

  return (
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
  );
}

function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const handleLeaveRoom = () => {
    navigate('/');
  };

  if (!roomId) {
    navigate('/');
    return null;
  }

  return <VotingRoom roomId={roomId} onLeave={handleLeaveRoom} />;
}

function App() {
  return (
    <BrowserRouter>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Planning Poker
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Routes>
        </Container>

        <Box component="footer" sx={{ py: 2 }}>
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              © 2025 atippey. MIT License.{' '}
              <Box
                component="a"
                href="https://github.com/atippey/planning-poker"
                target="_blank"
                rel="noreferrer"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                GitHub
              </Box>
            </Typography>
          </Container>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;

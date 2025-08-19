import React, { useEffect, useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Alert,
  Chip
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Dashboard from './components/Dashboard';
import wsService from './services/websocket';

// Dark theme for professional trading interface
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e676', // Green for profits
      dark: '#00c853',
      light: '#66ffa6',
    },
    secondary: {
      main: '#ff5722', // Red for losses
      dark: '#d84315',
      light: '#ff8a65',
    },
    background: {
      default: '#0a0a0a', // Very dark background
      paper: '#1a1a1a', // Slightly lighter for cards
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto Mono", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
    h6: {
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.9rem',
    },
    body2: {
      fontSize: '0.8rem',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Roboto Mono", monospace',
          fontSize: '0.75rem',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
        },
      },
    },
  },
});

function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsService.connect();

    // Listen for connection changes
    const unsubscribe = wsService.onConnectionChange((connected) => {
      setWsConnected(connected);
      if (connected) {
        setWsError(null);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'background.default' }}>
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <TrendingUpIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                Drift E3 Trading Dashboard
              </Typography>
              <Chip
                label={wsConnected ? 'LIVE' : 'OFFLINE'}
                color={wsConnected ? 'success' : 'error'}
                size="small"
                sx={{ ml: 2 }}
              />
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
            {wsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                WebSocket Error: {wsError}
              </Alert>
            )}

            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;

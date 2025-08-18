import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { Tune, Refresh, PlayArrow, Stop } from '@mui/icons-material';
import { OptimizationRun } from '../../types';
import ApiService from '../../services/api';
import wsService from '../../services/websocket';

interface OptimizationCardProps {
  onRefresh: () => void;
}

const OptimizationCard: React.FC<OptimizationCardProps> = ({ onRefresh }) => {
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [activeOptimizations, setActiveOptimizations] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOptimizationData();
    
    // Listen for optimization updates
    const unsubscribe = wsService.onOptimizationUpdate((data) => {
      // Update active optimizations with progress
      setActiveOptimizations(prev => 
        prev.map(opt => ({
          ...opt,
          progress: data.progress || opt.progress,
          completedCombinations: data.completedSets || opt.completedCombinations,
          totalCombinations: data.totalParameterSets || opt.totalCombinations,
        }))
      );
    });

    return unsubscribe;
  }, []);

  const loadOptimizationData = async () => {
    try {
      setLoading(true);
      const [history, active] = await Promise.all([
        ApiService.getOptimizationHistory(),
        ApiService.getActiveOptimizations(),
      ]);
      setOptimizationHistory(history);
      setActiveOptimizations(active);
      setError(null);
    } catch (err) {
      setError('Failed to load optimization data');
    } finally {
      setLoading(false);
    }
  };

  const startOptimization = async () => {
    try {
      setLoading(true);
      await ApiService.startOptimization({
        strategy: 'E3',
        config: {},
        startDate: '20231001',
        endDate: '20231230',
        market: 'SOL-PERP'
      });
      await loadOptimizationData();
    } catch (err) {
      setError('Failed to start optimization');
    } finally {
      setLoading(false);
    }
  };

  const stopOptimization = async (id: string) => {
    try {
      await ApiService.stopOptimization(id);
      await loadOptimizationData();
    } catch (err) {
      setError('Failed to stop optimization');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'stopped': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <Tune sx={{ mr: 1, color: 'primary.main' }} />
            Optimization Control
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={loadOptimizationData} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Active Optimizations */}
        {activeOptimizations.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Active Optimizations
            </Typography>
            {activeOptimizations.map((opt) => (
              <Box key={opt.id} mb={2} p={2} bgcolor="background.paper" borderRadius={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">
                    {opt.config.strategy} - {opt.config.market}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={opt.status.toUpperCase()} 
                      color={getStatusColor(opt.status)}
                      size="small"
                    />
                    {opt.status === 'running' && (
                      <IconButton 
                        size="small" 
                        onClick={() => stopOptimization(opt.id)}
                        color="error"
                      >
                        <Stop />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                
                {opt.status === 'running' && (
                  <Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={opt.progress} 
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {opt.completedCombinations} / {opt.totalCombinations} combinations ({opt.progress.toFixed(1)}%)
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Start New Optimization */}
        <Box mb={3}>
          <Button
            variant="contained"
            onClick={startOptimization}
            disabled={loading || activeOptimizations.some(opt => opt.status === 'running')}
            startIcon={<PlayArrow />}
            fullWidth
          >
            Start New Optimization
          </Button>
        </Box>

        {/* Optimization History */}
        <Typography variant="subtitle2" gutterBottom>
          Recent Optimizations
        </Typography>
        
        {optimizationHistory.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No optimization history available
          </Typography>
        ) : (
          <List dense>
            {optimizationHistory.slice(0, 5).map((opt, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {opt.strategy} - {formatDate(opt.timestamp)}
                      </Typography>
                      <Chip 
                        label={opt.status.toUpperCase()} 
                        color={getStatusColor(opt.status)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      Progress: {opt.progress.toFixed(1)}% • Results: {opt.results}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizationCard;

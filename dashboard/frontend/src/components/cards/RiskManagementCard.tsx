import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import { Security, Warning, Emergency } from '@mui/icons-material';
import { PerformanceMetrics, SystemStatus } from '../../types';

interface RiskManagementCardProps {
  metrics: PerformanceMetrics | null;
  systemStatus: SystemStatus | null;
}

const RiskManagementCard: React.FC<RiskManagementCardProps> = ({ 
  metrics, 
  systemStatus 
}) => {
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [maxDailyLoss, setMaxDailyLoss] = useState(1000);
  const [maxDrawdown, setMaxDrawdown] = useState(25);
  const [maxPositionSize, setMaxPositionSize] = useState(10000);

  const getRiskLevel = () => {
    if (!metrics) return 'unknown';
    
    if (metrics.currentDrawdown > 20 || metrics.dailyPnl < -maxDailyLoss) {
      return 'critical';
    }
    if (metrics.currentDrawdown > 10 || metrics.dailyPnl < -maxDailyLoss * 0.5) {
      return 'warning';
    }
    return 'normal';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'error.main';
      case 'warning': return 'warning.main';
      case 'normal': return 'success.main';
      default: return 'text.secondary';
    }
  };

  const handleEmergencyStop = () => {
    setEmergencyStop(!emergencyStop);
    // In a real implementation, this would send a stop signal to the trading bot
  };

  const riskLevel = getRiskLevel();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <Security sx={{ mr: 1, color: 'primary.main' }} />
            Risk Management
          </Typography>
          <Box display="flex" alignItems="center">
            {riskLevel === 'critical' && <Warning sx={{ color: 'error.main', mr: 1 }} />}
            {riskLevel === 'warning' && <Warning sx={{ color: 'warning.main', mr: 1 }} />}
            <Typography 
              variant="body2" 
              sx={{ 
                color: getRiskColor(riskLevel),
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              {riskLevel}
            </Typography>
          </Box>
        </Box>

        {/* Risk Status */}
        {metrics && (
          <Box mb={3}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Drawdown
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: metrics.currentDrawdown > 15 ? 'error.main' : 'warning.main',
                      fontFamily: 'monospace'
                    }}
                  >
                    {metrics.currentDrawdown.toFixed(2)}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Daily P&L
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: metrics.dailyPnl >= 0 ? 'success.main' : 'error.main',
                      fontFamily: 'monospace'
                    }}
                  >
                    ${metrics.dailyPnl.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Risk Limits */}
        <Typography variant="subtitle2" gutterBottom>
          Risk Limits
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="Max Daily Loss ($)"
              type="number"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="Max Drawdown (%)"
              type="number"
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(Number(e.target.value))}
            />
          </Grid>
        </Grid>

        <TextField
          fullWidth
          size="small"
          label="Max Position Size ($)"
          type="number"
          value={maxPositionSize}
          onChange={(e) => setMaxPositionSize(Number(e.target.value))}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Emergency Controls */}
        <Typography variant="subtitle2" gutterBottom>
          Emergency Controls
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={emergencyStop}
              onChange={handleEmergencyStop}
              color="error"
            />
          }
          label="Emergency Stop"
          sx={{ mb: 2 }}
        />

        {emergencyStop && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center">
              <Emergency sx={{ mr: 1 }} />
              Emergency stop activated - All trading halted
            </Box>
          </Alert>
        )}

        {/* Risk Alerts */}
        {metrics && metrics.currentDrawdown > maxDrawdown && (
          <Alert severity="error" sx={{ mb: 1 }}>
            Drawdown limit exceeded: {metrics.currentDrawdown.toFixed(2)}% &gt; {maxDrawdown}%
          </Alert>
        )}

        {metrics && metrics.dailyPnl < -maxDailyLoss && (
          <Alert severity="error" sx={{ mb: 1 }}>
            Daily loss limit exceeded: ${metrics.dailyPnl.toFixed(2)} &lt; -${maxDailyLoss}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={1} mt={2}>
          <Button variant="outlined" size="small" fullWidth>
            Update Limits
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            size="small" 
            fullWidth
            onClick={handleEmergencyStop}
          >
            {emergencyStop ? 'Resume' : 'Stop All'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskManagementCard;

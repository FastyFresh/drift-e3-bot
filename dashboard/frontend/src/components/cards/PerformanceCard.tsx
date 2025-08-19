import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  AccountBalance,
  ShowChart,
  Assessment,
} from '@mui/icons-material';
import { PerformanceMetrics, SystemStatus } from '../../types';

interface PerformanceCardProps {
  metrics: PerformanceMetrics | null;
  systemStatus: SystemStatus | null;
  onRefresh: () => void;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({ 
  metrics, 
  systemStatus, 
  onRefresh 
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getPnlColor = (value: number) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };

  const getRiskStatusColor = (status?: string) => {
    switch (status) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  if (!metrics) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="div">
              Performance Metrics
            </Typography>
            <IconButton onClick={onRefresh} size="small">
              <Refresh />
            </IconButton>
          </Box>
          <Typography color="text.secondary">
            No performance data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
            Performance
          </Typography>
          <Box display="flex" alignItems="center">
            <Chip 
              label={systemStatus?.riskStatus?.toUpperCase() || 'NORMAL'} 
              color={getRiskStatusColor(systemStatus?.riskStatus)}
              size="small"
              sx={{ mr: 1 }}
            />
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Main PnL Display */}
        <Box mb={3}>
          <Typography variant="h4" sx={{ 
            color: getPnlColor(metrics.totalPnl),
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}>
            {formatCurrency(metrics.totalPnl)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total P&L
          </Typography>
        </Box>

        {/* Daily PnL */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" mb={1}>
            {metrics.dailyPnl >= 0 ? (
              <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
            ) : (
              <TrendingDown sx={{ color: 'error.main', mr: 1 }} />
            )}
            <Typography variant="h6" sx={{ 
              color: getPnlColor(metrics.dailyPnl),
              fontFamily: 'monospace'
            }}>
              {formatCurrency(metrics.dailyPnl)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Daily P&L
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Key Metrics Grid */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                {formatNumber(metrics.totalTrades)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Trades
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Box>
              <Typography variant="h6" sx={{ 
                color: metrics.winRate >= 0.5 ? 'success.main' : 'warning.main',
                fontFamily: 'monospace'
              }}>
                {formatPercentage(metrics.winRate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Win Rate
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box>
              <Typography variant="h6" sx={{ 
                color: metrics.profitFactor >= 1 ? 'success.main' : 'error.main',
                fontFamily: 'monospace'
              }}>
                {metrics.profitFactor.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Profit Factor
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box>
              <Typography variant="h6" sx={{ 
                color: metrics.sharpeRatio >= 0 ? 'success.main' : 'error.main',
                fontFamily: 'monospace'
              }}>
                {metrics.sharpeRatio.toFixed(3)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sharpe Ratio
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box>
              <Typography variant="h6" sx={{ 
                color: 'error.main',
                fontFamily: 'monospace'
              }}>
                {metrics.maxDrawdown.toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Max Drawdown
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box>
              <Typography variant="h6" sx={{ 
                color: metrics.currentDrawdown > 10 ? 'error.main' : 'warning.main',
                fontFamily: 'monospace'
              }}>
                {metrics.currentDrawdown.toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current DD
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Additional Metrics */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Net P&L: <span style={{ color: getPnlColor(metrics.netPnl) }}>
              {formatCurrency(metrics.netPnl)}
            </span>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Fees: {formatCurrency(metrics.totalFees)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Avg Trade Size: {formatCurrency(metrics.avgTradeSize)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PerformanceCard;

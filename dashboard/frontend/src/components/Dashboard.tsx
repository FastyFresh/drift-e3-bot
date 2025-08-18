import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Fade,
} from '@mui/material';
import PerformanceCard from './cards/PerformanceCard';
import EquityCurveCard from './cards/EquityCurveCard';
import TradeHistoryCard from './cards/TradeHistoryCard';
import ConfigurationCard from './cards/ConfigurationCard';
import OptimizationCard from './cards/OptimizationCard';
import RiskManagementCard from './cards/RiskManagementCard';
import { PerformanceMetrics, Trade, EquityPoint, SystemStatus } from '../types';
import ApiService from '../services/api';
import wsService from '../services/websocket';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    const unsubscribePerformance = wsService.onPerformanceUpdate((data) => {
      if (data.metrics) {
        setPerformanceMetrics(data.metrics);
        setLastUpdate(new Date());
      }
    });

    const unsubscribeTrades = wsService.onTradeUpdate((trades) => {
      setRecentTrades(trades.slice(0, 10)); // Keep only recent 10 trades
      setLastUpdate(new Date());
    });

    // Request initial updates if connected
    if (wsService.isConnected()) {
      wsService.requestPerformanceUpdate();
      wsService.requestTradeUpdate(10);
    }

    return () => {
      unsubscribePerformance();
      unsubscribeTrades();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all dashboard data in parallel
      const [metrics, equity, trades, status] = await Promise.all([
        ApiService.getPerformanceMetrics().catch(() => null),
        ApiService.getEquityCurve(1000).catch(() => []),
        ApiService.getRecentTrades(10).catch(() => []),
        ApiService.getSystemStatus().catch(() => null),
      ]);

      setPerformanceMetrics(metrics);
      setEquityCurve(equity);
      setRecentTrades(trades);
      setSystemStatus(status);
      setLastUpdate(new Date());

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        flexDirection="column"
      >
        <CircularProgress size={60} sx={{ color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 2 }}
        action={
          <button onClick={handleRefresh} style={{ 
            background: 'none', 
            border: 'none', 
            color: 'inherit', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}>
            Retry
          </button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Fade in={true} timeout={800}>
      <Box>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
            Trading Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()} • 
            Status: {systemStatus?.isRunning ? 'Active' : 'Inactive'} • 
            Strategy: {systemStatus?.strategy || 'E3'}
          </Typography>
        </Box>

        {/* Dashboard Grid */}
        <Grid container spacing={3}>
          {/* Performance Metrics - Top Row */}
          <Grid item xs={12} md={6} lg={4}>
            <PerformanceCard
              metrics={performanceMetrics}
              systemStatus={systemStatus}
              onRefresh={handleRefresh}
            />
          </Grid>

          <Grid item xs={12} md={6} lg={8}>
            <EquityCurveCard
              equityCurve={equityCurve}
              trades={recentTrades}
              onRefresh={handleRefresh}
            />
          </Grid>

          {/* Trade History - Second Row */}
          <Grid item xs={12} lg={6}>
            <TradeHistoryCard
              trades={recentTrades}
              onRefresh={handleRefresh}
            />
          </Grid>

          <Grid item xs={12} lg={6}>
            <RiskManagementCard
              metrics={performanceMetrics}
              systemStatus={systemStatus}
            />
          </Grid>

          {/* Configuration and Optimization - Third Row */}
          <Grid item xs={12} lg={6}>
            <ConfigurationCard onRefresh={handleRefresh} />
          </Grid>

          <Grid item xs={12} lg={6}>
            <OptimizationCard onRefresh={handleRefresh} />
          </Grid>
        </Grid>

        {/* Footer */}
        <Box mt={4} pt={2} borderTop="1px solid #333">
          <Typography variant="body2" color="text.secondary" align="center">
            Drift E3 Bot Dashboard v1.0.0 • Enhanced for explosive 1-minute moves
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

export default Dashboard;

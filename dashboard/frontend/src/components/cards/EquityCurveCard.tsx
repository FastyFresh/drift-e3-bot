import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import { Refresh, ShowChart } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ComposedChart,
} from 'recharts';
import { EquityPoint, Trade } from '../../types';

interface EquityCurveCardProps {
  equityCurve: EquityPoint[];
  trades: Trade[];
  onRefresh: () => void;
}

const EquityCurveCard: React.FC<EquityCurveCardProps> = ({ 
  equityCurve, 
  trades, 
  onRefresh 
}) => {
  const theme = useTheme();

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!equityCurve.length) return [];

    // Combine equity curve with trade markers
    const data = equityCurve.map(point => ({
      timestamp: point.timestamp,
      equity: point.equity,
      drawdown: -Math.abs(point.drawdown), // Negative for display below zero
      date: new Date(point.timestamp).toLocaleTimeString(),
      regime: point.regime,
    }));

    // Add trade markers
    trades.forEach(trade => {
      const nearestPoint = data.find(point => 
        Math.abs(point.timestamp - trade.timestamp) < 60000 // Within 1 minute
      );
      if (nearestPoint) {
        (nearestPoint as any)[trade.side === 'LONG' ? 'longTrade' : 'shortTrade'] = nearestPoint.equity;
        (nearestPoint as any).tradePnl = trade.pnl;
      }
    });

    return data;
  }, [equityCurve, trades]);

  const formatTooltip = (value: any, name: string) => {
    if (name === 'equity') {
      return [`$${value.toFixed(2)}`, 'Equity'];
    }
    if (name === 'drawdown') {
      return [`${Math.abs(value).toFixed(2)}%`, 'Drawdown'];
    }
    if (name === 'longTrade') {
      return [`Long Trade`, ''];
    }
    if (name === 'shortTrade') {
      return [`Short Trade`, ''];
    }
    return [value, name];
  };

  const formatXAxisTick = (tickItem: any) => {
    return new Date(tickItem).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!chartData.length) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="div">
              Equity Curve
            </Typography>
            <IconButton onClick={onRefresh} size="small">
              <Refresh />
            </IconButton>
          </Box>
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            height={300}
          >
            <Typography color="text.secondary">
              No equity data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const currentEquity = chartData[chartData.length - 1]?.equity || 0;
  const startEquity = chartData[0]?.equity || 0;
  const totalReturn = currentEquity - startEquity;
  const totalReturnPct = startEquity !== 0 ? (totalReturn / Math.abs(startEquity)) * 100 : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <ShowChart sx={{ mr: 1, color: 'primary.main' }} />
            Equity Curve
          </Typography>
          <Box display="flex" alignItems="center">
            <Box textAlign="right" mr={2}>
              <Typography variant="body2" color="text.secondary">
                Return: 
                <span style={{ 
                  color: totalReturn >= 0 ? theme.palette.success.main : theme.palette.error.main,
                  fontWeight: 'bold',
                  marginLeft: '4px'
                }}>
                  ${totalReturn.toFixed(2)} ({totalReturnPct.toFixed(2)}%)
                </span>
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Chart */}
        <Box height={350}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme.palette.divider}
                opacity={0.3}
              />
              <XAxis 
                dataKey="timestamp"
                tickFormatter={formatXAxisTick}
                stroke={theme.palette.text.secondary}
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <RechartsTooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => new Date(label).toLocaleString()}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '4px',
                  color: theme.palette.text.primary,
                }}
              />
              
              {/* Zero line */}
              <ReferenceLine y={0} stroke={theme.palette.text.secondary} strokeDasharray="2 2" />
              
              {/* Equity line */}
              <Line
                type="monotone"
                dataKey="equity"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: theme.palette.primary.main }}
              />
              
              {/* Drawdown area */}
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke={theme.palette.error.main}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                opacity={0.7}
              />
              
              {/* Trade markers */}
              <Scatter
                dataKey="longTrade"
                fill={theme.palette.success.main}
                shape="triangle"
              />
              <Scatter
                dataKey="shortTrade"
                fill={theme.palette.error.main}
                shape="triangleDown"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>

        {/* Legend */}
        <Box display="flex" justifyContent="center" mt={2} gap={3}>
          <Box display="flex" alignItems="center">
            <Box 
              width={16} 
              height={2} 
              bgcolor="primary.main" 
              mr={1}
            />
            <Typography variant="body2" color="text.secondary">
              Equity
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box 
              width={16} 
              height={2} 
              bgcolor="error.main" 
              mr={1}
              sx={{ borderStyle: 'dashed', borderWidth: '1px 0' }}
            />
            <Typography variant="body2" color="text.secondary">
              Drawdown
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box 
              width={0} 
              height={0} 
              mr={1}
              sx={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: `8px solid ${theme.palette.success.main}`,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Long
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box 
              width={0} 
              height={0} 
              mr={1}
              sx={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${theme.palette.error.main}`,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Short
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EquityCurveCard;

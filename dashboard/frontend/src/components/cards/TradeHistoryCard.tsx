import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, History } from '@mui/icons-material';
import { Trade } from '../../types';

interface TradeHistoryCardProps {
  trades: Trade[];
  onRefresh: () => void;
}

const TradeHistoryCard: React.FC<TradeHistoryCardProps> = ({ trades, onRefresh }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'success';
    if (pnl < 0) return 'error';
    return 'default';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <History sx={{ mr: 1, color: 'primary.main' }} />
            Recent Trades
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {trades.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <Typography color="text.secondary">No trades available</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">P&L</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades.slice(0, 10).map((trade, index) => (
                  <TableRow key={trade.id || index} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatTime(trade.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={trade.side}
                        color={trade.side === 'LONG' ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        ${trade.price.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {trade.size?.toFixed(4) || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={formatCurrency(trade.pnl)}
                        color={getPnlColor(trade.pnl)}
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {trades.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(trades.length, 10)} of {trades.length} trades
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistoryCard;

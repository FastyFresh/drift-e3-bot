# Dashboard Guide

## Overview

The Drift E3 Trading Dashboard is a professional-grade web interface for monitoring and controlling your trading bot. Built with modern web technologies, it provides real-time insights into your bot's performance, trade history, and system status.

## Architecture

```
Dashboard Architecture
├── Backend (Express.js + TypeScript)
│   ├── RESTful API endpoints
│   ├── WebSocket real-time updates
│   ├── SQLite database integration
│   └── File system monitoring
└── Frontend (React + TypeScript)
    ├── Material-UI components
    ├── Real-time charts (Recharts)
    ├── WebSocket client
    └── Professional dark theme
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Drift E3 Bot project

### Installation
```bash
# Install dependencies (from main bot directory)
cd dashboard/backend && npm install
cd ../frontend && npm install
```

### Start Dashboard
```bash
# From main bot directory
npm run dashboard

# Or start components separately
npm run dashboard:backend  # Port 3001
npm run dashboard:frontend # Port 3000
```

### Access Points
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Dashboard Components

### 1. Performance Card
**Real-time performance monitoring**
- Total and daily P&L with color coding
- Key metrics: Sharpe ratio, win rate, profit factor
- Current and maximum drawdown tracking
- System status and risk indicators
- Real-time updates via WebSocket

### 2. Equity Curve Card
**Interactive performance visualization**
- Professional line chart with zoom/pan
- Trade markers (long/short positions)
- Drawdown visualization overlay
- Return percentage calculations
- Responsive design for all screen sizes

### 3. Trade History Card
**Comprehensive trade management**
- Sortable table with real-time updates
- Trade filtering by side, market, date
- P&L color coding for quick assessment
- Pagination for large datasets
- Export capabilities (planned)

### 4. Configuration Card
**Strategy parameter management**
- Visual parameter adjustment interface
- Configuration file selector and loader
- Parameter validation and error handling
- Save/load multiple configurations
- Integration with optimal E3 settings

### 5. Optimization Card
**Optimization control center**
- Start/stop optimization runs
- Real-time progress tracking with percentage
- Optimization history and results
- Parameter sweep management
- Results comparison tools

### 6. Risk Management Card
**Real-time risk monitoring**
- Current drawdown and daily P&L alerts
- Configurable risk limits and thresholds
- Emergency stop functionality
- Risk status indicators
- Automated safety controls

## API Endpoints

### Performance
- `GET /api/performance/metrics` - Current performance metrics
- `GET /api/performance/equity-curve` - Equity curve data
- `GET /api/performance/status` - System status
- `GET /api/performance/backtest-summary` - Backtest results

### Trades
- `GET /api/trades` - Trade history with pagination
- `GET /api/trades/stats` - Trade statistics
- `GET /api/trades/positions` - Current positions
- `GET /api/trades/recent/:count` - Recent trades

### Configuration
- `GET /api/config/list` - Available configurations
- `GET /api/config/:filename` - Specific configuration
- `POST /api/config/:filename` - Save configuration
- `POST /api/config/validate` - Validate configuration

### Optimization
- `GET /api/optimization/history` - Optimization history
- `POST /api/optimization/start` - Start optimization
- `POST /api/optimization/stop/:id` - Stop optimization
- `GET /api/optimization/active` - Active optimizations

## WebSocket Events

### Real-Time Updates
- **performance_update**: Live P&L and metrics
- **trade_update**: New trades and position changes
- **optimization_update**: Progress and results
- **configuration_update**: Config file changes

### Client Requests
- **request_performance**: Request performance data
- **request_trades**: Request trade updates
- **request_positions**: Request position data

## Data Integration

### Real Data Sources
- **Backtest Results**: `var/backtests/` directory
- **Optimization Results**: `var/optimize/` directory
- **Configuration Files**: `config/` directory
- **Trade Database**: SQLite database or JSON files
- **Performance Metrics**: Calculated from real trading data

### File Monitoring
The dashboard automatically monitors file changes and updates the UI in real-time when:
- New backtest results are generated
- Optimization runs complete
- Configuration files are modified
- Trade data is updated

## Customization

### Theme Configuration
The dashboard uses a professional dark theme optimized for trading:
- High contrast for extended sessions
- Color-coded P&L indicators (green/red)
- Monospace fonts for numerical data
- Material-UI design system

### Environment Variables
```bash
# Backend (.env)
PORT=3001
NODE_ENV=development
BOT_ROOT_PATH=/path/to/drift-e3-bot
FRONTEND_URL=http://localhost:3000

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
PORT=3000
```

## Development

### Backend Development
```bash
cd dashboard/backend
npm run dev    # Start with nodemon
npm run build  # Build TypeScript
npm start      # Start production
```

### Frontend Development
```bash
cd dashboard/frontend
npm start      # Start development server
npm run build  # Build for production
npm test       # Run tests
```

## Troubleshooting

### Common Issues

**Dashboard won't start:**
- Check Node.js version (18+)
- Verify all dependencies installed
- Check port availability (3000, 3001)

**WebSocket connection failed:**
- Verify backend is running on port 3001
- Check firewall settings
- Ensure CORS configuration

**API errors:**
- Check bot root path configuration
- Verify data files exist in var/ directory
- Check backend logs for detailed errors

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dashboard:backend
```

## Security

- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All inputs validated with Joi schemas
- **CORS**: Configured for frontend-backend communication
- **Error Handling**: Comprehensive error handling and logging

## Performance

- **WebSocket Optimization**: Efficient real-time updates
- **Data Caching**: Smart caching for frequently accessed data
- **Lazy Loading**: Components loaded on demand
- **Memory Management**: Optimized for long-running sessions

## Future Enhancements

- **Live Bot Control**: Direct start/stop bot functionality
- **Real-Time Market Data**: Live price feeds and market indicators
- **Advanced Analytics**: Regime analysis and performance attribution
- **Mobile App**: Native mobile application for monitoring
- **Alerts System**: Email/SMS notifications for important events

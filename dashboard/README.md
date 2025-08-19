# Drift E3 Trading Dashboard

A professional web-based trading dashboard for monitoring and controlling the Drift E3 Bot. Built with React TypeScript frontend and Express.js backend with real-time WebSocket updates.

## 🚀 Features

### **Real-Time Performance Monitoring**
- Live P&L tracking with color-coded indicators
- Interactive equity curve with trade markers
- Performance metrics: Sharpe ratio, win rate, profit factor, drawdown
- System status and connection monitoring

### **Trade Management**
- Real-time trade history with filtering and sorting
- Trade statistics and analytics
- Position monitoring and management
- Risk status indicators

### **Strategy Configuration**
- Visual parameter adjustment interface
- Configuration file management
- Parameter validation and optimization results display
- Save/load multiple strategy configurations

### **Optimization Control**
- Start/stop optimization runs
- Real-time progress tracking
- Optimization history and results comparison
- Parameter sweep management

### **Risk Management**
- Real-time risk monitoring
- Configurable risk limits and alerts
- Emergency stop functionality
- Drawdown and loss limit controls

## 🏗️ Architecture

```
dashboard/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Validation & error handling
│   │   └── types/     # TypeScript definitions
│   └── package.json
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── components/# Dashboard components
│   │   ├── services/  # API & WebSocket clients
│   │   └── types/     # TypeScript definitions
│   └── package.json
└── start-dashboard.sh # Startup script
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Drift E3 Bot project

### **Installation**
```bash
# From the main bot directory
cd dashboard

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

### **Start Dashboard**
```bash
# From the main bot directory
npm run dashboard

# Or manually:
./dashboard/start-dashboard.sh
```

### **Access Dashboard**
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

## 📊 Dashboard Components

### **Performance Card**
- Total and daily P&L
- Key performance metrics
- Risk status indicators
- Real-time updates via WebSocket

### **Equity Curve Card**
- Interactive line chart with zoom/pan
- Trade markers (long/short)
- Drawdown visualization
- Regime overlays

### **Trade History Card**
- Sortable trade table
- Real-time trade updates
- Trade statistics
- Filtering by side, market, date

### **Configuration Card**
- Strategy parameter editor
- Configuration file selector
- Parameter validation
- Save/load configurations

### **Optimization Card**
- Start new optimization runs
- Progress tracking with live updates
- Optimization history
- Results comparison

### **Risk Management Card**
- Real-time risk monitoring
- Configurable limits
- Emergency stop controls
- Risk alerts and warnings

## 🔧 Configuration

### **Environment Variables**

**Backend (.env)**
```bash
PORT=3001
NODE_ENV=development
BOT_ROOT_PATH=/path/to/drift-e3-bot
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env)**
```bash
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
PORT=3000
```

### **API Endpoints**

**Performance**
- `GET /api/performance/metrics` - Current performance metrics
- `GET /api/performance/equity-curve` - Equity curve data
- `GET /api/performance/status` - System status

**Trades**
- `GET /api/trades` - Trade history with pagination
- `GET /api/trades/stats` - Trade statistics
- `GET /api/trades/positions` - Current positions

**Configuration**
- `GET /api/config/list` - Available configurations
- `GET /api/config/:filename` - Specific configuration
- `POST /api/config/:filename` - Save configuration
- `POST /api/config/validate` - Validate configuration

**Optimization**
- `GET /api/optimization/history` - Optimization history
- `POST /api/optimization/start` - Start optimization
- `POST /api/optimization/stop/:id` - Stop optimization

## 🔄 Real-Time Updates

The dashboard uses WebSocket connections for real-time updates:

- **Performance Updates**: Live P&L, metrics, positions
- **Trade Updates**: New trades, position changes
- **Optimization Updates**: Progress, results, status
- **Configuration Updates**: File changes, validations

## 🎨 UI/UX Features

### **Dark Theme**
- Professional financial application design
- High contrast for extended trading sessions
- Color-coded P&L indicators (green/red)
- Monospace fonts for numerical data

### **Responsive Design**
- Card-based layout with Material-UI
- Mobile-friendly responsive grid
- Optimized for desktop trading setups
- Professional financial industry patterns

### **Loading States**
- Skeleton loading for data fetching
- Progress indicators for long operations
- Error handling with retry options
- Connection status indicators

## 🧪 Development

### **Backend Development**
```bash
cd dashboard/backend
npm run dev    # Start with nodemon
npm run build  # Build TypeScript
npm start      # Start production
```

### **Frontend Development**
```bash
cd dashboard/frontend
npm start      # Start development server
npm run build  # Build for production
npm test       # Run tests
```

### **Full Stack Development**
```bash
# Start both backend and frontend
npm run dashboard

# Or separately:
npm run dashboard:backend
npm run dashboard:frontend
```

## 🔒 Security

- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All inputs validated with Joi schemas
- **CORS**: Configured for frontend-backend communication
- **Error Handling**: Comprehensive error handling and logging

## 📈 Performance

- **WebSocket Optimization**: Efficient real-time updates
- **Data Caching**: Smart caching for frequently accessed data
- **Lazy Loading**: Components loaded on demand
- **Memory Management**: Optimized for long-running sessions

## 🚨 Troubleshooting

### **Common Issues**

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

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* npm run dashboard:backend
```

## 📝 License

MIT License - Same as the main Drift E3 Bot project.

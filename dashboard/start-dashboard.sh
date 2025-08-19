#!/bin/bash

# Drift E3 Trading Dashboard Startup Script

echo "🚀 Starting Drift E3 Trading Dashboard..."

# Set the bot root path
export BOT_ROOT_PATH="$(cd .. && pwd)"
echo "📁 Bot root path: $BOT_ROOT_PATH"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down dashboard..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start backend server
echo "🔧 Starting backend API server..."
cd backend
export BOT_ROOT_PATH="$BOT_ROOT_PATH"
npm run dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to start
sleep 3

# Start frontend development server
echo "🎨 Starting frontend development server..."
cd ../frontend
npm start &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎯 Dashboard is starting up..."
echo "📊 Backend API: http://localhost:3001"
echo "🌐 Frontend UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the dashboard"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID

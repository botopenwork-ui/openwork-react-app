# OpenWork Quick Start/Stop Guide

**Quick reference for starting and stopping frontend and backend servers**

---

## 🚀 Starting the Application

### Option 1: Start Both Servers (Recommended)

**Terminal 1 - Frontend:**
```bash
npm run dev
```
- Runs on: http://localhost:5174/ (or 5173)
- Keep this terminal open

**Terminal 2 - Backend:**
```bash
cd backend && npm start
```
- Runs on: http://localhost:3001
- Keep this terminal open

### Option 2: Start Frontend Only
```bash
npm run dev
```
- Use this for UI development without CCTP automation
- CCTP transfers won't complete automatically

### Option 3: Start Backend Only
```bash
cd backend && npm start
```
- Use this to monitor/complete CCTP transfers in background
- Frontend must be running separately for users to interact

---

## 🛑 Stopping the Application

### Stop Frontend
1. Go to Terminal 1
2. Press `Ctrl + C`
3. Confirm if prompted

### Stop Backend
1. Go to Terminal 2
2. Press `Ctrl + C`
3. Server will shut down gracefully

### Stop Both
- Press `Ctrl + C` in both terminals

---

## ✅ Verify Services Are Running

### Check Frontend
```bash
# Open in browser
http://localhost:5174/
```
If page loads → Frontend is running ✓

### Check Backend
```bash
# Terminal command
curl http://localhost:3001/health
```
If you get JSON response → Backend is running ✓

### Check Backend Stats
```bash
curl http://localhost:3001/stats
```
Shows processing jobs and recent completions

---

## 🔧 Troubleshooting

### Port Already in Use

**Frontend:**
```bash
# Kill process on port 5174
lsof -ti:5174 | xargs kill -9

# Or let Vite auto-select next port
# It will use 5175, 5176, etc.
```

**Backend:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Backend Not Starting
```bash
# Check .env exists
ls backend/.env

# If missing, copy from example
cp backend/.env.example backend/.env
# Then edit with your values
```

---

## 📝 Quick Commands Reference

| Action | Command |
|--------|---------|
| Start Frontend | `npm run dev` |
| Start Backend | `cd backend && npm start` |
| Stop Any Server | `Ctrl + C` |
| Check Frontend | Open http://localhost:5174/ |
| Check Backend Health | `curl http://localhost:3001/health` |
| Check Backend Stats | `curl http://localhost:3001/stats` |
| Kill Port 5174 | `lsof -ti:5174 \| xargs kill -9` |
| Kill Port 3001 | `lsof -ti:3001 \| xargs kill -9` |

---

## 🎯 Production Deployment

For production, use PM2 for backend:

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name openwork-backend

# View logs
pm2 logs openwork-backend

# Stop backend
pm2 stop openwork-backend

# Restart backend
pm2 restart openwork-backend
```

Frontend should be built and served with a web server:
```bash
npm run build
# Serve the dist/ folder with nginx/apache/etc.
```

---

**Last Updated**: October 13, 2025

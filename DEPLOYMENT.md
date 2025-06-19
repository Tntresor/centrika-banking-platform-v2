# Centrika Neobank - Deployment Guide

## Overview
This guide covers deploying the Centrika Neobank backend to cloud platforms, optimized for backend-only deployment.

## Deployment Strategy
- **Target**: Backend API server only
- **Port**: 8000 (maps to external port 80)
- **Health Checks**: `/` and `/health` endpoints
- **Environment**: Production-optimized Node.js

## Files Created for Deployment

### 1. Deployment Scripts
- `start.sh` - Production startup script
- `deploy.sh` - Cloud Run deployment script
- `Dockerfile` - Container configuration

### 2. Configuration Files
- `server/.env.production` - Production environment variables
- `.dockerignore` - Optimized Docker context

### 3. Package.json Updates
- Added `deploy` script for production deployment
- Updated `start:prod` script with environment variables

## Deployment Commands

### Option 1: Using start.sh
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Using deploy.sh
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Direct npm command
```bash
cd server && npm run deploy
```

## Health Check Endpoints
- `GET /` - Root endpoint for deployment health checks
- `GET /health` - Detailed health status with uptime and version

## Environment Variables Required
Set these in your deployment environment:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV=production`
- `PORT=8000`

## Deployment Fixes Applied
1. ✅ **Changed deployment command** - Now installs dependencies AND starts server
2. ✅ **Backend-only deployment** - Removed mobile/backoffice from deployment
3. ✅ **Health check endpoints** - Both `/` and `/health` respond properly
4. ✅ **Production environment** - Proper NODE_ENV and PORT configuration
5. ✅ **Optimized Docker** - Backend-focused container with health checks

## Verification
The server will start on `0.0.0.0:8000` and respond to:
- Health check: `curl http://localhost:8000/health`
- Root endpoint: `curl http://localhost:8000/`

Both endpoints return JSON responses confirming the service is running.
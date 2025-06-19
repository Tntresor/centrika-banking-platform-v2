# Centrika Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended)
1. Connect your GitHub repo to Railway
2. Set environment variables from `.env.example`
3. Deploy automatically

### Option 2: Vercel 
1. Connect GitHub repo to Vercel
2. Configure build settings: `cd server && npm install`
3. Start command: `npm start`

### Option 3: Render
1. Connect GitHub repo
2. Build command: `cd server && npm install`
3. Start command: `cd server && npm start`

## Database Setup (Supabase)

1. Create new Supabase project
2. Copy database URL and keys
3. Run schema migration:
```sql
-- Copy contents from shared/schema.ts and run in Supabase SQL editor
```

## Environment Variables

Set these in your deployment platform:
- `DATABASE_URL`: Your Supabase connection string
- `NODE_ENV`: production
- `PORT`: 8000 (or platform default)
- `JWT_SECRET`: Generate random string
- `ALLOWED_ORIGINS`: Your frontend domains

## Mobile App Deployment

Deploy to Vercel as static site:
- Build command: `cd mobile && npm run build`
- Output directory: `mobile/dist`

## Admin Dashboard Deployment

Deploy backoffice to Vercel:
- Build command: `cd backoffice && npm run build`
- Output directory: `backoffice/.next`

## GitHub Repository Structure
```
/
├── server/          # Backend API
├── mobile/          # React Native/Web app  
├── backoffice/      # Admin dashboard
├── shared/          # Shared types and schema
├── vercel.json      # Vercel configuration
├── railway.json     # Railway configuration
└── deploy-guide.md  # This file
```
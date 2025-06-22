# Vercel Deployment Guide - Centrika Neobank

## Issue Fixed
The Vercel deployment error "The `functions` property cannot be used in conjunction with the `builds` property" has been resolved by:

1. **Removed conflicting `functions` property** from vercel.json
2. **Created proper serverless API structure** in `/api` directory
3. **Updated build configuration** to use `@vercel/node` correctly

## Deployment Structure

### Files for Vercel Deployment
- `api/index.js` - Main serverless function with all API endpoints
- `api/package.json` - Dependencies for the API function
- `vercel.json` - Deployment configuration (fixed)

### Updated vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## API Endpoints Available
- `GET /` - Health check and service info
- `GET /health` - Detailed health status
- `POST /api/admin/login` - Admin authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication

## Environment Variables Required
Set these in your Vercel project settings:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret

## Deployment Command
```bash
vercel --prod
```

The deployment will now work correctly without the `functions`/`builds` conflict error.
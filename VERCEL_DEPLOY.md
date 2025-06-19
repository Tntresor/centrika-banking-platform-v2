# Vercel Deployment Guide for Centrika Neobank

## 🚀 Deploy to Vercel (3 Steps)

### Step 1: Prepare Your Repository
1. Push this code to your GitHub repository
2. Ensure all files are committed:
   - `vercel.json` (Vercel configuration)
   - `api/index.js` (Serverless function)
   - `api/package.json` (Dependencies)
   - `supabase-schema.sql` (Database schema)

### Step 2: Set Up Database (Supabase)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Copy and paste the entire contents of `supabase-schema.sql`
5. Run the SQL to create all tables
6. Go to Settings → Database
7. Copy your connection string

### Step 3: Deploy API to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. **IMPORTANT**: Set these environment variables:
   ```
   DATABASE_URL=your_supabase_connection_string
   NODE_ENV=production
   JWT_SECRET=your_random_32_character_string
   ALLOWED_ORIGINS=*
   ```
6. Deploy

## Step 4: Deploy Admin Dashboard
1. In Vercel, create another project
2. Import same repository
3. **Root Directory**: Set to `backoffice`
4. **Build Command**: `npm run build`
5. **Environment Variables**:
   ```
   API_URL=https://your-api-domain.vercel.app
   ```

## Step 5: Deploy Mobile App (Optional)
1. Create third Vercel project
2. **Root Directory**: Set to `mobile`
3. **Build Command**: `npm run build` (if available) or skip for demo
4. **Environment Variables**:
   ```
   EXPO_PUBLIC_API_URL=https://your-api-domain.vercel.app/api
   ```

## Testing Your Deployment
- API Health: `https://your-api.vercel.app/health`
- Admin Dashboard: `https://your-admin.vercel.app`
- Mobile Demo: `https://your-mobile.vercel.app`

## Sample Environment Variables
```env
# Required for API
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
NODE_ENV=production
JWT_SECRET=super-secret-jwt-key-at-least-32-characters-long
ALLOWED_ORIGINS=https://your-admin.vercel.app,https://your-mobile.vercel.app

# Optional for full features
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

## Troubleshooting
- **Build Fails**: Check that all dependencies are in `api/package.json`
- **Database Errors**: Verify DATABASE_URL is correct
- **CORS Issues**: Add your frontend domains to ALLOWED_ORIGINS
- **Timeout**: Functions timeout at 60s, increase if needed

Your Centrika neobank will be live at the Vercel URLs!
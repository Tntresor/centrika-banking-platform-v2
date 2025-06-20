# Complete Beginner's Guide to Deploy Centrika Banking App

## What We're Going to Do
You'll deploy your banking app to the internet so anyone can use it. We'll use 3 free services:
- **Supabase**: To store your banking data (like a digital filing cabinet)
- **GitHub**: To store your code (like Google Drive for programmers)
- **Vercel**: To host your app on the internet (like a web host)

**Total Time**: 30-45 minutes
**Cost**: $0 (everything is free)

---

## PART 1: Getting Your Code Ready (5 minutes)

### Step 1: Download Your Code
1. In Replit, click the **three dots menu** (⋯) in the top right
2. Click **"Download as ZIP"**
3. Save it to your computer (remember where you saved it!)
4. **Unzip/Extract** the folder - you should see folders like `server`, `mobile`, `backoffice`

---

## PART 2: Create Your GitHub Account & Upload Code (10 minutes)

### Step 2: Set Up GitHub
1. Go to **github.com**
2. Click **"Sign up"** (if you don't have an account)
3. Choose a username (example: `yourname-banking`)
4. Use a strong password and verify your email

### Step 3: Create a Repository (Code Storage)
1. Click the **green "New"** button (or **"Create repository"**)
2. **Repository name**: `centrika-banking-app`
3. Make sure **"Public"** is selected
4. **Check the box** for "Add a README file"
5. Click **"Create repository"**

### Step 4: Upload Your Code
1. In your new repository, click **"uploading an existing file"**
2. **Drag and drop** all the folders from your unzipped Replit code
3. You should see folders like: `api`, `server`, `mobile`, `backoffice`, `shared`
4. In the **"Commit changes"** box at the bottom:
   - Title: `Initial upload of banking app`
   - Click **"Commit changes"**

---

## PART 3: Set Up Your Database (10 minutes)

### Step 5: Create Supabase Account
1. Go to **supabase.com**
2. Click **"Start your project"**
3. Sign up with your **GitHub account** (click "Continue with GitHub")
4. Authorize Supabase to access your GitHub

### Step 6: Create Your Database
1. Click **"New project"**
2. Choose your organization (usually your username)
3. **Project name**: `centrika-banking`
4. **Database password**: Create a strong password (WRITE THIS DOWN!)
5. **Region**: Choose closest to your location
6. Click **"Create new project"**
7. **Wait 2-3 minutes** for setup to complete

### Step 7: Set Up Database Tables
1. In your Supabase project, click **"SQL Editor"** in the left menu
2. In GitHub, open your repository
3. Click on the file **"supabase-schema.sql"**
4. Click **"Raw"** button to see the code
5. **Copy ALL the text** (Ctrl+A, then Ctrl+C)
6. Go back to Supabase SQL Editor
7. **Paste the code** in the editor
8. Click **"Run"** button
9. You should see "Success. No rows returned" - this is good!

### Step 8: Get Your Database Connection
1. In Supabase, click **"Settings"** (gear icon) in the left menu
2. Click **"Database"**
3. Scroll down to **"Connection string"**
4. **Copy the URI** (it starts with `postgresql://`)
5. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the password you created in Step 6
6. **Save this connection string** - you'll need it soon!

---

## PART 4: Deploy Your App to the Internet (15 minutes)

### Step 9: Create Vercel Account
1. Go to **vercel.com**
2. Click **"Start Deploying"**
3. Click **"Continue with GitHub"**
4. Authorize Vercel to access your repositories

### Step 10: Deploy Your API (Backend)
1. Click **"Add New Project"**
2. Find your `centrika-banking-app` repository and click **"Import"**
3. **Project Name**: `centrika-api`
4. Click **"Deploy"**
5. **Wait for deployment** (1-2 minutes)
6. You'll see "Congratulations!" when done
7. **Copy the URL** shown (like `https://centrika-api-xyz.vercel.app`)

### Step 11: Add Your Database Connection
1. In your deployed project, click **"Settings"** tab
2. Click **"Environment Variables"** in the left menu
3. Add these variables one by one:

**Variable 1:**
- **Name**: `DATABASE_URL`
- **Value**: Your Supabase connection string from Step 8
- Click **"Add"**

**Variable 2:**
- **Name**: `NODE_ENV`
- **Value**: `production`
- Click **"Add"**

**Variable 3:**
- **Name**: `JWT_SECRET`
- **Value**: Create a random password (at least 32 characters)
- Example: `mySuper$ecretKey123ForBanking456!`
- Click **"Add"**

**Variable 4:**
- **Name**: `ALLOWED_ORIGINS`
- **Value**: `*`
- Click **"Add"**

### Step 12: Redeploy with Database
1. Go to **"Deployments"** tab
2. Click the **three dots** (⋯) next to your latest deployment
3. Click **"Redeploy"**
4. Wait for redeployment (1-2 minutes)

### Step 13: Test Your API
1. Copy your Vercel URL from Step 10
2. Add `/health` to the end (example: `https://centrika-api-xyz.vercel.app/health`)
3. Open this URL in a new browser tab
4. You should see: `{"status":"healthy","timestamp":"...","platform":"Vercel"}`
5. **If you see this, your API is working!**

---

## PART 5: Deploy Your Admin Dashboard (5 minutes)

### Step 14: Deploy Admin Interface
1. In Vercel, click **"Add New Project"** again
2. Import your `centrika-banking-app` repository again
3. **Project Name**: `centrika-admin`
4. **IMPORTANT**: Under **"Configure Project"**:
   - **Root Directory**: Change to `backoffice`
   - **Build Command**: `npm run build`
5. Click **"Deploy"**
6. Wait for deployment
7. **Copy the admin URL** (like `https://centrika-admin-xyz.vercel.app`)

---

## PART 6: Deploy Your Mobile App (5 minutes)

### Step 15: Deploy Mobile Demo
1. In Vercel, click **"Add New Project"** again
2. Import your repository again
3. **Project Name**: `centrika-mobile`
4. **Root Directory**: Change to `mobile`
5. Click **"Deploy"**
6. **Copy the mobile URL**

---

## PART 7: Test Everything (5 minutes)

### Step 16: Final Testing
**Test your API:**
- Open: `https://your-api-url.vercel.app/health`
- Should show: `{"status":"healthy"...}`

**Test your Admin Dashboard:**
- Open: `https://your-admin-url.vercel.app`
- Should show a login page

**Test your Mobile App:**
- Open: `https://your-mobile-url.vercel.app`
- Should show a phone-like banking interface

---

## What You've Accomplished! 🎉

You now have a **fully functional banking app** running on the internet:

1. **Database**: Stores all user data securely on Supabase
2. **API**: Handles all banking operations (transfers, payments, etc.)
3. **Admin Panel**: Manage users, transactions, and compliance
4. **Mobile App**: Customer-facing banking interface

**Your app can handle:**
- User registration and login
- Money transfers between users
- Mobile money deposits/withdrawals
- Virtual card generation
- KYC (Know Your Customer) verification
- Transaction history
- Admin management
- Regulatory compliance reporting

---

## Important URLs to Save:
- **API**: `https://your-api-url.vercel.app`
- **Admin Dashboard**: `https://your-admin-url.vercel.app`
- **Mobile App**: `https://your-mobile-url.vercel.app`
- **Database**: Your Supabase project dashboard

---

## If Something Goes Wrong:

**API shows error:**
- Check your environment variables in Vercel settings
- Make sure DATABASE_URL is correct

**Admin won't load:**
- Try redeploying the admin project
- Check browser console for errors (F12 key)

**Mobile app doesn't work:**
- Clear your browser cache
- Try incognito/private browsing mode

**Need help?**
- Check the deployment logs in Vercel
- All services have status pages showing if they're working

---

## Next Steps (Optional):
1. **Custom Domain**: Connect your own domain name (like `mybankingapp.com`)
2. **Firebase Setup**: Add push notifications for mobile users
3. **Payment Integration**: Connect real mobile money APIs
4. **SSL Certificate**: Automatically included with Vercel

**Congratulations! You've successfully deployed a complete banking application to the internet!**
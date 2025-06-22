# GitHub Setup Guide for Centrika Banking Platform

## Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in
2. Click "New repository" (green button)
3. Repository name: `centrika-banking-platform`
4. Description: `Complete mobile neobank application for Rwanda with React Native, Node.js backend, and Supabase integration`
5. Select "Public" or "Private" as needed
6. **DO NOT** initialize with README (we already have files)
7. Click "Create repository"

## Step 2: Connect and Push Your Code

Run these commands in the Replit Shell:

```bash
# Add your GitHub repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/centrika-banking-platform.git

# Stage all your banking platform files
git add .

# Commit your complete banking platform
git commit -m "Complete Centrika Banking Platform - Mobile app, API server, Admin dashboard with Supabase integration"

# Push to GitHub main branch
git push -u origin main
```

## Step 3: Update Repository Settings (Optional)
After pushing, you can:
1. Add repository description and topics (fintech, banking, react-native, nodejs)
2. Set up branch protection rules
3. Configure deployment settings if needed

## Your Platform Components Being Pushed:
- **Backend API** (server/) - Node.js with authentication and database integration
- **Mobile App** (mobile/) - Interactive banking interface on port 8081
- **Admin Dashboard** (backoffice/) - Management console on port 3000
- **Shared Schema** (shared/) - Database models and types
- **Documentation** - README, deployment guides, and project specs

## Important Notes:
- Environment variables (.env) are excluded via .gitignore for security
- Node modules are excluded to keep repository size manageable
- Your Supabase credentials remain private and secure
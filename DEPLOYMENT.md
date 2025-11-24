# Discord Clone - Free Deployment Guide

## 🚀 Deploy to Vercel (Frontend) + Render (Backend)

This guide will help you deploy your Discord clone for **FREE** using:
- **Vercel** for the React frontend
- **Render** for the Node.js backend

---

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- Render account (sign up at render.com)

---

## Step 1: Push to GitHub

1. Initialize git in your project:
```bash
cd discord-clone
git init
git add .
git commit -m "Initial commit"
```

2. Create a new repo on GitHub
3. Push your code:
```bash
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## Step 2: Deploy Backend on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repo**
4. **Configure**:
   - **Name**: `discord-clone-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

5. **Add Environment Variables**:
   - `JWT_SECRET`: `your_random_secret_key_here`
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `https://your-app-name.vercel.app` (update after deploying frontend)

6. **Click "Deploy Web Service"**
7. **Copy your backend URL** (e.g., `https://discord-clone-backend.onrender.com`)

> ⚠️ **Important**: Render free tier spins down after inactivity. First request may take 30-60s.

---

## Step 3: Deploy Frontend on Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New" → "Project"**
3. **Import your GitHub repository**
4. **Configure**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Add Environment Variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render backend URL (from Step 2)

6. **Click "Deploy"**
7. **Get your live URL** (e.g., `https://discord-clone-xyz.vercel.app`)

---

## Step 4: Update CORS Settings

1. **Go back to Render dashboard**
2. **Click on your backend service**
3. **Go to "Environment"**
4. **Update `CORS_ORIGIN`** with your Vercel frontend URL
5. **Save changes** (service will redeploy)

---

## Step 5: Test Your Deployment! 🎉

1. Visit your Vercel URL
2. Register a new user
3. Start chatting!

---

## 📝 Notes

### Database Limitation
- **SQLite on Render**: The free tier uses ephemeral storage. Your database will reset on each deploy.
- **Solution**: For persistent data, upgrade to Render's paid tier with disk storage, or use a free PostgreSQL database from Render/Supabase.

### Free Tier Limitations
- **Render**: Spins down after 15 min of inactivity
- **Vercel**: 100GB bandwidth/month
- Both are perfect for demos and testing!

---

## 🔧 Troubleshooting

**WebSocket not connecting?**
- Make sure CORS_ORIGIN is set correctly
- Check that your backend URL uses HTTPS

**Database empty?**
- Render free tier resets on each deploy
- Consider using Render PostgreSQL (free) for persistence

**Build fails?**
- Check Node version compatibility
- Verify all dependencies are in package.json

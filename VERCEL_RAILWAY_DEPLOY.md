# Vercel + Railway Deployment Guide

## Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Set environment variables:
   - `NODE_ENV=production`
   - `CLIENT_ORIGIN=https://your-frontend.vercel.app`
4. Note your Railway URL (e.g., `https://your-backend.railway.app`)

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repo
3. Set environment variable:
   - `REACT_APP_BACKEND_URL=https://your-backend.railway.app`
4. Deploy

## Step 3: Update CORS Settings

After both deployments:
1. Update Railway environment variable:
   - `CLIENT_ORIGIN=https://your-actual-frontend.vercel.app`
2. Update Vercel environment variable:
   - `REACT_APP_BACKEND_URL=https://your-actual-backend.railway.app`

## Files Created:
- `vercel.json` - Vercel configuration
- `server-only.js` - Backend-only server
- `.env.production` - Production environment variables

## Benefits:
- ✅ Better performance (CDN for frontend)
- ✅ Independent scaling
- ✅ Faster frontend deployments
- ✅ Better caching
# Deployment Guide

## Quick Deploy Options

### 1. Heroku (Recommended for beginners)
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CLIENT_ORIGIN=https://your-app-name.herokuapp.com

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 2. Railway
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Set environment variables:
   - `NODE_ENV=production`
   - `CLIENT_ORIGIN=https://your-app.railway.app`
4. Deploy automatically

### 3. Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub repo
3. Use the render.yaml config
4. Set environment variables in dashboard

### 4. Docker Deployment
```bash
# Build image
docker build -t realtime-editor .

# Run container
docker run -p 3001:3001 -e NODE_ENV=production realtime-editor
```

## Environment Variables for Production
- `NODE_ENV=production`
- `PORT=3001` (or your preferred port)
- `CLIENT_ORIGIN=https://your-domain.com`

## Important Notes
- Update CLIENT_ORIGIN to match your deployed URL
- Ensure WebSocket connections work with your hosting provider
- Test real-time features after deployment
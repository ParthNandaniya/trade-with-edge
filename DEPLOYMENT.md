# Deployment Guide for Firebase

This guide will help you deploy both the dashboard (frontend) and server (backend) to Firebase.

## Prerequisites

1. **Firebase CLI**: Install if you haven't already
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Account**: Sign up at [Firebase Console](https://console.firebase.google.com/)

3. **Node.js 20+**: Required for Firebase Functions

## Initial Setup

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase Project

```bash
firebase init
```

Select:
- ✅ Hosting
- ✅ Functions
- ✅ Firestore

### 3. Configure Project

1. Select or create a Firebase project
2. Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```

### 4. Set Environment Variables

Create `.env` files for environment variables:

**For Dashboard** (`dashboard/.env`):
```env
VITE_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
VITE_OPENAI_API_KEY=your_openai_key_here
```

**For Functions** (`functions/.env`):
```env
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
```

**For Firebase Functions**, set secrets:
```bash
firebase functions:secrets:set ALPHA_VANTAGE_API_KEY
# Enter your API key when prompted
```

## Building and Deployment

### Step 1: Build Dashboard

```bash
cd dashboard
npm install
npm run build
cd ..
```

### Step 2: Build Functions

```bash
cd functions
npm install
npm run build
cd ..
```

### Step 3: Deploy Everything

```bash
firebase deploy
```

Or deploy individually:

```bash
# Deploy only hosting (dashboard)
firebase deploy --only hosting

# Deploy only functions (server)
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

## Post-Deployment

### 1. Update API URL

After deployment, update `dashboard/.env` with your actual Functions URL:
```env
VITE_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

Then rebuild and redeploy:
```bash
cd dashboard
npm run build
cd ..
firebase deploy --only hosting
```

### 2. Verify Deployment

- **Dashboard**: Visit `https://YOUR_PROJECT_ID.web.app`
- **API Health Check**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/health`

## Troubleshooting

### Functions Timeout

If functions timeout, increase memory and timeout in `functions/src/index.ts`:
```typescript
.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
})
```

### Puppeteer Issues

If Puppeteer fails, ensure:
1. `@sparticuz/chromium` is installed in functions
2. Functions have enough memory (2GB recommended)
3. Check function logs: `firebase functions:log`

### CORS Issues

CORS is configured to allow all origins. For production, restrict in `functions/src/index.ts`:
```typescript
cors({
  origin: ['https://YOUR_PROJECT_ID.web.app'],
  credentials: true
})
```

## Local Development

### Run Dashboard Locally

```bash
cd dashboard
npm run dev
```

### Run Functions Locally

```bash
cd functions
npm run serve
```

### Run Both with Emulators

```bash
firebase emulators:start
```

## Continuous Deployment

For automatic deployments, set up GitHub Actions or similar CI/CD:

1. Add Firebase token as secret: `firebase login:ci`
2. Create `.github/workflows/deploy.yml`
3. Trigger on push to main branch

## Cost Considerations

- **Firebase Hosting**: Free tier includes 10GB storage, 360MB/day transfer
- **Firebase Functions**: Free tier includes 2M invocations/month
- **Puppeteer**: Functions with Puppeteer consume more resources (2GB memory)

Monitor usage in [Firebase Console](https://console.firebase.google.com/)


# Quick Start: Firebase Deployment

## 🚀 Quick Deployment Steps

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase (if not done)
```bash
firebase init
```
Select: Hosting, Functions, Firestore

### 4. Update Project ID
Edit `.firebaserc` and replace `YOUR_PROJECT_ID` with your actual Firebase project ID.

### 5. Set Environment Variables

**Dashboard** (`dashboard/.env`):
```env
VITE_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

**Functions** - Set secrets:
```bash
firebase functions:secrets:set ALPHA_VANTAGE_API_KEY
```

### 6. Deploy
```bash
# Option 1: Use the deployment script
./scripts/deploy.sh

# Option 2: Use npm scripts
npm run deploy

# Option 3: Manual deployment
npm run build
firebase deploy
```

## ✅ Pre-Deployment Checklist

Run the checklist:
```bash
node scripts/check-deployment.js
```

Or manually check:
- [ ] `.firebaserc` has valid project ID
- [ ] `firebase.json` exists
- [ ] Environment variables are set
- [ ] Dashboard builds successfully
- [ ] Functions build successfully

## 📝 Important Notes

1. **API URL**: After first deployment, update `dashboard/.env` with your actual Functions URL
2. **Puppeteer**: Functions need 2GB memory for Puppeteer to work
3. **Timeout**: Functions have 9-minute timeout (540 seconds)
4. **CORS**: Currently allows all origins - restrict for production

## 🔍 Verify Deployment

- **Dashboard**: `https://YOUR_PROJECT_ID.web.app`
- **API Health**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/health`

## 🐛 Troubleshooting

### Functions not deploying?
- Check Node.js version (needs 20+)
- Ensure all dependencies are installed
- Check function logs: `firebase functions:log`

### Puppeteer errors?
- Increase function memory to 2GB
- Check `@sparticuz/chromium` is installed
- Verify timeout is set to 540 seconds

### CORS errors?
- Update CORS origin in `functions/src/index.ts`
- Ensure API URL in dashboard matches Functions URL

## 📚 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.


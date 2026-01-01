# Trade With Edge

Dashboard and Backend for trading analytics and stock screenshots.

## Quick Start

### Install All Dependencies

```bash
npm run install:all
```

Or install manually:
```bash
npm install
cd server && npm install
cd ../dashboard && npm install
```

### Run Development Servers

Start both backend and frontend simultaneously:

```bash
npm run dev
```

This will start:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Individual Commands

Run servers separately:

```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:client
```

### Build for Production

```bash
npm run build
```

Build individually:
```bash
npm run build:server
npm run build:client
```

## Project Structure

- `/dashboard` - React frontend (Vite + TypeScript + Ant Design)
- `/server` - Node.js backend (Express + Puppeteer)

## API

See `/server/README.md` for backend API documentation.

## Screenshot API

GET `/api/screenshot?ticker=SYMBOL` - Capture Finviz stock quote screenshot

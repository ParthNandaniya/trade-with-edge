# Dashboard

A React TypeScript frontend project with Firebase integration.

## Features

- ⚛️ React 18 with TypeScript
- 🔥 Firebase integration (Auth, Firestore, Storage)
- ⚡ Vite for fast development and building
- 🎨 Modern UI setup
- 📦 ESLint for code quality

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase configuration:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase project credentials from the Firebase Console

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
dashboard/
├── src/
│   ├── components/      # React components
│   ├── firebase/        # Firebase configuration
│   ├── App.tsx          # Main App component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the services you need:
   - Authentication
   - Firestore Database
   - Storage (if needed)
3. Get your Firebase configuration from Project Settings
4. Add the configuration to your `.env` file

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

- React 18
- TypeScript
- Vite
- Firebase (Auth, Firestore, Storage)
- ESLint


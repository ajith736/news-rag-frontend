# NewsWise AI — Frontend

A modern React + Vite interface for the News RAG backend. It provides a chat UI, session persistence, RAG refresh controls, and a polished UX suitable for desktop.
Deployed and accessible here: https://news-rag-system.netlify.app/

## Features
- Chat UI with streaming-like UX and automatic scroll
- Session persistence across reloads (localStorage)
- One‑click “Reset Session” and “Reload Knowledge Base”
- Sources rendering with compact styling
- Sticky header and fixed composer for consistent controls
- Responsive, dark themed design

## Requirements & Technologies
- Node.js 18+ and npm
- React 18 
- Vite 5 
- JavaScript (ES2020+), JSX
- CSS 
- Fetch API for HTTP requests
- Optional: Netlify for static hosting 

## Getting Started (Local Dev)
```bash

npm install


npm run dev
```

## Production Build
```bash
npm run build
npm run preview  
```
The production output is generated in `dist/`.


## Project Structure
```
frontend/
  public/
    _redirects          # Netlify proxy + SPA fallback
  src/
    App.jsx             # Main application
    api.js              # API helpers
    main.jsx            # React bootstrap
    styles.css          # Styles
  index.html            # Vite entry document
  vite.config.js        # Vite + proxy config
```

## Available Scripts
- `npm run dev` — start dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the build locally

## API Endpoints (expected)
The UI expects a backend exposing:
- `POST /api/session/create` — returns `{ sessionId }`
- `POST /api/chat` — body `{ sessionId, message }`, returns `{ sessionId, answer, timestamp }`
- `GET  /api/session/:sessionId/history` — prior messages
- `POST /api/refresh-rag` — re‑ingest/refresh RAG data



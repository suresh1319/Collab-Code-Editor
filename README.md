# CollabCE

Real-time collaborative coding in the browser. Create rooms, edit shared files, manage access, and work on the same project with your team from a single web app.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Deployment Notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap Ideas](#roadmap-ideas)
- [License](#license)

## Overview

CollabCE is a multiplayer code editor built around shared rooms. It combines a React-based editing experience with Yjs-powered collaboration and a Node.js backend that serves both the app and the real-time sync layer.

The project is aimed at developers who want:

- real-time shared editing
- multi-file project management
- lightweight role-based access control
- fast room sharing without heavy setup

## Features

### Real-Time Collaboration

- Yjs CRDT syncing for conflict-free shared editing
- live cursors so teammates can see where others are typing
- per-file collaboration across the same room

### Project Workspace

- VS Code-style file and folder explorer
- inline create, rename, and delete actions
- multi-file tabs for switching between open files quickly

### Access Control

- admin, editor, and viewer roles
- per-user write access toggles
- request/approve edit flow for read-only participants

### Project Import and Export

- upload individual files or entire folders
- preserve project structure during uploads
- download the active project as a ZIP archive

### Editor Experience

- syntax highlighting based on file extension
- light and dark theme support
- room sharing through generated invite links

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React, React Router, CodeMirror 5 |
| Collaboration | Yjs, y-websocket, y-codemirror |
| Backend | Node.js, Express, Socket.IO |
| Styling | Vanilla CSS with CSS variables |
| Utilities | JSZip, UUID, React Hot Toast |

## Getting Started

### Prerequisites

- Node.js 18 or later recommended
- npm 9 or later

### Installation

```bash
git clone https://github.com/suresh1319/Collab-Code-Editor.git
cd Collab-Code-Editor
npm install
```

### Run Locally

Start frontend and backend together:

```bash
npm run dev
```

App endpoints:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

If you want to run services separately:

```bash
npm run server
npm start
```

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the React development server |
| `npm run server` | Start the Express and Socket.IO backend with Nodemon |
| `npm run dev` | Run frontend and backend together |
| `npm run build` | Create a production build |
| `npm test` | Run the React test suite |
| `npm run prod` | Build the app and start the production server |
| `npm run server-only` | Run the alternate standalone server entry |

## Environment Variables

Create a local `.env` file when needed.

```bash
cp .env.example .env
```

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Backend server port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed frontend origin for CORS |
| `REACT_APP_BACKEND_URL` | `http://localhost:3001` | Backend URL used by the React frontend |

## Project Structure

```text
Collab-Code-Editor/
|-- src/
|   |-- components/      Reusable UI pieces such as the editor, explorer, tabs, and modals
|   |-- hooks/           Shared React hooks such as code execution helpers
|   |-- pages/           Route-level screens like landing, join, and editor
|   |-- utils/           ZIP export, preview handling, and helper logic
|   |-- Actions.js       Shared socket event constants
|   |-- socket.js        Frontend socket initialization
|-- server.js            Main Express + Socket.IO + Yjs entrypoint
|-- build/               Production build output
|-- README.md            Project documentation
```

## Deployment Notes

CollabCE serves the React build and the real-time collaboration backend from the same Node.js app, which makes deployment simpler than splitting the stack.

Suggested production flow:

```bash
npm install
npm run build
node server.js
```

This setup works well on platforms such as Render or Railway as long as the deployed frontend origin matches `CLIENT_ORIGIN`.

## Troubleshooting

### App loads but rooms do not sync

- confirm the frontend is pointing to the correct backend origin
- verify the backend is running on the expected port
- check browser console output for WebSocket connection errors

### Changes are not reflected for collaborators

- make sure all users joined the same room ID
- verify the backend process did not restart mid-session
- inspect `server.js` logs for socket or Yjs upgrade issues

### Build or install problems

- remove `node_modules` and reinstall with `npm install`
- confirm your Node.js version is compatible with `react-scripts`

## Contributing

Contributions are welcome. A clean contribution flow helps maintainers review faster.

### Suggested Workflow

1. Fork the repository.
2. Create a focused branch such as `fix/mobile-layout` or `docs/readme-onboarding`.
3. Make one scoped change at a time.
4. Run the most relevant verification command before opening the PR.
5. Open a pull request with a short summary and exact test or verification commands.

### Pull Request Guidance

- keep PRs small and issue-focused
- describe what changed and why
- mention any known unrelated failures clearly
- include screenshots or GIFs for visible UI changes when available

### Commit Style

Short, descriptive commit messages work best. Examples:

- `fix: improve mobile editor layout`
- `feat: add reusable public footer`
- `docs: improve readme onboarding`

## Roadmap Ideas

These are not commitments, but useful directions for future contributors:

- richer onboarding screenshots or demo GIFs
- stronger mobile editor ergonomics
- better execution diagnostics for the built-in runner
- improved contributor docs and architectural diagrams

## License

MIT

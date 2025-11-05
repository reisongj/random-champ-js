# League of Legends - Random Champion Selector

A modern React/TypeScript application for randomly selecting League of Legends champions for each lane. Once a champion is locked in, it's tracked globally across all roles and won't be available for future selections until you reset.

## Features

- **5 Lanes**: Top, Jungle, Mid, ADC, and Support
- **Random Selection**: Randomly select a champion for each lane
- **Global Tracking**: Champions are tracked across all roles - once used, they're unavailable
- **Re-randomize**: After all lanes are randomized, you can re-randomize any one lane
- **Lock-in Teams**: Lock in your team to save it and mark champions as played
- **Saved Teams**: View and display previously saved teams
- **Reset Functionality**: Reset all played champions to make them available again
- **Champion Images**: Loads champion images from Riot's Data Dragon API
- **Persistent Storage**: Your played champions and saved teams are stored locally

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Data Dragon API** for champion images

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── Lane.tsx        # Individual lane component
│   ├── ReRandomizeSection.tsx
│   ├── LockInButton.tsx
│   ├── ResetButton.tsx
│   ├── SavedTeamsButton.tsx
│   ├── LockedConfirmation.tsx
│   └── Tooltip.tsx
├── data/               # Data and constants
│   └── champions.ts   # Champion pools and lane info
├── store/              # State management
│   └── useAppStore.ts # Zustand store
├── types/              # TypeScript types
│   └── index.ts
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## How It Works

1. **Randomize**: Click the "RANDOMIZE" button for any lane to get a random champion
2. **Re-randomize**: After all 5 lanes have champions, you can re-randomize any one lane
3. **Lock-in**: After re-randomizing (or if you're happy with all selections), click "LOCK IN TEAM"
4. **Saved Teams**: View your saved teams and display them in the UI
5. **Reset**: Reset all played champions to start fresh

## Champion Data

Champion data is stored in `src/data/champions.ts`. The app uses Riot's Data Dragon API (version 14.22.1) to load champion images.

## License

No license specified.

## Deploying

See `RENDER.md` for a step-by-step Render.com deployment checklist and troubleshooting tips (port binding, start/build commands).

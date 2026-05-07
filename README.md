# Scoring App

A real-time multiplayer scoring app. A host creates a room, adds players, and everyone joins via a QR code or room code. Scores update live for all participants and are displayed on a projected leaderboard chart.

## How it works

1. **Host** goes to the home page, creates a room with a name, and is taken to the host panel at `/host/:code`.
2. **Host** adds player names and shares the room code or QR code.
3. **Players** visit the site, enter the room code (or scan the QR), select their name, and can increment/decrement their own score.
4. **Host** can also adjust any player's score, reset scores, or remove players from the host panel.
5. The **chart view** (`/chart/:code`) shows a live animated bar chart — designed to be projected on a screen.

## Routes

| Path | Description |
|------|-------------|
| `/` | Home — create or join a room |
| `/host/:code` | Host panel — manage players and scores |
| `/:code` | Guest view — join and adjust your score |
| `/chart/:code` | Live leaderboard bar chart |

## Features

- Real-time updates via Supabase Realtime — all views stay in sync instantly
- QR code on the host panel and chart view for easy player onboarding
- Sortable player grid: creation order, alphabetical, current score snapshot, or live score
- Animated bar chart that handles negative scores and auto-scales to fit the player count
- Fullscreen mode on the chart view (button or press `F`)
- Editable room title from the host panel

## Tech stack

- **React + TypeScript** via Vite
- **MUI** for UI components
- **Framer Motion** for layout animations
- **Supabase** for the real-time database backend
- **React Router** for routing

## Getting started

```bash
npm install
npm run dev
```

You'll need a Supabase project with `rooms` and `guests` tables. Set your Supabase URL and anon key in `src/supabase.ts`.

### Database schema

```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz default now()
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  score integer default 0,
  created_at timestamptz default now()
);
```

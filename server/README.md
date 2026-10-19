# Tap In rooms server

Small socket.io server that owns party state (players, current card, whose turn, punishments).
Phones only send actions; the server broadcasts `room_state`. Protocol types live in `../src/protocol.ts`
and card drawing reuses `../src/game.ts`, so build context is the repo root (`server/Dockerfile`).

Env: `PORT` (default 8787), `CORS_ORIGINS` (comma-separated page origins). Health: `GET /health`.
Frontend points at it with `VITE_SERVER_URL` (set as a GitHub Actions repository variable for the Pages build).

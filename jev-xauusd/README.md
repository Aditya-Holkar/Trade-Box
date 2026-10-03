# Jev XAUUSD

This is a completely standalone application inside the repository.

It does **not** import, call, or modify the existing Trade-Box application.

## Architecture

Browser → standalone Next.js app → XAUUSD feature engine → Jev API → risk gate → optional MT5 order

The MT5 bridge is a separate Python/FastAPI process.

## Run

### 1. MT5 bridge

From this directory:

```bash
cd mt5
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python mt5_service.py
```

Keep MetaTrader 5 open, logged in, and make sure the broker exposes the symbol configured by `MT5_SYMBOL`.

### 2. Next.js app

In another terminal:

```bash
npm install
npm run dev
```

The app runs on port 3010:

`http://localhost:3010`

### 3. Environment

Copy `.env.example` to `.env.local`.

Set `JEVMODEL_API_KEY` for the hosted Jev decision model. If it is empty, the app uses its deterministic local fallback so the pipeline can still be tested.

Keep `DRY_RUN=true` until you have completed testing.

## Important

This application is intentionally separate from the root Trade-Box app. It has its own package.json, Next.js config, source tree, API route, and MT5 bridge.

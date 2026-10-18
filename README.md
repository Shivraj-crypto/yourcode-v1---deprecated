# YourCode

YourCode is a browser-based coding practice workspace. Python solutions run locally in a dedicated Web Worker; no user code is sent to a remote execution service.

## Run locally

```sh
npm install
npm run dev
```

## Local data

Workspace data, including editor code and submission history, is stored in a single SQLite database in the browser. The SQLite database file is persisted locally in IndexedDB; no application server or remote database is required. Existing `yourcode_state_v3` localStorage data is migrated when the database is first opened. JSON backup import and export remain available.

## Phase 1 Python runner

The editor uses Monaco. The first Python run initializes the pinned `pyodide` package (`314.0.7`) inside `src/workers/python.worker.js`; later runs reuse that worker. Vite copies the matching WebAssembly, standard library, and lockfile assets from `node_modules/pyodide` into the ignored `public/pyodide` directory at startup/build time. Each testcase runs in a fresh Python globals dictionary, and results include captured stdout/stderr and Python errors.

## Execution limits

Worker execution keeps Python from blocking the React UI, but a Web Worker is not a complete security sandbox. This phase does not yet implement a time limit or worker cancellation; runaway code can occupy its worker until the page is refreshed. Do not treat client-side results as authoritative or execute code on behalf of untrusted users in a privileged application context.

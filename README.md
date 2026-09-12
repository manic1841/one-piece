# One Piece

## Install dependencies

```bash
pnpm install
```

## Run dev locally

```bash
pnpm run dev
```

## Run the Docker development stack

```bash
docker compose up --build
```

The app is available at http://localhost:5173 and the Firebase Emulator UI is
available at http://localhost:4000. The stack uses the development Firebase
project configuration and publishes Firestore/Auth on ports `8080` and `9099`.
Set `VITE_PORT` when port `5173` is already in use, for example
`VITE_PORT=5174 docker compose up --build`.

Run the test suites in the same environment with:

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

To run only the Firebase Emulator without the Vite app, use
`docker compose up --build firebase`.

## Test and lint

See the [Testing Guide](docs/testing.md) for the full test strategy, emulator
setup, and E2E roadmap.

```bash
pnpm test              # unit tests (no emulator needed)
pnpm test:integration  # integration tests (requires emulator)
pnpm test:coverage     # unit tests with coverage report
pnpm lint
pnpm lint:fix
npx tsc --noEmit       # typecheck
```

## Deploy firebase rules

```bash
firebase deploy --only firestore:rules
```

## Code Style & Formatting

This project uses **ESLint** and **Prettier** to maintain high code quality and consistency.

### Automatic Import Sorting

This project uses `@trivago/prettier-plugin-sort-imports` to automatically sort and group imports.

> [!NOTE]
> To avoid formatting conflicts, ESLint's `import/order` and `sort-imports` rules are disabled. **Prettier is the single source of truth for import sorting.**

The sorting rules are:

1.  **React & Core**: `react`, `react-dom`
2.  **Third-party Modules**: All external npm packages
3.  **Internal Aliases**: Modules starting with `@/`
4.  **Relative Imports**: Parents (`../`) and siblings (`./`)

### Commands

- **Format Code**: `pnpm format` (Runs Prettier to sort imports and format files)
- **Lint Code**: `pnpm lint` (Runs ESLint as a read-only quality check)
- **Fix lint issues**: `pnpm lint:fix` (Runs ESLint with automatic fixes)

Imports are automatically sorted by Prettier. It is recommended to configure your IDE to run Prettier on save.

# One Piece

## Install dependencies

```bash
pnpm install
```

## Run dev locally

```bash
pnpm run dev
```

The full Docker development stack, emulator wiring and port overrides are
documented in [Operations](docs/operations.md#3-docker-開發環境).

## Test, lint and deploy

Every command, the CI pipeline and the release flow live in
[Operations](docs/operations.md). Test strategy is in
[Testing Guide](docs/testing.md).

## Code Style & Formatting

Prettier is the single source of truth for formatting and import sorting (config in
`.prettierrc`); ESLint covers quality. Run `pnpm format` before committing.

Coding conventions live in [Development Guide](docs/development-guide.md).

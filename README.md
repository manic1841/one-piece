# One Piece

## Install dependencies

```bash
pnpm install
```

## Run dev

```bash
pnpm run dev
```

## Run firebase emulator

```bash
pnpm run emulators:start
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
- **Lint Code**: `pnpm lint` (Runs ESLint to check for code quality issues and fix them)

Imports are automatically sorted by Prettier. It is recommended to configure your IDE to run Prettier on save.

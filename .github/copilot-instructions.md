# Moora Project Instructions

## Package Manager

**Always use `bun` as the package manager for this project.**

- Install dependencies: `bun install`
- Run scripts: `bun run <script>`
- Add packages: `bun add <package>`
- Remove packages: `bun remove <package>`

## Project Structure

This is a **monorepo** using Bun workspaces. The structure is:

```
moora/
├── packages/          # All workspace packages
│   ├── package-name/  # Individual package
│   │   ├── src/       # Source code
│   │   ├── tests/     # Test files
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── eslint.config.js
│   └── ...
├── scripts/           # Build and utility scripts
└── docs/              # Documentation
```

### Creating New Packages

When creating a new package in `packages/`, follow these conventions:

1. **Package naming**: Use `@moora/<package-name>` as the package name
2. **Package structure**:
   ```
   packages/your-package/
   ├── src/
   │   └── index.ts          # Main entry point
   ├── tests/                # Test files (*.test.ts)
   ├── package.json
   ├── tsconfig.json
   ├── vitest.config.ts      # If the package has tests
   ├── eslint.config.js
   └── README.md
   ```

3. **package.json template**:
   ```json
   {
     "name": "@moora/your-package",
     "version": "0.1.0",
     "description": "Package description",
     "main": "src/index.ts",
     "module": "src/index.ts",
     "type": "module",
     "private": false,
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "https://github.com/shazhou-ww/moora.git",
       "directory": "packages/your-package"
     },
     "devDependencies": {
       "@moora/eslint-config": "workspace:*",
       "@types/bun": "latest",
       "typescript": "^5",
       "vitest": "^4.0.12"
     },
     "peerDependencies": {
       "typescript": "^5"
     },
     "scripts": {
       "test": "vitest --run --no-ui",
       "test:coverage": "vitest --run --coverage --no-ui",
       "test:ci": "vitest --run --coverage --no-ui"
     }
   }
   ```

4. **eslint.config.js**: Use shared config from `@moora/eslint-config`
   ```js
   import { base } from "@moora/eslint-config";
   
   export default [
     {
       files: ["src/**/*.{ts,tsx}"],
       ...base[0],
       languageOptions: {
         ...base[0].languageOptions,
         parserOptions: {
           project: "./tsconfig.json",
         },
       },
     },
     {
       ignores: ["dist", "node_modules"],
     },
   ];
   ```

5. **Key requirements**:
   - Must use `"type": "module"` for ESM
   - Must include `@moora/eslint-config` in devDependencies
   - Entry point should be `src/index.ts`
   - Must have proper TypeScript configuration
   - Should include test scripts if applicable

## Code Quality Checks

Before committing code or creating PRs, **always run these checks**:

### 1. Lint Check

```bash
bun run lint
```

Or check with max warnings (stricter):

```bash
bun run lint:check
```

To auto-fix linting issues:

```bash
bun run lint:fix
```

### 2. Type Check

```bash
bun run typecheck
```

This runs TypeScript compiler in all packages to check for type errors.

### 3. Test Check

Run all tests:

```bash
bun run test
```

Run tests with coverage:

```bash
bun run test:coverage
```

Run tests in CI mode (no watch):

```bash
bun run test:ci
```

## Development Workflow

1. **Make changes** in the relevant package(s)
2. **Run checks**:
   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```
3. **Fix any errors** before committing
4. **Commit** with descriptive messages

## Working with Packages

To work on a specific package:

```bash
cd packages/<package-name>
```

To add a dependency to a specific package:

```bash
cd packages/<package-name>
bun add <dependency>
```

To add a workspace dependency (internal package):

```bash
bun add @moora/<package-name>@workspace:*
```

## Important Notes

- All packages use **ESM** (ES Modules), not CommonJS
- Shared ESLint config is in `packages/eslint-config`
- TypeScript is used throughout the project
- Follow the existing code style and conventions

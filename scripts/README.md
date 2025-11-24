# Scripts Documentation

This directory contains utility scripts for managing the moora monorepo.

## Structure

```
scripts/
├── publish.ts          # Main publish management CLI
└── utils/
    ├── git.ts         # Git operations
    ├── package.ts     # Package management
    ├── version.ts     # Version validation
    └── registry.ts    # NPM registry operations
```

## Usage

All scripts are designed to be run from the root of the monorepo using Bun:

```bash
bun run scripts/publish.ts <command> [options]
```

Or via the npm scripts defined in the root `package.json`:

```bash
bun run prepare-version <type>
bun run prepublish
bun run publish [--dry-run]
```

## Utilities

### git.ts

Provides Git operations:
- `getCurrentBranch()` - Get current branch name
- `hasUncommittedChanges()` - Check for uncommitted changes
- `commitChanges(message)` - Commit all changes
- `createTag(name, message)` - Create annotated tag
- `getCurrentCommitHash()` - Get current commit SHA
- `getTagCommitHash(tag)` - Get commit SHA of a tag

### package.ts

Provides package management:
- `getAllPackages()` - Get all non-private packages
- `getRootPackageJson()` - Get root package.json
- `getPackageJson(dir)` - Read package.json from directory
- `savePackageJson(path, data)` - Save package.json
- `findCircularDependencies()` - Detect circular dependencies

### version.ts

Provides version validation:
- `validateVersion(version)` - Validate semver format
- `isValidPrereleaseVersion(version)` - Check prerelease format
- `parsePrereleaseInfo(version)` - Parse prerelease ID and number

### registry.ts

Provides NPM registry operations:
- `getPublishedVersion(name)` - Get latest published version
- `packageExists(name)` - Check if package exists
- `getAllPublishedVersions(name)` - Get all versions

## Development

To modify or extend the scripts:

1. Edit the TypeScript files
2. Test with `bun run scripts/publish.ts --help`
3. No build step needed - Bun executes TypeScript directly

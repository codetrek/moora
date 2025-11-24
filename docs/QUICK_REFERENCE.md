# Quick Reference Card

## Common Commands

```bash
# Version Management
bun run prepare-version patch              # 0.1.0 -> 0.1.1
bun run prepare-version minor              # 0.1.0 -> 0.2.0
bun run prepare-version major              # 0.1.0 -> 1.0.0
bun run prepare-version prerelease --prerelease-id a  # 0.1.0 -> 0.1.1-a1

# Publishing
bun run prepublish                         # Run checks only
bun run publish:dry-run                    # Test publish
bun run publish                            # Actual publish

# After prepare-version
git push && git push --tags                # Push changes and tags
```

## Release Checklist

- [ ] All changes committed
- [ ] On main branch
- [ ] Run `bun run prepare-version <type>`
- [ ] Review changes
- [ ] Run `git push && git push --tags`
- [ ] Run `bun run publish:dry-run`
- [ ] Run `bun run publish`

## Version Format Rules

✓ Standard: `1.2.3`
✓ Prerelease: `1.2.3-a1`, `1.2.3-b15`
✗ Invalid: `1.2.3-alpha1`, `1.2.3-rc.1`

## Prepublish Checks

1. Version alignment
2. Dependency versions
3. No circular dependencies
4. Valid version format
5. Registry version check
6. Package prepublishOnly
7. No uncommitted changes
8. Version tag exists

## Package Structure

```json
{
  "name": "@moora/package-name",
  "version": "0.1.0",
  "dependencies": {
    "@moora/other": "0.1.0"  // Exact version
  }
}
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| Not on main branch | `git checkout main` |
| Uncommitted changes | `git add . && git commit -m "..."` |
| Tag doesn't exist | Run `prepare-version` first |
| Version not greater | Use higher bump type |
| prepublishOnly fails | Fix package build/tests |

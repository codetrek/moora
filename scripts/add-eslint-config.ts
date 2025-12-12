#!/usr/bin/env bun

/**
 * Add @moora/eslint-config dependency to all packages
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const packagesDir = join(import.meta.dir, '..', 'packages');

function updatePackageJson(packagePath: string) {
  const packageJsonPath = join(packagePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  // Skip eslint-config package itself
  if (packageJson.name === '@moora/eslint-config') {
    return;
  }

  // Check if it has devDependencies
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  // Add eslint-config if not present
  if (!packageJson.devDependencies['@moora/eslint-config']) {
    packageJson.devDependencies['@moora/eslint-config'] = '0.1.0';

    // Sort devDependencies alphabetically
    const sortedDeps: Record<string, string> = {};
    Object.keys(packageJson.devDependencies).sort().forEach(key => {
      sortedDeps[key] = packageJson.devDependencies[key];
    });
    packageJson.devDependencies = sortedDeps;

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated ${packageJson.name}`);
  }
}

function main() {
  const packages = readFileSync(join(packagesDir, '..', 'package.json'), 'utf8');
  const packageJson = JSON.parse(packages);

  // Get workspace packages
  const workspaces = packageJson.workspaces || [];
  const packageDirs = workspaces.flatMap((pattern: string) => {
    if (pattern === 'packages/*') {
      return readFileSync(packagesDir, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(name => join(packagesDir, name));
    }
    return [];
  });

  for (const packagePath of packageDirs) {
    updatePackageJson(packagePath);
  }

  console.log('All packages updated!');
}

if (import.meta.main) {
  main();
}
import { readdir } from "fs/promises";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";

export interface Package {
  name: string;
  version: string;
  path: string;
}

export interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: any;
}

/**
 * Get all packages in the monorepo
 */
export async function getAllPackages(): Promise<Package[]> {
  const packagesDir = join(process.cwd(), "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });

  const packages: Package[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const packagePath = join(packagesDir, entry.name);
      const pkgJson = await getPackageJson(packagePath);

      if (!pkgJson.private) {
        packages.push({
          name: pkgJson.name,
          version: pkgJson.version,
          path: packagePath,
        });
      }
    }
  }

  return packages;
}

/**
 * Get the root package.json
 */
export async function getRootPackageJson(): Promise<PackageJson> {
  return getPackageJson(process.cwd());
}

/**
 * Get package.json from a directory
 */
export async function getPackageJson(dir: string): Promise<PackageJson> {
  const pkgPath = join(dir, "package.json");
  const content = await readFile(pkgPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Save package.json to a file
 */
export async function savePackageJson(
  path: string,
  pkgJson: PackageJson
): Promise<void> {
  await writeFile(path, JSON.stringify(pkgJson, null, 2) + "\n", "utf-8");
}

/**
 * Find circular dependencies in packages
 */
export async function findCircularDependencies(
  packages: Package[]
): Promise<string[][]> {
  const graph = new Map<string, string[]>();

  // Build dependency graph
  for (const pkg of packages) {
    const pkgJson = await getPackageJson(pkg.path);
    const deps: string[] = [];

    if (pkgJson.dependencies) {
      for (const depName of Object.keys(pkgJson.dependencies)) {
        if (depName.startsWith("@moora/")) {
          deps.push(depName);
        }
      }
    }

    graph.set(pkg.name, deps);
  }

  // Detect cycles using DFS
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), neighbor];
        cycles.push(cycle);
      }
    }

    recursionStack.delete(node);
  }

  for (const pkg of packages) {
    if (!visited.has(pkg.name)) {
      dfs(pkg.name, []);
    }
  }

  return cycles;
}

/**
 * Get dependency graph for topological sorting
 */
export async function getDependencyGraph(
  packages: Package[]
): Promise<Map<string, string[]>> {
  const graph = new Map<string, string[]>();

  for (const pkg of packages) {
    const pkgJson = await getPackageJson(pkg.path);
    const deps: string[] = [];

    if (pkgJson.dependencies) {
      for (const depName of Object.keys(pkgJson.dependencies)) {
        if (depName.startsWith("@moora/")) {
          deps.push(depName);
        }
      }
    }

    graph.set(pkg.name, deps);
  }

  return graph;
}

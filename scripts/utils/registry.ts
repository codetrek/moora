import { $ } from "bun";

/**
 * Get the published version of a package from npm registry
 */
export async function getPublishedVersion(
  packageName: string
): Promise<string | null> {
  try {
    const result = await $`npm view ${packageName} version`.quiet();
    const version = result.stdout.toString().trim();
    return version || null;
  } catch {
    // Package doesn't exist in registry
    return null;
  }
}

/**
 * Check if a package exists in the registry
 */
export async function packageExists(packageName: string): Promise<boolean> {
  const version = await getPublishedVersion(packageName);
  return version !== null;
}

/**
 * Get all published versions of a package
 */
export async function getAllPublishedVersions(
  packageName: string
): Promise<string[]> {
  try {
    const result = await $`npm view ${packageName} versions --json`.quiet();
    const versions = JSON.parse(result.stdout.toString());
    return Array.isArray(versions) ? versions : [versions];
  } catch {
    return [];
  }
}

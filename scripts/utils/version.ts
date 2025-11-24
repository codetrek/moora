import * as semver from "semver";

/**
 * Validate version format
 * Accepts standard semver (e.g., 0.1.2) and strict prerelease versions (e.g., 0.1.2-a1)
 */
export function validateVersion(version: string): boolean {
  // Check if it's valid semver
  if (!semver.valid(version)) {
    return false;
  }

  const prerelease = semver.prerelease(version);

  // If no prerelease, it's a standard version - valid
  if (!prerelease) {
    return true;
  }

  // If has prerelease, check format: must be exactly [letter, number]
  return isValidPrereleaseVersion(version);
}

/**
 * Check if version has valid prerelease format
 * Valid format: x.y.z-a1, x.y.z-b2, etc.
 * Invalid: x.y.z-alpha.1, x.y.z-rc1, x.y.z-a1.2
 */
export function isValidPrereleaseVersion(version: string): boolean {
  const prerelease = semver.prerelease(version);

  if (!prerelease || prerelease.length !== 2) {
    return false;
  }

  const [id, num] = prerelease;

  // First part must be a single lowercase letter
  if (typeof id !== "string" || !/^[a-z]$/.test(id)) {
    return false;
  }

  // Second part must be a positive integer
  if (typeof num !== "number" && typeof num !== "string") {
    return false;
  }

  const numValue = typeof num === "string" ? parseInt(num, 10) : num;
  if (!Number.isInteger(numValue) || numValue < 1) {
    return false;
  }

  return true;
}

/**
 * Parse prerelease info from version
 */
export function parsePrereleaseInfo(
  version: string
): { id: string; number: number } | null {
  const prerelease = semver.prerelease(version);

  if (!prerelease || prerelease.length !== 2) {
    return null;
  }

  const [id, num] = prerelease;
  const numValue = typeof num === "string" ? parseInt(num, 10) : num;

  if (typeof numValue !== "number" || !Number.isInteger(numValue)) {
    return null;
  }

  return {
    id: id as string,
    number: numValue,
  };
}

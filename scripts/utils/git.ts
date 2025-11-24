import { $ } from "bun";

/**
 * Execute a shell command and return the output
 */
export async function execCommand(command: string): Promise<string> {
  try {
    const result = await $`${command}`.quiet();
    return result.stdout.toString().trim();
  } catch (error: any) {
    throw new Error(error.stderr?.toString() || error.message);
  }
}

/**
 * Get the current git branch
 */
export async function getCurrentBranch(): Promise<string> {
  return execCommand("git rev-parse --abbrev-ref HEAD");
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  const status = await execCommand("git status --porcelain");
  return status.length > 0;
}

/**
 * Commit all changes with a message
 */
export async function commitChanges(message: string): Promise<void> {
  await execCommand(`git add .`);
  await execCommand(`git commit -m "${message}"`);
}

/**
 * Create a git tag
 */
export async function createTag(
  tagName: string,
  message: string
): Promise<void> {
  await execCommand(`git tag -a ${tagName} -m "${message}"`);
}

/**
 * Get the current commit hash
 */
export async function getCurrentCommitHash(): Promise<string> {
  return execCommand("git rev-parse HEAD");
}

/**
 * Get the commit hash that a tag points to
 */
export async function getTagCommitHash(tagName: string): Promise<string | null> {
  try {
    return await execCommand(`git rev-list -n 1 ${tagName}`);
  } catch {
    return null;
  }
}

/**
 * Check if a tag exists
 */
export async function tagExists(tagName: string): Promise<boolean> {
  try {
    await execCommand(`git rev-parse ${tagName}`);
    return true;
  } catch {
    return false;
  }
}

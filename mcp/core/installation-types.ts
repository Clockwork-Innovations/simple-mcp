/**
 * Type definitions for automatic dependency installation
 * Feature 3: Auto-Installation
 */

/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Options for dependency installation
 */
export interface InstallOptions {
  /**
   * Package manager to use (auto-detected if not specified)
   * @default 'auto' (detects from lock files)
   */
  packageManager?: PackageManager | 'auto';

  /**
   * Working directory for installation
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Installation timeout in milliseconds
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Number of retry attempts on failure
   * @default 3
   */
  retries?: number;

  /**
   * Ignore install scripts (security - prevents arbitrary code execution)
   * @default true
   */
  ignoreScripts?: boolean;

  /**
   * Install only production dependencies
   * @default false
   */
  production?: boolean;

  /**
   * Force reinstall even if already installed
   * @default false
   */
  force?: boolean;

  /**
   * Progress callback for installation updates
   */
  onProgress?: (event: InstallProgressEvent) => void;

  /**
   * Error callback for installation errors
   */
  onError?: (error: InstallError) => void;
}

/**
 * Result of dependency installation
 */
export interface InstallResult {
  /**
   * Whether installation succeeded
   */
  success: boolean;

  /**
   * List of successfully installed packages
   */
  installed: string[];

  /**
   * List of packages that failed to install
   */
  failed: string[];

  /**
   * List of packages that were skipped (already installed)
   */
  skipped: string[];

  /**
   * Package manager used for installation
   */
  packageManager: string;

  /**
   * Path to generated/updated lock file
   */
  lockFile: string | null;

  /**
   * Installation duration in milliseconds
   */
  duration: number;

  /**
   * Installation errors (if any)
   */
  errors: InstallError[];

  /**
   * Non-fatal warnings
   */
  warnings: string[];
}

/**
 * Progress event during installation
 */
export interface InstallProgressEvent {
  /**
   * Event type
   */
  type: 'start' | 'progress' | 'complete' | 'error';

  /**
   * Package currently being processed
   */
  packageName?: string;

  /**
   * Human-readable progress message
   */
  message: string;

  /**
   * Event timestamp
   */
  timestamp: number;
}

/**
 * Installation error
 */
export interface InstallError {
  /**
   * Package that failed to install (optional)
   */
  packageName?: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error code (optional)
   */
  code?: string;

  /**
   * Stack trace (optional)
   */
  stack?: string;
}

/**
 * Dependency status (installed vs missing)
 */
export interface DependencyStatus {
  /**
   * List of installed packages
   */
  installed: string[];

  /**
   * List of missing packages
   */
  missing: string[];

  /**
   * List of outdated packages (installed but wrong version)
   */
  outdated: Array<{
    name: string;
    current: string;
    required: string;
  }>;
}

/**
 * Package manager information
 */
export interface PackageManagerInfo {
  /**
   * Package manager name
   */
  name: PackageManager;

  /**
   * Package manager version
   */
  version: string;

  /**
   * Whether package manager is available
   */
  available: boolean;

  /**
   * Lock file name for this package manager
   */
  lockFile: string;
}

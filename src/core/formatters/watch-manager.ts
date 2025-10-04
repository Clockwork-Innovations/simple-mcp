/**
 * Watch mode manager for auto-rebuild on file changes
 * Feature 4.2: Watch Mode
 */

import * as chokidar from 'chokidar';
import { bundle } from '../bundler.js';
import { BundleOptions, BundleResult } from '../bundle-types.js';
import { ChildProcess, spawn } from 'child_process';

/**
 * Options for watch mode
 */
export interface WatchOptions {
  /**
   * Bundle options to use for builds
   */
  bundleOptions: BundleOptions;

  /**
   * Use polling instead of native file system events
   * Useful for network drives or Docker volumes
   * @default false
   */
  poll?: boolean;

  /**
   * Polling interval in milliseconds
   * @default 100
   */
  interval?: number;

  /**
   * Glob patterns to ignore
   * @default ['** /node_modules/** ', '** /.git/** ', '** /dist/** ']
   */
  ignored?: string[];

  /**
   * Auto-restart server after successful rebuild
   * @default false
   */
  restart?: boolean;

  /**
   * Callback called after each rebuild
   */
  onRebuild?: (error: Error | null, result: BundleResult | null) => void;
}

/**
 * Global server process reference for restarts
 */
let serverProcess: ChildProcess | null = null;

/**
 * Start watch mode
 *
 * Performs initial build, then watches for file changes and rebuilds
 * automatically. Supports optional auto-restart of server process.
 *
 * @param options - Watch options
 *
 * @example
 * ```typescript
 * await startWatch({
 *   bundleOptions: {
 *     entry: './server.ts',
 *     output: './dist/server.js',
 *     format: 'single-file'
 *   },
 *   restart: true
 * });
 * ```
 */
export async function startWatch(options: WatchOptions): Promise<void> {
  const { bundleOptions, poll, interval, ignored, restart, onRebuild } = options;

  console.log('[watch] Build started...');

  // Initial build
  let result = await bundle(bundleOptions);

  if (result.success) {
    console.log(`[watch] ✓ Build succeeded in ${result.duration}ms`);
  } else {
    console.error(`[watch] ✗ Build failed`);
    result.errors.forEach(err => console.error(`  - ${err.message}`));
  }

  console.log('[watch] Watching for changes...');

  // Setup watcher
  const watcher = chokidar.watch(bundleOptions.entry, {
    ignored: ignored || ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    persistent: true,
    usePolling: poll,
    interval: interval || 100,
    ignoreInitial: true, // Don't trigger on initial scan
  });

  // Handle file changes
  watcher.on('change', async (changedPath) => {
    console.log(`[watch] Changed: ${changedPath}`);
    console.log('[watch] Rebuilding...');

    const rebuildStart = Date.now();

    try {
      result = await bundle(bundleOptions);

      if (result.success) {
        const rebuildTime = Date.now() - rebuildStart;
        console.log(`[watch] ✓ Build succeeded in ${rebuildTime}ms`);

        // Restart server if requested
        if (restart) {
          await restartServer(result.outputPath);
        }

        // Call user callback
        onRebuild?.(null, result);
      } else {
        console.error(`[watch] ✗ Build failed`);
        result.errors.forEach(err => console.error(`  - ${err.message}`));
        onRebuild?.(new Error('Build failed'), null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[watch] ✗ Build error:`, errorMessage);
      onRebuild?.(error instanceof Error ? error : new Error(errorMessage), null);
    }
  });

  // Handle watcher errors
  watcher.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[watch] Watcher error:', errorMessage);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[watch] Stopping...');
    watcher.close();

    // Kill server process if running
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }

    process.exit(0);
  });
}

/**
 * Restart server after rebuild
 *
 * Kills the existing server process (if running) and starts a new one
 * with the freshly built bundle.
 *
 * @param bundlePath - Path to the bundled server file
 *
 * @example
 * ```typescript
 * await restartServer('./dist/server.js');
 * ```
 */
async function restartServer(bundlePath: string): Promise<void> {
  console.log('[watch] Restarting server...');

  // Kill existing server process if running
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;

    // Wait a bit for the process to fully terminate
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Start new server process
  serverProcess = spawn('node', [bundlePath], {
    stdio: 'inherit',
  });

  serverProcess.on('error', (error) => {
    console.error(`[watch] Server error:`, error.message);
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[watch] Server exited with code ${code}`);
    }
  });
}

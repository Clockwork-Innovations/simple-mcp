/**
 * Configuration file loader for SimplyMCP bundling
 * Feature 4.1: Core Bundling - Config Loader
 */

import { readFile } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import type { SimplyMCPConfig, BundleOptions } from './bundle-types.js';

/**
 * Load configuration from file
 * @param configPath - Explicit config file path (optional)
 * @param cwd - Working directory (default: process.cwd())
 * @returns Parsed configuration or null if not found
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<SimplyMCPConfig | null> {
  const configFile = configPath
    ? resolve(cwd, configPath)
    : await findConfigFile(cwd);

  if (!configFile) {
    return null;
  }

  if (!existsSync(configFile)) {
    throw new Error(`Config file not found: ${configFile}`);
  }

  return parseConfig(configFile);
}

/**
 * Find config file by convention
 * @param cwd - Working directory
 * @returns Path to config file or null if not found
 */
async function findConfigFile(cwd: string): Promise<string | null> {
  const candidates = [
    'simplemcp.config.js',
    'simplemcp.config.mjs',
    'simplemcp.config.json',
    'simplymcp.config.js',
    'simplymcp.config.mjs',
    'simplymcp.config.json',
    '.simplemcprc.json',
    '.simplemcprc.js',
  ];

  for (const candidate of candidates) {
    const candidatePath = join(cwd, candidate);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Parse config file based on extension
 * @param configPath - Path to config file
 * @returns Parsed configuration
 */
async function parseConfig(configPath: string): Promise<SimplyMCPConfig> {
  const ext = configPath.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    // JSON config
    const content = await readFile(configPath, 'utf-8');
    try {
      const config = JSON.parse(content);
      validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${configPath}`);
      }
      throw error;
    }
  } else if (ext === 'js' || ext === 'mjs') {
    // JavaScript/MJS config
    const configUrl = pathToFileURL(configPath).href;
    try {
      const module = await import(configUrl);
      const config = module.default || module;
      validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(`Failed to load config file: ${configPath} - ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    throw new Error(`Unsupported config file format: ${ext}`);
  }
}

/**
 * Validate configuration object
 * @param config - Configuration to validate
 */
function validateConfig(config: any): void {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Config must be an object');
  }

  // Validate entry field
  if (config.entry !== undefined && typeof config.entry !== 'string') {
    throw new Error('Config field "entry" must be a string');
  }

  // Validate output.format field
  if (config.output?.format !== undefined) {
    const validFormats = ['single-file', 'standalone', 'executable', 'esm', 'cjs'];
    if (!validFormats.includes(config.output.format)) {
      throw new Error(`Config field "output.format" must be one of: ${validFormats.join(', ')}`);
    }
  }

  // Validate output.dir field
  if (config.output?.dir !== undefined && typeof config.output.dir !== 'string') {
    throw new Error('Config field "output.dir" must be a string');
  }

  // Validate output.filename field
  if (config.output?.filename !== undefined && typeof config.output.filename !== 'string') {
    throw new Error('Config field "output.filename" must be a string');
  }

  // Validate bundle.minify field
  if (config.bundle?.minify !== undefined && typeof config.bundle.minify !== 'boolean') {
    throw new Error('Config field "bundle.minify" must be a boolean');
  }

  // Validate bundle.platform field
  if (config.bundle?.platform !== undefined) {
    const validPlatforms = ['node', 'neutral'];
    if (!validPlatforms.includes(config.bundle.platform)) {
      throw new Error(`Config field "bundle.platform" must be one of: ${validPlatforms.join(', ')}`);
    }
  }

  // Validate bundle.external field
  if (config.bundle?.external !== undefined) {
    if (!Array.isArray(config.bundle.external)) {
      throw new Error('Config field "bundle.external" must be an array');
    }
    if (!config.bundle.external.every((item: any) => typeof item === 'string')) {
      throw new Error('Config field "bundle.external" must be an array of strings');
    }
  }
}

/**
 * Merge CLI options with config file
 * CLI options take precedence over config file
 * @param config - Config file settings
 * @param cliOptions - CLI command options
 * @returns Merged bundle options
 */
export function mergeConfig(
  config: SimplyMCPConfig | null,
  cliOptions: Partial<BundleOptions>
): BundleOptions {
  const merged: any = {};

  // Entry point (CLI > config)
  if (cliOptions.entry !== undefined) {
    merged.entry = cliOptions.entry;
  } else if (config?.entry !== undefined) {
    merged.entry = config.entry;
  }

  // Output (CLI > config)
  if (cliOptions.output !== undefined) {
    merged.output = cliOptions.output;
  } else if (config?.output?.dir !== undefined || config?.output?.filename !== undefined) {
    // Combine dir and filename if both present
    if (config.output.dir && config.output.filename) {
      merged.output = join(config.output.dir, config.output.filename);
    } else {
      merged.output = config.output.dir || config.output.filename;
    }
  }

  // Format (CLI > config)
  if (cliOptions.format !== undefined) {
    merged.format = cliOptions.format;
  } else if (config?.output?.format !== undefined) {
    merged.format = config.output.format;
  }

  // Minify (CLI > config)
  if (cliOptions.minify !== undefined) {
    merged.minify = cliOptions.minify;
  } else if (config?.bundle?.minify !== undefined) {
    merged.minify = config.bundle.minify;
  }

  // Platform (CLI > config)
  if (cliOptions.platform !== undefined) {
    merged.platform = cliOptions.platform;
  } else if (config?.bundle?.platform !== undefined) {
    merged.platform = config.bundle.platform;
  }

  // Target (CLI > config)
  if (cliOptions.target !== undefined) {
    merged.target = cliOptions.target;
  } else if (config?.bundle?.target !== undefined) {
    merged.target = config.bundle.target;
  }

  // External (CLI > config)
  if (cliOptions.external !== undefined) {
    merged.external = cliOptions.external;
  } else if (config?.bundle?.external !== undefined) {
    merged.external = config.bundle.external;
  }

  // Sourcemap (CLI > config)
  if (cliOptions.sourcemap !== undefined) {
    merged.sourcemap = cliOptions.sourcemap;
  } else if (config?.bundle?.sourcemap !== undefined) {
    merged.sourcemap = config.bundle.sourcemap;
  }

  // Auto-install (CLI > config)
  if (cliOptions.autoInstall !== undefined) {
    merged.autoInstall = cliOptions.autoInstall;
  } else if (config?.autoInstall !== undefined) {
    merged.autoInstall = config.autoInstall;
  }

  // Preserve callbacks (these are CLI-only, not in config files)
  if (cliOptions.onProgress !== undefined) {
    merged.onProgress = cliOptions.onProgress;
  }
  if (cliOptions.onError !== undefined) {
    merged.onError = cliOptions.onError;
  }
  if (cliOptions.watch !== undefined) {
    merged.watch = cliOptions.watch;
  }
  if (cliOptions.treeShake !== undefined) {
    merged.treeShake = cliOptions.treeShake;
  }
  if (cliOptions.basePath !== undefined) {
    merged.basePath = cliOptions.basePath;
  }

  return merged;
}

/**
 * Validate bundle options before bundling
 * @param options - Bundle options to validate
 */
export function validateBundleOptions(options: Partial<BundleOptions>): void {
  // Entry is required
  if (!options.entry || options.entry.trim() === '') {
    throw new Error('Entry point is required');
  }

  // Output is required
  if (!options.output || options.output.trim() === '') {
    throw new Error('Output path is required');
  }

  // Validate format if specified
  if (options.format !== undefined) {
    const validFormats = ['single-file', 'standalone', 'executable', 'esm', 'cjs'];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid format: ${options.format}. Must be one of: ${validFormats.join(', ')}`);
    }
  }

  // Validate platform if specified
  if (options.platform !== undefined) {
    const validPlatforms = ['node', 'neutral'];
    if (!validPlatforms.includes(options.platform)) {
      throw new Error(`Invalid platform: ${options.platform}. Must be one of: ${validPlatforms.join(', ')}`);
    }
  }
}

/**
 * Create default configuration
 * @returns Default bundle configuration
 */
export function createDefaultConfig(): SimplyMCPConfig {
  return {
    output: {
      dir: 'dist',
      format: 'single-file',
    },
    bundle: {
      minify: false,
      platform: 'node',
      target: 'node20',
      external: [],
      treeShake: true,
    },
    autoInstall: false,
  };
}

/**
 * Write configuration to file
 * @param config - Configuration to write
 * @param outputPath - Path to write config file
 * @param format - File format ('js' or 'json')
 */
export async function writeConfig(
  config: SimplyMCPConfig,
  outputPath: string,
  format: 'js' | 'json' = 'js'
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  const { dirname } = await import('path');
  const { mkdir } = await import('fs/promises');

  // Ensure directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  if (format === 'json') {
    // Write JSON format
    const content = JSON.stringify(config, null, 2);
    await writeFile(outputPath, content, 'utf-8');
  } else {
    // Write JavaScript format
    const content = `export default ${JSON.stringify(config, null, 2)};\n`;
    await writeFile(outputPath, content, 'utf-8');
  }
}

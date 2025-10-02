/**
 * Core type definitions for the Handler Execution Framework
 */

/**
 * Base interface for all handler configurations
 */
export interface BaseHandlerConfig {
  type: 'inline' | 'file' | 'http' | 'registry';
}

/**
 * Inline handler configuration - executes JavaScript code strings
 */
export interface InlineHandlerConfig extends BaseHandlerConfig {
  type: 'inline';
  code: string;
  timeout?: number; // Execution timeout in milliseconds (default: 5000)
}

/**
 * File handler configuration - loads and executes modules from filesystem
 */
export interface FileHandlerConfig extends BaseHandlerConfig {
  type: 'file';
  path: string; // Absolute or relative path to the module
  export?: string; // Named export to use (default: 'default')
}

/**
 * HTTP handler configuration - makes HTTP requests to external services
 */
export interface HttpHandlerConfig extends BaseHandlerConfig {
  type: 'http';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number; // Request timeout in milliseconds (default: 5000)
  retries?: number; // Number of retry attempts (default: 0)
  requestTransform?: string; // JavaScript code to transform request args
  responseTransform?: string; // JavaScript code to transform response
}

/**
 * Registry handler configuration - looks up pre-registered handlers
 */
export interface RegistryHandlerConfig extends BaseHandlerConfig {
  type: 'registry';
  name: string; // Name of the registered handler
}

/**
 * Union type of all handler configurations
 */
export type HandlerConfig =
  | InlineHandlerConfig
  | FileHandlerConfig
  | HttpHandlerConfig
  | RegistryHandlerConfig;

/**
 * Context provided to handlers during execution
 */
export interface HandlerContext {
  sessionId?: string; // MCP session identifier
  logger: Logger; // Logger instance for handler output
  permissions?: Permissions; // Permission settings for the handler
  metadata?: Record<string, unknown>; // Additional context metadata

  // Enhanced Protocol Features (optional - may not be available in all contexts)

  /**
   * Request an LLM completion from the client.
   * Only available when the client supports sampling capability.
   * @param messages Array of messages for the LLM
   * @param options Optional sampling parameters (maxTokens, temperature, etc.)
   * @returns The LLM's response (type from MCP SDK)
   */
  sample?: (messages: SamplingMessage[], options?: SamplingOptions) => Promise<any>;

  /**
   * Send a progress notification to the client.
   * Only available when the request includes a progressToken.
   * @param progress Current progress value
   * @param total Optional total value (for percentage calculation)
   * @param message Optional progress message
   */
  reportProgress?: (progress: number, total?: number, message?: string) => Promise<void>;

  /**
   * Read a resource by URI.
   * Only available when the server has resources registered.
   * @param uri The resource URI to read
   * @returns The resource contents
   */
  readResource?: (uri: string) => Promise<ResourceContents>;
}

/**
 * Sampling message for LLM completion requests
 * Simplified wrapper around MCP SDK types
 */
export interface SamplingMessage {
  role: 'user' | 'assistant';
  content: {
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
    [key: string]: unknown;
  };
}

/**
 * Options for sampling/LLM completion
 */
export interface SamplingOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Resource contents returned from readResource
 */
export interface ResourceContents {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

/**
 * Logger interface for handler execution
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;

  // Extended log levels for MCP protocol compatibility
  notice?(message: string, ...args: unknown[]): void;
  critical?(message: string, ...args: unknown[]): void;
  alert?(message: string, ...args: unknown[]): void;
  emergency?(message: string, ...args: unknown[]): void;
}

/**
 * Permission settings for handler execution
 */
export interface Permissions {
  allowFileSystem?: boolean; // Allow filesystem access
  allowNetwork?: boolean; // Allow network requests
  allowedPaths?: string[]; // Whitelist of allowed file paths
  allowedDomains?: string[]; // Whitelist of allowed network domains
}

/**
 * Image content for handler results
 */
export interface ImageContent {
  type: 'image';
  data: string; // base64-encoded image data
  mimeType: string; // e.g., "image/png", "image/jpeg"
  _meta?: object; // Optional metadata
}

/**
 * Audio content for handler results
 */
export interface AudioContent {
  type: 'audio';
  data: string; // base64-encoded audio data
  mimeType: string; // e.g., "audio/mp3", "audio/wav"
  _meta?: object; // Optional metadata
}

/**
 * Binary content for handler results
 */
export interface BinaryContent {
  type: 'binary';
  data: string; // base64-encoded binary data
  mimeType: string; // e.g., "application/pdf"
  _meta?: object; // Optional metadata
}

/**
 * Text content for handler results
 */
export interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

/**
 * Result returned by handler execution
 */
export interface HandlerResult {
  content: Array<TextContent | ImageContent | AudioContent | BinaryContent>;
  metadata?: Record<string, unknown>; // Additional result metadata
  errors?: HandlerError[]; // Non-fatal errors or warnings
}

/**
 * Error information from handler execution
 */
export interface HandlerError {
  code: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

/**
 * Function signature for tool handlers
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: HandlerContext
) => Promise<HandlerResult>;

/**
 * Abstract interface for handler resolvers
 */
export interface HandlerResolver {
  /**
   * Resolve a handler configuration to an executable function
   * @param config Handler configuration
   * @returns Executable tool handler function
   */
  resolve(config: HandlerConfig): Promise<ToolHandler>;

  /**
   * Check if this resolver can handle the given configuration
   * @param config Handler configuration
   * @returns True if this resolver supports the config type
   */
  canResolve(config: HandlerConfig): boolean;
}

/**
 * Options for handler execution
 */
export interface HandlerExecutionOptions {
  timeout?: number; // Maximum execution time in milliseconds
  retries?: number; // Number of retry attempts on failure
  abortSignal?: AbortSignal; // Signal to abort execution
}

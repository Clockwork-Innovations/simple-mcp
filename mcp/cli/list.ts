/**
 * List command for SimplyMCP CLI
 * Shows all running MCP servers
 */

import type { CommandModule } from 'yargs';
import {
  listServers,
  cleanupDeadServers,
  isProcessAlive,
  type ServerInfo,
} from './server-tracker.js';
import { basename } from 'node:path';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Format uptime in human-readable format
 */
function formatUptime(startedAt: number): string {
  const uptimeMs = Date.now() - startedAt;
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Display server list in a nice format
 */
function displayServers(servers: ServerInfo[], verbose: boolean): void {
  if (servers.length === 0) {
    console.log(`${COLORS.yellow}No MCP servers currently running${COLORS.reset}`);
    console.log('');
    console.log(`${COLORS.dim}Start a server with: simplymcp run <file>${COLORS.reset}`);
    return;
  }

  console.log(`${COLORS.bright}Running MCP Servers:${COLORS.reset}`);
  console.log('');

  for (const server of servers) {
    const isAlive = isProcessAlive(server.pid);
    const statusIcon = isAlive ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
    const fileName = basename(server.filePath);

    // Server name and file
    let line = `  ${statusIcon} ${COLORS.bright}${server.name}${COLORS.reset}`;
    if (verbose) {
      line += ` ${COLORS.dim}(${fileName})${COLORS.reset}`;
    }

    // Transport info
    if (server.transport === 'http' && server.port) {
      line += ` - ${COLORS.cyan}HTTP${COLORS.reset} :${server.port}`;
    } else {
      line += ` - ${COLORS.cyan}stdio${COLORS.reset}`;
    }

    // PID
    line += ` - ${COLORS.dim}PID ${server.pid}${COLORS.reset}`;

    console.log(line);

    // Additional info in verbose mode
    if (verbose) {
      console.log(`    ${COLORS.dim}Path: ${server.filePath}${COLORS.reset}`);
      console.log(`    ${COLORS.dim}Uptime: ${formatUptime(server.startedAt)}${COLORS.reset}`);

      if (server.version) {
        console.log(`    ${COLORS.dim}Version: ${server.version}${COLORS.reset}`);
      }

      if (server.isMulti && server.groupId) {
        console.log(`    ${COLORS.dim}Group: ${server.groupId}${COLORS.reset}`);
      }

      console.log('');
    }
  }

  if (!verbose) {
    console.log('');
  }

  // Summary
  const aliveCount = servers.filter(s => isProcessAlive(s.pid)).length;
  const deadCount = servers.length - aliveCount;

  console.log(`${COLORS.bright}Total:${COLORS.reset} ${aliveCount} running`);

  if (deadCount > 0) {
    console.log(`${COLORS.yellow}Warning:${COLORS.reset} ${deadCount} dead server(s) in registry (run with --cleanup to remove)`);
  }

  // Show multi-server groups
  const groups = new Map<string, ServerInfo[]>();
  for (const server of servers) {
    if (server.groupId) {
      if (!groups.has(server.groupId)) {
        groups.set(server.groupId, []);
      }
      groups.get(server.groupId)!.push(server);
    }
  }

  if (groups.size > 0 && verbose) {
    console.log('');
    console.log(`${COLORS.bright}Multi-Server Groups:${COLORS.reset}`);
    for (const [groupId, groupServers] of groups) {
      const aliveInGroup = groupServers.filter(s => isProcessAlive(s.pid)).length;
      console.log(`  ${groupId}: ${aliveInGroup}/${groupServers.length} running`);
    }
  }
}

/**
 * Yargs command definition for the list command
 */
export const listCommand: CommandModule = {
  command: 'list',
  describe: 'List all running MCP servers',
  builder: (yargs) => {
    return yargs
      .option('verbose', {
        alias: 'v',
        describe: 'Show detailed information',
        type: 'boolean',
        default: false,
      })
      .option('cleanup', {
        alias: 'c',
        describe: 'Remove dead servers from registry',
        type: 'boolean',
        default: false,
      })
      .option('json', {
        describe: 'Output in JSON format',
        type: 'boolean',
        default: false,
      });
  },
  handler: async (argv: any) => {
    const verbose = argv.verbose as boolean;
    const cleanup = argv.cleanup as boolean;
    const json = argv.json as boolean;

    try {
      // Cleanup dead servers if requested
      if (cleanup) {
        const removed = await cleanupDeadServers();
        if (removed > 0) {
          console.error(`${COLORS.green}Removed ${removed} dead server(s) from registry${COLORS.reset}`);
        }
      }

      // Get all servers
      const servers = await listServers();

      // Output in JSON format
      if (json) {
        const output = servers.map(server => ({
          ...server,
          alive: isProcessAlive(server.pid),
          uptime: Date.now() - server.startedAt,
        }));
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Display in human-readable format
      displayServers(servers, verbose);
    } catch (error) {
      console.error(`${COLORS.red}Error listing servers:${COLORS.reset}`, error);
      process.exit(1);
    }
  },
};

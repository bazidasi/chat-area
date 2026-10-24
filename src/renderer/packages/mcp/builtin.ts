import type { MCPServerConfig } from './types'

export interface BuildinMCPServerConfig {
  id: string
  name: string
  description: string
  url: string
}

/**
 * Fibonacci fork: the builtin MCP servers were hosted at mcp.chatboxai.app
 * (chatbox-managed services) and are removed. Users can still add their own
 * MCP servers from settings; the array stays as the (now empty) extension
 * point the UI maps over.
 */
export const BUILTIN_MCP_SERVERS: BuildinMCPServerConfig[] = []

/** Lookup kept for API compatibility — always undefined now the list is empty. */
export function getBuiltinServerConfig(_id: string, _licenseKey?: string): MCPServerConfig | undefined {
  return undefined
}

export type { MCPServerConfig }

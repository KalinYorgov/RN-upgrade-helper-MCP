# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that automates the React Native Upgrade Helper website. It uses Playwright to scrape upgrade information between React Native versions and provides structured data through MCP tools.

## Architecture

- **Main Server**: `src/index.ts` - Single-file MCP server implementation using the official MCP SDK
- **Core Class**: `ReactNativeUpgradeHelperMCP` - Handles tool registration and browser automation
- **Two Main Tools**:
  - `get_upgrade_info` - Comprehensive upgrade analysis between RN versions
  - `get_file_diff` - Specific file diff extraction

## Development Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Run in development mode with hot reload
npm run dev

# Start the compiled server
npm start

# Install Playwright browsers (required for functionality)
npx playwright install chromium
```

## MCP Server Architecture

The server follows the official MCP SDK patterns:
- Uses `McpServer` class from `@modelcontextprotocol/sdk/server/mcp.js`
- Tools registered with `registerTool()` method using Zod schemas
- Proper error handling with `isError: true` responses
- StdioServerTransport for communication

## Browser Automation Strategy

The server uses flexible DOM selectors to handle website changes:
- Multiple fallback selectors for each element type
- Dynamic form field detection based on label text
- Robust content extraction with various possible element structures
- 15-second timeout for page loads after form submission

## Tool Parameters

Both tools accept:
- `fromVersion` (required): Source React Native version
- `toVersion` (required): Target React Native version  
- `packageName` (optional): Project package name (defaults to "com.example.app")
- `projectName` (optional): Project name (defaults to "ExampleApp")

Additional for `get_file_diff`:
- `fileName` (required): Specific file to extract diff for

## Configuration

The server is designed to be added to MCP client configurations pointing to the compiled `dist/index.js` file. The executable is configured in package.json bin field for global installation.

## Testing the Server

```bash
# Test tool listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js

# Manual test run
node dist/index.js
```

## Key Implementation Details

- Browser instances are properly closed in finally blocks to prevent resource leaks
- Form filling uses JavaScript evaluation with event dispatching for reliable input
- Content extraction limits to 2000 characters per file to prevent excessive output
- Uses networkidle wait strategy for initial page load
- Flexible selector strategy accommodates website UI changes
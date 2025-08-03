# React Native Upgrade Helper MCP Server

A Model Context Protocol (MCP) server that automates the [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/) website to extract upgrade information between React Native versions.

## What It Does

This MCP server uses Playwright to automatically:
1. Fill out the React Native Upgrade Helper form with your version details
2. Extract comprehensive upgrade information including file diffs
3. Return structured JSON data that AI assistants can use to help with React Native upgrades

## Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd react-native-upgrade-helper-mcp
npm install
```

2. **Install Playwright browser:**
```bash
npx playwright install chromium
```

3. **Build the project:**
```bash
npm run build
```

## Configuration

Add this server to your MCP client configuration:

### Claude Code
Add to `~/.config/claude-code/mcp_servers.json`:
```json
{
  "mcpServers": {
    "react-native-upgrade-helper": {
      "command": "node",
      "args": ["/absolute/path/to/react-native-upgrade-helper-mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "react-native-upgrade-helper": {
      "command": "node",
      "args": ["/absolute/path/to/react-native-upgrade-helper-mcp/dist/index.js"]
    }
  }
}
```

### Cursor
Add to your MCP settings:
```json
{
  "servers": {
    "react-native-upgrade-helper": {
      "command": "node",
      "args": ["/absolute/path/to/react-native-upgrade-helper-mcp/dist/index.js"]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/react-native-upgrade-helper-mcp/` with the actual absolute path to this project directory.

## Usage

The server provides two tools:

### 1. `get_upgrade_info` 
Get comprehensive upgrade information between React Native versions.

**Parameters:**
- `fromVersion` (required): Source React Native version (e.g., "0.70.14")
- `toVersion` (required): Target React Native version (e.g., "0.74.0")
- `packageName` (optional): Package name (default: "com.example.app")
- `projectName` (optional): Project name (default: "ExampleApp")

**Example:**
```
@react-native-upgrade-helper get_upgrade_info fromVersion=0.70.14 toVersion=0.74.0
```

### 2. `get_file_diff`
Get specific file differences for the upgrade.

**Parameters:**
- `fromVersion` (required): Source React Native version
- `toVersion` (required): Target React Native version  
- `fileName` (required): Specific file to get diff for (e.g., "package.json")
- `packageName` (optional): Package name (default: "com.example.app")
- `projectName` (optional): Project name (default: "ExampleApp")

**Example:**
```
@react-native-upgrade-helper get_file_diff fromVersion=0.70.14 toVersion=0.74.0 fileName=package.json
```

## Example AI Prompts

Once configured, you can ask your AI assistant:

- "Help me upgrade my React Native app from 0.70.14 to 0.74.0. What changes do I need to make?"
- "Show me the specific changes needed for package.json when upgrading to RN 0.74.0"
- "What are the breaking changes when upgrading from React Native 0.70 to 0.74?"

## Output Format

### `get_upgrade_info` returns:
```json
{
  "fromVersion": "0.70.14",
  "toVersion": "0.74.0",
  "packageName": "com.example.app",
  "projectName": "ExampleApp",
  "url": "https://react-native-community.github.io/upgrade-helper/",
  "summary": "Upgrade summary information",
  "breakingChanges": ["Breaking change descriptions"],
  "fileChanges": [
    {
      "fileName": "package.json",
      "changeType": "modified",
      "hasChanges": true,
      "content": "diff content..."
    }
  ],
  "totalFiles": 15,
  "modifiedFiles": 12,
  "addedFiles": 2,
  "deletedFiles": 1
}
```

### `get_file_diff` returns:
```json
{
  "fromVersion": "0.70.14",
  "toVersion": "0.74.0",
  "fileName": "package.json",
  "changeType": "modified", 
  "diff": "actual diff content...",
  "found": true
}
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Test the server manually
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js
```

## Troubleshooting

**Playwright issues:** Ensure Chromium is installed:
```bash
npx playwright install chromium
```

**Permission errors:** Make sure the script is executable:
```bash
chmod +x dist/index.js
```

**Path issues:** Always use absolute paths in MCP configuration files.

**Network timeouts:** The server waits 15 seconds for page loads. For slower connections, modify the timeout in `src/index.ts`.

## License

MIT License
# Tic-Tac-Toe MCP Server

A simple Tic-Tac-Toe game implemented as a Model Context Protocol (MCP) server with real-time updates.

## Features

- Play Tic-Tac-Toe through MCP tools
- Real-time game state updates using Server-Sent Events (SSE)
- Intelligent logging system that highlights meaningful state changes
- In-memory logging system for debugging
- Full game state management
- Robust SSE connection handling with error recovery

## Available Tools

The server provides the following tools:

- `view-board`: View the current state of the tic-tac-toe board
- `make-move`: Make a move on the tic-tac-toe board
- `reset-game`: Reset the tic-tac-toe game to start a new game
- `game-status`: Get the current status of the tic-tac-toe game
- `get-logs`: Retrieve server logs for debugging

## Real-Time Updates

The game server uses Server-Sent Events (SSE) to provide real-time updates:

- Both players see moves instantly without page refreshes
- The MCP server maintains a persistent SSE connection to the game server
- Automatic reconnection if the connection is interrupted
- Intelligent logging that only shows meaningful game state changes
- Minimal log noise from normal SSE heartbeat reconnections

## Important Notes for Tool Consumers

### Tool Parameter Requirements

All tools require at least an empty object parameter (`{}`) when being invoked, even if the tool doesn't actually need any parameters. For example:

```typescript
// Even though view-board doesn't use parameters, you must send at least an empty object
// This will fail:
invoke("view-board")

// This will work:
invoke("view-board", {})
// or
invoke("view-board", { player: "X" })  // Extra params are safely ignored
```

### Tool Naming Conventions

When invoking tools from an MCP client, you may need to use specific prefixes depending on your client configuration. For example, using a tool from Cascade/Windsurf might require the format:

```typescript
// Using the proper MCP tool naming convention
invoke("mcp0_view-board", { player: "X" })
```

Check your MCP client configuration to determine if a prefix is needed.

## Usage Example

Here's an example of how to use the tools:

1. Get the current game status:
   ```
   invoke("game-status", {})
   ```

2. View the current board:
   ```
   invoke("view-board", {})
   ```

3. Make a move as player X:
   ```
   invoke("make-move", { row: 0, col: 0, player: "X" })
   ```

4. Reset the game:
   ```
   invoke("reset-game", {})
   ```

5. Get the last 10 log entries:
   ```
   invoke("get-logs", { count: 10 })
   ```

## Development

### Building the server

```
npm run build
```

### Running the server

```
npm run start
```

The server will run on stdio and connect to your MCP client.

### Game Server

The game server runs on port 3001 and provides:
- HTTP API endpoints for game interactions
- Server-Sent Events (SSE) endpoint at `/api/mcp-updates` for real-time updates

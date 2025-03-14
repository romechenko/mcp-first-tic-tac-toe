import axios from 'axios';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from './logger.js';
import { z } from "zod";
import { EventSource } from 'eventsource';

// Create a tool to interact with the tic-tac-toe game server
const gameServerUrl = 'http://localhost:3001';

// Game state object for real-time updates
let currentGameState: any = null;

// Create an MCP server instance
const server = new McpServer({
  name: "tic-tac-toe",
  version: "1.0.0",
});

// Tool to get game state
server.tool(
  "game-state",
  "Get the current state of the tic-tac-toe game, including the board, current player, status, and winner information.",
  async (_extra) => {
    logger.info("game-state tool called");
    try {
      // If we have a current state from SSE, use it
      if (currentGameState) {
        const state = currentGameState;
        
        let boardString = '';
        for (let i = 0; i < 3; i++) {
          boardString += '|';
          for (let j = 0; j < 3; j++) {
            boardString += ` ${state.board[i][j] || ' '} |`;
          }
          boardString += '\n';
          if (i < 2) {
            boardString += '|---|---|---|\n';
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Game Status: ${state.status}\n\nCurrent Board:\n${boardString}`,
            },
          ],
        };
      }
      
      // Fallback to API call if no SSE state available
      const response = await axios.get(`${gameServerUrl}/api/game-state`);
      const state = response.data;
      
      let boardString = '';
      for (let i = 0; i < 3; i++) {
        boardString += '|';
        for (let j = 0; j < 3; j++) {
          boardString += ` ${state.board[i][j] || ' '} |`;
        }
        boardString += '\n';
        if (i < 2) {
          boardString += '|---|---|---|\n';
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Game Status: ${state.status}\n\nCurrent Board:\n${boardString}`,
          },
        ],
      };
    } catch (error) {
      logger.error('Error fetching game state:', error);
      throw error;
    }
  }
);

// Tool to make a move - using zod schema properly
server.tool(
  "make-move",
  "Make a move on the tic-tac-toe board. Requires row (0-2), col (0-2), and player (X or O) parameters.",
  {
    row: z.number().min(0).max(2),
    col: z.number().min(0).max(2),
    player: z.enum(["X", "O"])
  },
  async (args, _extra) => {
    const { row, col, player } = args;
    logger.info("make-move tool called", { row, col, player });
    try {      
      const response = await axios.post(`${gameServerUrl}/api/make-move`, { row, col, player });
      
      return {
        content: [
          {
            type: "text",
            text: `Move successful! Updated game state received.`,
          },
        ],
      };
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        return {
          content: [
            {
              type: "text",
              text: error.response.data.error,
            },
          ],
        };
      }
      logger.error('Error making move:', error);
      throw error;
    }
  }
);

// Tool to reset the game
server.tool(
  "reset-game",
  "Reset the tic-tac-toe game.",
  async (_extra) => {
    logger.info("reset-game tool called");
    try {
      await axios.post(`${gameServerUrl}/api/reset-game`);
      
      return {
        content: [
          {
            type: "text",
            text: `Game has been reset! X goes first.`,
          },
        ],
      };
    } catch (error) {
      logger.error('Error resetting game:', error);
      throw error;
    }
  }
);

// Tool to get logs
server.tool(
  "get-logs",
  "Retrieve server logs for debugging. Optional parameter: count (1-100, default: 20).",
  {
    count: z.number().min(1).max(100).optional().default(20)
  },
  async (args, _extra) => {
    const { count } = args;
    logger.info("get-logs tool called", { count });
    
    try {
      const logs = logger.getLogs(count);
      
      return {
        content: [
          {
            type: "text",
            text: `Last ${logs.length} log entries:\n\n${logs.map(log => 
              `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
            ).join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error in get-logs tool:", error);
      throw error;
    }
  }
);

// Function to connect to SSE endpoint and receive game updates
function connectToGameServerSSE() {
  // Configuration for logging
  const sseLogging = {
    verbose: false,            // Set to true for more detailed logs
    logHeartbeats: false,      // Set to true to log connection refreshes
    logEveryUpdate: false      // Set to true to log every state update
  };

  // Create EventSource to connect to the SSE endpoint with proper configuration
  const eventSource = new EventSource(`${gameServerUrl}/api/mcp-updates`, {
    withCredentials: false
  });
  
  // Keep track of connection state and reconnection timing
  let connectionState = "connecting";
  let lastReconnectTime = 0;
  let reconnectionCount = 0;
  let updateCount = 0;
  let lastGameState: {
    board?: (string | null)[][];
    currentPlayer?: string;
    status?: string;
    winner?: string | null;
  } | null = null;
  
  eventSource.onmessage = (event) => {
    try {
      // Parse the data from the event
      const data = JSON.parse(event.data);
      updateCount++;
      
      // Detect if there was an actual change in the game state
      const gameStateChanged = lastGameState === null || 
                               JSON.stringify(data) !== JSON.stringify(lastGameState);
      
      // Always log the first update and actual game state changes
      if (updateCount === 1 || gameStateChanged) {
        if (gameStateChanged && lastGameState !== null) {
          // Log details about what changed in the game state
          const oldBoard = lastGameState.board ? lastGameState.board.flat().join('') : '';
          const newBoard = data.board ? data.board.flat().join('') : '';
          const oldPlayer = lastGameState.currentPlayer;
          const newPlayer = data.currentPlayer;
          const oldStatus = lastGameState.status;
          const newStatus = data.status;
          
          logger.info(`Game state changed: ${oldStatus} -> ${newStatus}, turn: ${oldPlayer} -> ${newPlayer}`, {
            boardChanged: oldBoard !== newBoard,
            updateNumber: updateCount
          });
        } else {
          // First update
          logger.info(`Received initial game state #${updateCount}: ${data.status}, turn: ${data.currentPlayer}`);
        }
      } else if (sseLogging.logEveryUpdate) {
        // Optional verbose logging
        logger.info(`Received game state update #${updateCount} (no change)`);
      }
      
      // Store the current game state for future comparison
      lastGameState = data;
      
      // Update our current game state
      currentGameState = data;
      
      // Reset reconnection count on successful message
      reconnectionCount = 0;
    } catch (error) {
      logger.error("Error parsing SSE event data:", error);
    }
  };
  
  eventSource.onerror = (error) => {
    // Check the readyState directly from the eventSource
    const readyState = eventSource.readyState;
    const now = Date.now();
    
    // Handle state changes 
    if (readyState === EventSource.CONNECTING) {
      // This is likely just the regular heartbeat reconnection
      if (connectionState !== "connecting") {
        connectionState = "connecting";
        lastReconnectTime = now;
        reconnectionCount++;
        
        // Only log heartbeats if configured to do so
        if (reconnectionCount === 1 && sseLogging.logHeartbeats) {
          logger.info("SSE connection refreshing (heartbeat)");
        }
      }
    } else if (readyState === EventSource.CLOSED) {
      // This might be an actual error condition - always log this
      logger.error("SSE connection closed unexpectedly", {
        errorKeys: error ? Object.keys(error) : 'undefined',
        reconnectionAttempts: reconnectionCount
      });
      connectionState = "closed";
    }
  };
  
  eventSource.onopen = () => {
    if (connectionState !== "open") {
      connectionState = "open";
      
      // Only log re-connections if there were multiple attempts or in verbose mode
      if (reconnectionCount > 1) {
        logger.info(`SSE connection re-established after ${reconnectionCount} attempts`);
      } else if (reconnectionCount === 1 && sseLogging.verbose) {
        logger.info("SSE connection refreshed");
      } else if (reconnectionCount === 0) {
        logger.info("SSE connection established");
      }
      
      reconnectionCount = 0;
    }
  };
  
  logger.info("Connecting to game server via SSE...");
  
  return eventSource;
}

// Main function to start the server
async function main() {
  // Create a stdio transport for the server
  const transport = new StdioServerTransport();
  
  logger.info("Starting Tic-Tac-Toe MCP Server");
  
  try {
    // Connect to game server via SSE for real-time updates
    const eventSource = connectToGameServerSSE();
    
    // Handle process exit to clean up EventSource
    process.on('exit', () => {
      logger.info("Closing SSE connection");
      eventSource.close();
    });
    
    // Connect the server to the transport
    await server.connect(transport);
    logger.info("Tic-Tac-Toe MCP Server running on stdio");
  } catch (error) {
    logger.error("Failed to connect server to transport", { error });
    throw error;
  }
}

// Start the server
main().catch((error) => {
  logger.error("Fatal error in main()", { error });
  process.exit(1);
});

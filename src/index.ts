#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TicTacToeGame } from "./game.js";

// Create an in-memory log store
type LogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
};

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    // Log to console as well
    console.error(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    }
    
    // Add to in-memory store
    this.logs.unshift(entry);
    
    // Trim logs if needed
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  getLogs(count: number = this.maxLogs): LogEntry[] {
    return this.logs.slice(0, count);
  }
}

// Create logger instance
const logger = new Logger();

// Create a new instance of the game
const game = new TicTacToeGame();

// Create an MCP server instance
const server = new McpServer({
  name: "tic-tac-toe",
  version: "1.0.0",
});

// Tool to view the current board state
server.tool(
  "view-board",
  "View the current state of the tic-tac-toe board.",
  async (params) => {
    logger.info("view-board tool called", { params });
    try {
      const state = game.getState();
      const boardString = game.getBoardString();
      
      let statusMessage = `Current player: ${state.currentPlayer}`;
      if (state.status === 'won') {
        statusMessage = `Game over! ${state.winner} has won!`;
      } else if (state.status === 'draw') {
        statusMessage = "Game over! It's a draw!";
      }

      return {
        content: [
          {
            type: "text",
            text: `Current Board:\n${boardString}\n${statusMessage}`,
          },
        ],
      };
    } catch (error) {
      logger.error("Error in view-board tool", { error });
      throw error;
    }
  }
);

// Tool to make a move
server.tool(
  "make-move",
  "Make a move on the tic-tac-toe board. Requires row (0-2), col (0-2), and player (X or O) parameters.",
  // Schema defines required parameters, but will also accept additional fields
  // which will be safely ignored
  {
    row: z.number().min(0).max(2).describe("Row position (0-2)"),
    col: z.number().min(0).max(2).describe("Column position (0-2)"),
    player: z.enum(["X", "O"]).describe("Player making the move (X or O)"),
  },
  async (params) => {
    const { row, col, player, ...rest } = params;
    logger.info("make-move tool called", { row, col, player, additionalParams: rest });
    try {
      const state = game.getState();
      
      // Check if it's the correct player's turn
      if (state.currentPlayer !== player) {
        logger.warn("Wrong player tried to make a move", { 
          expected: state.currentPlayer, 
          actual: player 
        });
        return {
          content: [
            {
              type: "text",
              text: `It's not ${player}'s turn. Current player is ${state.currentPlayer}.`,
            },
          ],
        };
      }
      
      // Try to make the move
      const success = game.makeMove({ row, col });
      
      if (!success) {
        logger.warn("Invalid move attempted", { row, col, player });
        return {
          content: [
            {
              type: "text",
              text: `Invalid move at position [${row}, ${col}]. Please try again.`,
            },
          ],
        };
      }
      
      // Get the updated state
      const newState = game.getState();
      const boardString = game.getBoardString();
      
      let message = `Move successful! Player ${player} placed at [${row}, ${col}].`;
      
      if (newState.status === 'won') {
        message += `\nGame over! ${newState.winner} has won!`;
        logger.info("Game won", { winner: newState.winner });
      } else if (newState.status === 'draw') {
        message += "\nGame over! It's a draw!";
        logger.info("Game ended in draw");
      } else {
        message += `\nIt's now ${newState.currentPlayer}'s turn.`;
      }

      return {
        content: [
          {
            type: "text",
            text: `${message}\n\nUpdated Board:\n${boardString}`,
          },
        ],
      };
    } catch (error) {
      logger.error("Error in make-move tool", { error, params: { row, col, player } });
      throw error;
    }
  }
);

// Tool to reset the game
server.tool(
  "reset-game",
  "Reset the tic-tac-toe game to start a new game.",
  async () => {
    logger.info("reset-game tool called");
    try {
      game.reset();
      
      return {
        content: [
          {
            type: "text",
            text: `Game has been reset! X goes first.\n\nNew Board:\n${game.getBoardString()}`,
          },
        ],
      };
    } catch (error) {
      logger.error("Error in reset-game tool", { error });
      throw error;
    }
  }
);

// Tool to get game status
server.tool(
  "game-status",
  "Get the current status of the tic-tac-toe game.",
  async () => {
    logger.info("game-status tool called");
    try {
      return {
        content: [
          {
            type: "text",
            text: `Game Status: ${game.getState().status}`,
          },
        ],
      };
    } catch (error) {
      logger.error("Error in game-status tool", { error });
      throw error;
    }
  }
);

// Tool to get server logs
server.tool(
  "get-logs",
  "Retrieve server logs for debugging. Optional parameter: count (1-100, default: 20).",
  // Schema for retrieving logs with an optional count parameter
  // Additional parameters will be safely ignored
  {
    count: z.number().min(1).max(100).default(20).optional().describe("Number of log entries to return")
  },
  async (params) => {
    const { count = 20, ...rest } = params;
    logger.info("get-logs tool called", { count, additionalParams: rest });
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
      // Can't use logger here to avoid potential infinite loops
      console.error("Error in get-logs tool:", error);
      throw error;
    }
  }
);

// Main function to start the server
async function main() {
  // Create a stdio transport for the server
  const transport = new StdioServerTransport();
  
  logger.info("Starting Tic-Tac-Toe MCP Server");
  
  try {
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

#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { TicTacToeGame } from './game.js';
import { Position } from './types.js';

// Create a new Express application
const app = express();
app.use(express.json());

// Serve static files from the 'public' directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

// Create a new game
const game = new TicTacToeGame();

// Store connected SSE clients
const clients: express.Response[] = [];
// Store MCP SSE client separately
let mcpClient: express.Response | null = null;

// SSE utility function to send updates to all clients
function sendUpdateToAllClients() {
  const state = game.getState();
  const data = JSON.stringify(state);
  clients.forEach(client => client.write(`data: ${data}\n\n`));
  
  // Also send update to MCP client if connected
  if (mcpClient) {
    mcpClient.write(`data: ${data}\n\n`);
  }
}

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API endpoint for SSE connections
app.get('/api/game-updates', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send initial game state
  const state = game.getState();
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  
  // Add client to the list
  clients.push(res);
  
  // Handle client disconnect
  req.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

// Dedicated SSE endpoint for MCP server
app.get('/api/mcp-updates', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send initial game state
  const state = game.getState();
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  
  // Store the MCP client connection
  if (mcpClient) {
    // Close any existing connection
    mcpClient.end();
  }
  mcpClient = res;
  
  // Handle client disconnect
  req.on('close', () => {
    if (mcpClient === res) {
      mcpClient = null;
    }
  });
});

// API endpoint to get the current game state
app.get('/api/game-state', (req, res) => {
  const state = game.getState();
  res.json(state);
});

// API endpoint to make a move
app.post('/api/make-move', (req, res) => {
  const { row, col, player } = req.body;
  const position: Position = { row, col };

  // Validate that it's the player's turn
  const currentPlayer = game.getState().currentPlayer;
  if (player !== currentPlayer) {
    res.status(400).json({ error: `It's not ${player}'s turn. Current player is ${currentPlayer}.` });
    return;
  }

  // Make the move
  const success = game.makeMove(position, player);
  if (!success) {
    res.status(400).json({ error: 'Invalid move' });
    return;
  }

  // Send update to all clients
  sendUpdateToAllClients();

  // Return the updated game state
  const state = game.getState();
  res.json(state);
});

// API endpoint to reset the game
app.post('/api/reset-game', (req, res) => {
  game.reset();
  
  // Send update to all clients
  sendUpdateToAllClients();
  
  const state = game.getState();
  res.json(state);
});

// Add error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}. Open http://localhost:${PORT} to view the game.`);
});

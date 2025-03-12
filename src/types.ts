// Define player markers
export type Player = 'X' | 'O' | null;

// Define board as 3x3 grid
export type Board = Player[][];

// Game status
export type GameStatus = 'in_progress' | 'won' | 'draw';

// Game state
export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player;
}

// Position on the board
export interface Position {
  row: number;
  col: number;
}

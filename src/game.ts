import { Board, GameState, Player, Position } from './types.js';

export class TicTacToeGame {
  private board: Board = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  private currentPlayer: Player = 'X';
  private status: 'in_progress' | 'won' | 'draw' = 'in_progress';
  private winner: Player = null;

  constructor() {
    this.reset();
  }

  // Reset the game state
  public reset(): void {
    // Initialize empty 3x3 board
    this.board = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    this.currentPlayer = 'X'; // X goes first
    this.status = 'in_progress';
    this.winner = null;
  }

  // Get the current game state
  public getState(): GameState {
    return {
      board: this.getBoard(),
      currentPlayer: this.currentPlayer,
      status: this.status,
      winner: this.winner,
    };
  }

  // Get a deep copy of the board
  private getBoard(): Board {
    return this.board.map(row => [...row]);
  }

  // Make a move on the board
  public makeMove(position: Position, player: Player): boolean {
    const { row, col } = position;

    // Check if the game is over
    if (this.status !== 'in_progress') {
      return false;
    }

    // Check if the position is valid
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return false;
    }

    // Check if the position is empty
    if (this.board[row][col] !== null) {
      return false;
    }

    // Make the move
    this.board[row][col] = player;

    // Check for win or draw
    this.checkGameStatus();

    // Switch player if game is still in progress
    if (this.status === 'in_progress') {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return true;
  }

  // Check if the game is won or drawn
  private checkGameStatus(): void {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (
        this.board[i][0] !== null &&
        this.board[i][0] === this.board[i][1] &&
        this.board[i][1] === this.board[i][2]
      ) {
        this.status = 'won';
        this.winner = this.board[i][0];
        return;
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (
        this.board[0][i] !== null &&
        this.board[0][i] === this.board[1][i] &&
        this.board[1][i] === this.board[2][i]
      ) {
        this.status = 'won';
        this.winner = this.board[0][i];
        return;
      }
    }

    // Check diagonals
    if (
      this.board[0][0] !== null &&
      this.board[0][0] === this.board[1][1] &&
      this.board[1][1] === this.board[2][2]
    ) {
      this.status = 'won';
      this.winner = this.board[0][0];
      return;
    }

    if (
      this.board[0][2] !== null &&
      this.board[0][2] === this.board[1][1] &&
      this.board[1][1] === this.board[2][0]
    ) {
      this.status = 'won';
      this.winner = this.board[0][2];
      return;
    }

    // Check for draw (all cells filled)
    let isDraw = true;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[i][j] === null) {
          isDraw = false;
          break;
        }
      }
      if (!isDraw) break;
    }

    if (isDraw) {
      this.status = 'draw';
    }
  }

  // Get a formatted string representation of the board
  public getBoardString(): string {
    let result = '';
    
    for (let i = 0; i < 3; i++) {
      result += '|';
      for (let j = 0; j < 3; j++) {
        result += ` ${this.board[i][j] || ' '} |`;
      }
      result += '\n';
      if (i < 2) {
        result += '|---|---|---|\n';
      }
    }
    
    return result;
  }
}

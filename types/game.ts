export type Player = 'player1' | 'player2';

export interface Point {
  player: Player | null;
  count: number;
}

export interface GameState {
  board: Point[]; // Array of 24 points. Index 0-23
  bar: {
    player1: number;
    player2: number;
  };
  borneOff: {
    player1: number;
    player2: number;
  };
  dice: [number, number] | [];
  remainingMoves: number[]; // Moves left to play in the current turn
  currentPlayer: Player;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  winner: Player | null;
  turnNumber: number;
  version: number;
  lastPass?: { player: Player; turnNumber: number };
  pendingPreview?: PendingPreview | null;
}

export interface Move {
  from: number | 'bar';
  to: number | 'borneOff';
  dieValue: number;
}

export interface PendingPreview {
  player: Player;
  moves: Move[];
  updatedAt: number;
}

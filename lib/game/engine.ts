import { GameState, Move } from '@/types/game';
import { getLegalMovesForPiece, applyMove } from './moves';

// Get all immediate legal moves for the current player
export function getAllLegalMoves(state: GameState): Move[] {
  const player = state.currentPlayer;
  const moves: Move[] = [];
  
  if (state.remainingMoves.length === 0) return moves;

  // Use unique remaining dice values to avoid duplicate move evaluations for doubles
  const uniqueDice = Array.from(new Set(state.remainingMoves));

  if (state.bar[player] > 0) {
    // MUST move from bar first
    uniqueDice.forEach(die => {
      const move = getLegalMovesForPiece(state, player, 'bar', die);
      if (move) moves.push(move);
    });
    return moves;
  }

  // Check all points
  state.board.forEach((point, index) => {
    if (point.player === player && point.count > 0) {
      uniqueDice.forEach(die => {
        const move = getLegalMovesForPiece(state, player, index, die);
        if (move) moves.push(move);
      });
    }
  });

  return moves;
}

// Check if a move is allowed according to backgammon's maximum-play rules.
export function validateMoveRule(state: GameState, move: Move): boolean {
  const allImmediateMoves = getAllLegalMoves(state);
  
  // Is this move in the list of immediate legal moves?
  const isImmediateLegal = allImmediateMoves.some(
    m => m.from === move.from && m.to === move.to && m.dieValue === move.dieValue
  );
  if (!isImmediateLegal) return false;

  const maxAchievableDepth = getMaxPlayableMoveCount(state);
  const moveDepth = 1 + getMaxPlayableMoveCount(applyMove(state, move));

  if (moveDepth < maxAchievableDepth) {
    return false;
  }

  // Rule: If you can only play one die, but both are available, 
  // you must play the higher one if possible.
  if (
    maxAchievableDepth === 1 &&
    state.remainingMoves.length === 2 &&
    state.remainingMoves[0] !== state.remainingMoves[1]
  ) {
    const higherDie = Math.max(...state.remainingMoves);
    const canPlayHigher = allImmediateMoves.some(m => m.dieValue === higherDie);
    if (canPlayHigher && move.dieValue !== higherDie) {
      return false;
    }
  }

  return true;
}

export function getMaxPlayableMoveCount(state: GameState): number {
  if (state.status === 'FINISHED' || state.remainingMoves.length === 0) return 0;

  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return 0;

  return Math.max(
    ...moves.map((move) => 1 + getMaxPlayableMoveCount(applyMove(state, move)))
  );
}

export function endTurn(state: GameState): GameState {
  const newState = { ...state };
  newState.currentPlayer = state.currentPlayer === 'player1' ? 'player2' : 'player1';
  newState.turnNumber += 1;
  newState.dice = [];
  newState.remainingMoves = [];
  return newState;
}

// Automatically passes the turn if the current player has no legal moves left
export function checkTurnEnd(state: GameState): GameState {
  if (state.status !== 'PLAYING' || state.dice.length === 0) return state;
  if (state.remainingMoves.length === 0) return endTurn(state);
  
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) {
    return endTurn({ ...state, lastPass: { player: state.currentPlayer, turnNumber: state.turnNumber } });
  }
  return state;
}

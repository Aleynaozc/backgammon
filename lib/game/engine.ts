import { GameState, Player, Move } from '@/types/game';
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

// Check if a move is allowed according to full backgammon rules (must play max dice)
// This is a simplified version. A full tree search is required to strictly enforce
// "must play both" and "must play largest".
export function validateMoveRule(state: GameState, move: Move): boolean {
  const allImmediateMoves = getAllLegalMoves(state);
  
  // Is this move in the list of immediate legal moves?
  const isImmediateLegal = allImmediateMoves.some(
    m => m.from === move.from && m.to === move.to && m.dieValue === move.dieValue
  );
  if (!isImmediateLegal) return false;

  // Rule: If you can only play one die, but both are available, 
  // you must play the higher one if possible.
  // We can do a deep search here. For MVP, we'll do a simple check:
  if (state.remainingMoves.length === 2 && state.remainingMoves[0] !== state.remainingMoves[1]) {
    // Determine max depth achievable with each die as the first move
    const maxDepthMove = (st: GameState, currentDepth: number): number => {
      const nextMoves = getAllLegalMoves(st);
      if (nextMoves.length === 0) return currentDepth;
      let maxD = currentDepth;
      for (const m of nextMoves) {
        maxD = Math.max(maxD, maxDepthMove(applyMove(st, m), currentDepth + 1));
      }
      return maxD;
    };

    const maxDepths = allImmediateMoves.map(m => {
      return { move: m, depth: maxDepthMove(applyMove(state, m), 1) };
    });

    const maxAchievableDepth = Math.max(...maxDepths.map(d => d.depth));

    // If we can play both dice (depth 2), any move that leads to depth 2 is valid.
    if (maxAchievableDepth === 2) {
      const moveDepth = maxDepths.find(
        d => d.move.from === move.from && d.move.to === move.to && d.move.dieValue === move.dieValue
      )?.depth || 0;
      if (moveDepth < 2) return false; // Must pick a move sequence that allows playing both
    } else if (maxAchievableDepth === 1) {
      // Can only play ONE die. Must play the larger die if possible.
      const higherDie = Math.max(...state.remainingMoves);
      // Are there any legal moves with the higher die?
      const canPlayHigher = allImmediateMoves.some(m => m.dieValue === higherDie);
      if (canPlayHigher && move.dieValue !== higherDie) {
        return false; // Must play higher die
      }
    }
  }

  return true;
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
  if (state.status === 'FINISHED') return state;
  if (state.remainingMoves.length === 0) return endTurn(state);
  
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) {
    return endTurn(state);
  }
  return state;
}

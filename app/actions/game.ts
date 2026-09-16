'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getInitialGameState } from '@/lib/game/board';
import { GameState, Player, Move } from '@/types/game';
import { Json } from '@/types/supabase';
import { rollDice } from '@/lib/game/rules';
import { getAllLegalMoves, validateMoveRule, checkTurnEnd } from '@/lib/game/engine';
import { applyMove } from '@/lib/game/moves';

type DevPreset = 'bar' | 'bearOff' | 'hit' | 'finish';

function isDevToolsEnabled() {
  return process.env.NODE_ENV === 'development';
}

function createEmptyBoard(): GameState['board'] {
  return Array.from({ length: 24 }, () => ({ player: null, count: 0 }));
}

function getRemainingMovesForDice(dice: [number, number]) {
  return dice[0] === dice[1]
    ? [dice[0], dice[0], dice[0], dice[0]]
    : [dice[0], dice[1]];
}

function getOpponent(player: Player): Player {
  return player === 'player1' ? 'player2' : 'player1';
}

function scoresCapture(state: GameState, move: Move) {
  if (move.to === 'borneOff') return false;

  const destination = state.board[move.to];
  return destination.player === getOpponent(state.currentPlayer) && destination.count === 1;
}

function selectDevAutoMove(state: GameState) {
  return getAllLegalMoves(state)
    .filter((move) => validateMoveRule(state, move))
    .sort((first, second) => {
      const scoreMove = (move: Move) => {
        const bearingScore = move.to === 'borneOff' ? 1000 : 0;
        const captureScore = scoresCapture(state, move) ? 500 : 0;
        const barScore = move.from === 'bar' ? 250 : 0;
        return bearingScore + captureScore + barScore + move.dieValue;
      };

      return scoreMove(second) - scoreMove(first);
    })[0] ?? null;
}

function createDevPresetState(baseState: GameState, preset: DevPreset, currentPlayer: Player): GameState {
  const state: GameState = {
    ...baseState,
    board: createEmptyBoard(),
    bar: { player1: 0, player2: 0 },
    borneOff: { player1: 0, player2: 0 },
    dice: [],
    remainingMoves: [],
    currentPlayer,
    status: 'PLAYING',
    winner: null,
    pendingPreview: null,
  };

  if (preset === 'bar') {
    state.bar[currentPlayer] = 2;
    const dice: [number, number] = [1, 2];
    state.dice = dice;
    state.remainingMoves = getRemainingMovesForDice(dice);
    if (currentPlayer === 'player1') {
      state.board[11] = { player: 'player1', count: 5 };
      state.board[16] = { player: 'player1', count: 3 };
      state.board[18] = { player: 'player1', count: 5 };
      state.board[23] = { player: 'player2', count: 2 };
      state.board[12] = { player: 'player2', count: 5 };
      state.board[7] = { player: 'player2', count: 3 };
      state.board[5] = { player: 'player2', count: 5 };
    } else {
      state.board[12] = { player: 'player2', count: 5 };
      state.board[7] = { player: 'player2', count: 3 };
      state.board[5] = { player: 'player2', count: 5 };
      state.board[0] = { player: 'player1', count: 2 };
      state.board[11] = { player: 'player1', count: 5 };
      state.board[16] = { player: 'player1', count: 3 };
      state.board[18] = { player: 'player1', count: 5 };
    }
    return state;
  }

  if (preset === 'hit') {
    const dice: [number, number] = [4, 2];
    state.dice = dice;
    state.remainingMoves = getRemainingMovesForDice(dice);

    if (currentPlayer === 'player1') {
      state.board[0] = { player: 'player1', count: 14 };
      state.board[14] = { player: 'player1', count: 1 };
      state.board[18] = { player: 'player2', count: 1 };
      state.board[23] = { player: 'player2', count: 14 };
    } else {
      state.board[23] = { player: 'player2', count: 14 };
      state.board[9] = { player: 'player2', count: 1 };
      state.board[5] = { player: 'player1', count: 1 };
      state.board[0] = { player: 'player1', count: 14 };
    }
    return state;
  }

  if (currentPlayer === 'player1') {
    state.board[18] = { player: 'player1', count: 2 };
    state.board[19] = { player: 'player1', count: 3 };
    state.board[20] = { player: 'player1', count: 3 };
    state.board[21] = { player: 'player1', count: 3 };
    state.board[22] = { player: 'player1', count: 2 };
    state.board[23] = { player: 'player1', count: preset === 'finish' ? 1 : 2 };
    state.board[0] = { player: 'player2', count: 2 };
    state.board[1] = { player: 'player2', count: 3 };
    state.board[2] = { player: 'player2', count: 3 };
    state.board[3] = { player: 'player2', count: 3 };
    state.board[4] = { player: 'player2', count: 2 };
    state.board[5] = { player: 'player2', count: 2 };
  } else {
    state.board[0] = { player: 'player2', count: preset === 'finish' ? 1 : 2 };
    state.board[1] = { player: 'player2', count: 2 };
    state.board[2] = { player: 'player2', count: 3 };
    state.board[3] = { player: 'player2', count: 3 };
    state.board[4] = { player: 'player2', count: 3 };
    state.board[5] = { player: 'player2', count: 2 };
    state.board[18] = { player: 'player1', count: 2 };
    state.board[19] = { player: 'player1', count: 3 };
    state.board[20] = { player: 'player1', count: 3 };
    state.board[21] = { player: 'player1', count: 3 };
    state.board[22] = { player: 'player1', count: 2 };
    state.board[23] = { player: 'player1', count: 2 };
  }

  if (preset === 'bearOff') {
    state.borneOff[currentPlayer] = 5;
    if (currentPlayer === 'player1') {
      state.board[18] = { player: 'player1', count: 1 };
      state.board[19] = { player: 'player1', count: 2 };
      state.board[20] = { player: 'player1', count: 2 };
      state.board[21] = { player: 'player1', count: 2 };
      state.board[22] = { player: 'player1', count: 1 };
      state.board[23] = { player: 'player1', count: 2 };
    } else {
      state.board[0] = { player: 'player2', count: 2 };
      state.board[1] = { player: 'player2', count: 1 };
      state.board[2] = { player: 'player2', count: 2 };
      state.board[3] = { player: 'player2', count: 2 };
      state.board[4] = { player: 'player2', count: 2 };
      state.board[5] = { player: 'player2', count: 1 };
    }
    const dice: [number, number] = [6, 5];
    state.dice = dice;
    state.remainingMoves = getRemainingMovesForDice(dice);
    return state;
  }

  if (preset === 'finish') {
    state.board = createEmptyBoard();
    state.borneOff[currentPlayer] = 15;
    state.status = 'FINISHED';
    state.winner = currentPlayer;
  }

  return state;
}

export async function joinGame(roomCode: string, playerName: string, playerId: string) {
  let supabase;
  try {
    supabase = await createAdminClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error("createAdminClient Error:", err);
    return { error: 'Server configuration error: ' + message };
  }

  // Find existing game
  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
    console.error("Supabase Select Error:", error);
    return { error: 'Database error.' };
  }

  // If game doesn't exist, create it
  if (!game) {
    const initialState = getInitialGameState();
    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert({
        room_code: roomCode,
        player1_id: playerId,
        player1_name: playerName,
        game_state: initialState as unknown as Json,
        current_player: 'player1',
        status: 'WAITING',
      })
      .select('*')
      .single();

    if (createError) {
      console.error("Supabase Insert Error:", createError);
      return { error: 'Could not create the game.' };
    }
    return { 
      gameId: newGame.id, 
      gameState: newGame.game_state, 
      assignedPlayer: 'player1',
      player1_name: newGame.player1_name,
      player2_name: newGame.player2_name,
    };
  }

  // If game exists, check if user is already in it
  if (game.player1_id === playerId) {
    return { 
      gameId: game.id, 
      gameState: game.game_state, 
      assignedPlayer: 'player1',
      player1_name: game.player1_name,
      player2_name: game.player2_name,
    };
  }
  if (game.player2_id === playerId) {
    return { 
      gameId: game.id, 
      gameState: game.game_state, 
      assignedPlayer: 'player2',
      player1_name: game.player1_name,
      player2_name: game.player2_name,
    };
  }

  // New player joining
  if (!game.player2_id) {
    // Join as player 2
    const gameState = {
      ...(game.game_state as unknown as GameState),
      status: 'PLAYING' as const,
    };
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: playerId,
        player2_name: playerName,
        status: 'PLAYING',
        game_state: gameState as unknown as Json,
      })
      .eq('id', game.id)
      .select('*')
      .single();

    if (updateError) return { error: 'Could not join the game.' };
    return { 
      gameId: updatedGame.id, 
      gameState: updatedGame.game_state, 
      assignedPlayer: 'player2',
      player1_name: updatedGame.player1_name,
      player2_name: updatedGame.player2_name,
    };
  }

  // Room is full
  return { error: 'The game room is full.' };
}
export async function getGameRoomStatus(roomCode: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('games')
    .select('player2_id')
    .eq('room_code', roomCode)
    .maybeSingle();

  if (error) return { error: 'Could not check the game room.' };
  return { exists: Boolean(data), isFull: Boolean(data?.player2_id) };
}

export async function getGameSnapshot(roomCode: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('games')
    .select('game_state, player1_name, player2_name')
    .eq('room_code', roomCode)
    .single();

  if (error || !data) return { error: 'Could not read the game state.' };
  return data;
}

export async function rollDiceAction(roomCode: string, playerId: string) {
  const supabase = await createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };
  const state = game.game_state as unknown as GameState;
  if (state.status !== 'PLAYING') return { error: 'The game is not active.' };

  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole || state.currentPlayer !== playerRole) return { error: 'It is not your turn.' };

  if (state.dice.length > 0) return { error: 'You have already rolled.' };

  const newDice = rollDice();
  // Doubles logic
  let remainingMoves = [newDice[0], newDice[1]];
  if (newDice[0] === newDice[1]) {
    remainingMoves = [newDice[0], newDice[0], newDice[0], newDice[0]];
  }

  let newState: GameState = {
    ...state,
    dice: newDice as [number, number],
    remainingMoves,
    version: state.version + 1,
  };

  newState = checkTurnEnd(newState);

  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      game_state: newState as unknown as Json,
      current_player: newState.currentPlayer,
      status: newState.status,
      winner: newState.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version); // Optimistic Concurrency Control

  if (updateError) return { error: 'Could not save the dice result.' };
  return { success: true, gameState: newState };
}

export async function movePieceAction(roomCode: string, playerId: string, move: Move) {
  const supabase = await createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };

  let state = game.game_state as unknown as GameState;
  
  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole || state.currentPlayer !== playerRole) return { error: 'It is not your turn.' };

  // Validate Move
  if (!validateMoveRule(state, move)) {
    return { error: 'Geçersiz hamle.' };
  }

  // Apply Move
  state = applyMove(state, move);
  
  // Check if turn ends
  state = checkTurnEnd(state);

  state.version += 1;
  state.pendingPreview = null;

  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      game_state: state as unknown as Json,
      current_player: state.currentPlayer,
      status: state.status,
      winner: state.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not save the move.' };
  return { success: true, gameState: state };
}

export async function confirmMovesAction(roomCode: string, playerId: string, moves: Move[]) {
  if (moves.length === 0) return { error: 'No moves to confirm.' };

  const supabase = await createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };

  let state = game.game_state as unknown as GameState;

  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole || state.currentPlayer !== playerRole) return { error: 'It is not your turn.' };

  for (const move of moves) {
    if (!validateMoveRule(state, move)) {
      return { error: 'Geçersiz hamle.' };
    }

    state = applyMove(state, move);

    if (state.status === 'FINISHED') {
      break;
    }
  }

  state = checkTurnEnd(state);
  state.version += 1;
  state.pendingPreview = null;

  const { error: updateError } = await supabase
    .from('games')
    .update({
      game_state: state as unknown as Json,
      current_player: state.currentPlayer,
      status: state.status,
      winner: state.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not save the moves.' };
  return { success: true, gameState: state };
}

export async function updatePendingMovesAction(roomCode: string, playerId: string, moves: Move[]) {
  const supabase = await createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };

  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole) return { error: 'You are not in this game.' };

  const state = game.game_state as unknown as GameState;
  if (state.status !== 'PLAYING') return { error: 'The game is not active.' };
  if (state.currentPlayer !== playerRole) return { error: 'It is not your turn.' };

  let previewState: GameState = {
    ...state,
    pendingPreview: null,
  };

  for (const move of moves) {
    if (!validateMoveRule(previewState, move)) {
      return { error: 'Geçersiz önizleme hamlesi.' };
    }
    previewState = applyMove(previewState, move);
  }

  const nextState: GameState = {
    ...state,
    pendingPreview: moves.length > 0
      ? {
          player: playerRole,
          moves,
          updatedAt: Date.now(),
        }
      : null,
  };

  const { error: updateError } = await supabase
    .from('games')
    .update({
      game_state: nextState as unknown as Json,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not save the live preview.' };
  return { success: true, gameState: nextState };
}

export async function devSetDiceAction(roomCode: string, playerId: string, dice: [number, number]) {
  if (!isDevToolsEnabled()) return { error: 'Dev tools are only available in development.' };
  if (dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    return { error: 'Dice values must be between 1 and 6.' };
  }

  const supabase = await createAdminClient();
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };

  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole) return { error: 'You are not in this game.' };

  const state = game.game_state as unknown as GameState;
  const nextState: GameState = {
    ...state,
    dice,
    remainingMoves: getRemainingMovesForDice(dice),
    currentPlayer: playerRole,
    status: 'PLAYING',
    winner: null,
    pendingPreview: null,
    version: state.version + 1,
  };

  const { error: updateError } = await supabase
    .from('games')
    .update({
      game_state: nextState as unknown as Json,
      current_player: nextState.currentPlayer,
      status: nextState.status,
      winner: nextState.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not save the dice.' };
  return { success: true, gameState: nextState };
}

export async function devLoadPresetAction(roomCode: string, playerId: string, preset: DevPreset) {
  if (!isDevToolsEnabled()) return { error: 'Dev tools are only available in development.' };
  if (!['bar', 'bearOff', 'hit', 'finish'].includes(preset)) return { error: 'Unknown preset.' };

  const supabase = await createAdminClient();
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };

  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole) return { error: 'You are not in this game.' };

  const currentState = game.game_state as unknown as GameState;
  const nextState = createDevPresetState(currentState, preset, playerRole);
  nextState.version = currentState.version + 1;

  const { error: updateError } = await supabase
    .from('games')
    .update({
      game_state: nextState as unknown as Json,
      current_player: nextState.currentPlayer,
      status: nextState.status,
      winner: nextState.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not load the preset.' };
  return { success: true, gameState: nextState };
}

export async function devAutoPlayOpponentStepAction(roomCode: string, playerId: string) {
  if (!isDevToolsEnabled()) return { error: 'Dev tools are only available in development.' };

  const supabase = await createAdminClient();
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };

  const requesterRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!requesterRole) return { error: 'You are not in this game.' };

  let state = game.game_state as unknown as GameState;
  if (state.status !== 'PLAYING') return { error: 'The game is not active.' };
  if (state.currentPlayer === requesterRole) return { error: 'Auto opponent waits for the opponent turn.' };

  if (state.dice.length === 0) {
    const dice = rollDice();
    state = {
      ...state,
      dice,
      remainingMoves: getRemainingMovesForDice(dice),
      pendingPreview: null,
      version: state.version + 1,
    };
    state = checkTurnEnd(state);
  } else {
    const move = selectDevAutoMove(state);
    state = move ? applyMove(state, move) : checkTurnEnd(state);
    state = checkTurnEnd({
      ...state,
      pendingPreview: null,
      version: state.version + 1,
    });
  }

  const { error: updateError } = await supabase
    .from('games')
    .update({
      game_state: state as unknown as Json,
      current_player: state.currentPlayer,
      status: state.status,
      winner: state.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not save the auto move.' };
  return { success: true, gameState: state };
}

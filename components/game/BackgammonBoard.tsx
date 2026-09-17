import roomStyles from './GameRoomBoard.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, Player, Move } from '@/types/game';
import { PointUI } from './PointUI';
import { Checker } from './Checker';
import { Die } from './Dice';
import { getAllLegalMoves, getMaxPlayableMoveCount, validateMoveRule } from '@/lib/game/engine';
import { playFeedback } from '@/lib/game/feedback';
import { applyMove } from '@/lib/game/moves';

interface BoardProps {
  gameState: GameState;
  onConfirmMoves: (moves: Move[]) => Promise<void>;
  onPendingMovesChange: (moves: Move[]) => void;
  viewerPlayer: Player | 'spectator';
  hectorPlayer: Player | null;
  connected?: boolean;
}

type SelectedPoint = number | 'bar' | null;

export function BackgammonBoard({ gameState, onConfirmMoves, onPendingMovesChange, viewerPlayer, hectorPlayer, connected = true }: BoardProps) {
  const [selectedPointState, setSelectedPointState] = useState<{ version: number; point: SelectedPoint }>({
    version: gameState.version,
    point: null,
  });
  const [pendingMoveState, setPendingMoveState] = useState<{ version: number; moves: Move[] }>({
    version: gameState.version,
    moves: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hectorPlayback, setHectorPlayback] = useState({ remaining: 0, sequence: 0 });
  const lastDiceTurn = useRef<number | null>(null);
  useEffect(() => {
    if (gameState.dice.length === 2 && lastDiceTurn.current !== gameState.turnNumber) {
      lastDiceTurn.current = gameState.turnNumber;
      playFeedback('dice');
    }
  }, [gameState.dice.length, gameState.turnNumber]);
  const previousGameStateRef = useRef<GameState | null>(null);
  const lastHectorCaptureVersionRef = useRef(-1);
  const publishedPendingMovesRef = useRef<string | null>(null);

  const pendingMoves = useMemo(
    () => pendingMoveState.version === gameState.version ? pendingMoveState.moves : [],
    [gameState.version, pendingMoveState.moves, pendingMoveState.version]
  );
  const selectedPoint = selectedPointState.version === gameState.version ? selectedPointState.point : null;

  const setPendingMoves = (update: React.SetStateAction<Move[]>) => {
    setPendingMoveState((current) => {
      const currentMoves = current.version === gameState.version ? current.moves : [];
      const nextMoves = typeof update === 'function'
        ? (update as (moves: Move[]) => Move[])(currentMoves)
        : update;

      return {
        version: gameState.version,
        moves: nextMoves,
      };
    });
  };

  const setSelectedPoint = (point: SelectedPoint) => {
    setSelectedPointState({
      version: gameState.version,
      point,
    });
  };

  useEffect(() => {
    const previousGameState = previousGameStateRef.current;
    // Ignore delayed snapshots so the same committed turn cannot trigger again.
    if (previousGameState && gameState.version < previousGameState.version) return;
    previousGameStateRef.current = gameState;

    if (!previousGameState || viewerPlayer === 'spectator' || !hectorPlayer) return;

    const capturedPlayer = hectorPlayer === 'player1' ? 'player2' : 'player1';
    const captures = gameState.bar[capturedPlayer] - previousGameState.bar[capturedPlayer];
    if (
      captures <= 0 ||
      previousGameState.currentPlayer !== hectorPlayer ||
      gameState.version <= previousGameState.version ||
      gameState.version <= lastHectorCaptureVersionRef.current ||
      gameState.pendingPreview ||
      (gameState.turnNumber <= previousGameState.turnNumber && gameState.status !== 'FINISHED')
    ) return;

    // One playback per confirmed turn, regardless of how many checkers were hit.
    lastHectorCaptureVersionRef.current = gameState.version;
    setHectorPlayback(current => ({ ...current, remaining: current.remaining + 1 }));
  }, [gameState, hectorPlayer, viewerPlayer]);

  const finishHectorPlayback = () => {
    setHectorPlayback(current => ({
      remaining: Math.max(0, current.remaining - 1),
      sequence: current.sequence + 1,
    }));
  };

  const localPreviewState = pendingMoves.reduce((state, move) => applyMove(state, move), gameState);
  const remotePendingMoves =
    gameState.pendingPreview && gameState.pendingPreview.player !== viewerPlayer
      ? gameState.pendingPreview.moves
      : [];
  const visiblePendingMoves = pendingMoves.length > 0 ? pendingMoves : remotePendingMoves;
  const previewState = visiblePendingMoves.reduce((state, move) => applyMove(state, move), gameState);

  useEffect(() => {
    if (
      viewerPlayer === 'spectator' ||
      gameState.currentPlayer !== viewerPlayer ||
      gameState.status !== 'PLAYING' ||
      isSubmitting
    ) {
      return;
    }

    const pendingMovesKey = JSON.stringify(pendingMoves);
    if (publishedPendingMovesRef.current === pendingMovesKey) return;

    const timer = window.setTimeout(() => {
      publishedPendingMovesRef.current = pendingMovesKey;
      onPendingMovesChange(pendingMoves);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [gameState.currentPlayer, gameState.status, isSubmitting, onPendingMovesChange, pendingMoves, viewerPlayer]);

  // Derive legal moves if it's viewer's turn
  const isMyTurn = viewerPlayer === localPreviewState.currentPlayer;
  const isRolledTurn = gameState.dice.length === 2;
  const maxPlayableMoveCount = isRolledTurn ? getMaxPlayableMoveCount(gameState) : 0;
  const canInteractWithBoard =
    connected && isMyTurn &&
    isRolledTurn &&
    gameState.status === 'PLAYING' &&
    !isSubmitting &&
    pendingMoves.length < maxPlayableMoveCount;

  // All immediate moves for current state
  const legalMoves = canInteractWithBoard ? getAllLegalMoves(localPreviewState) : [];
  const canUndo = pendingMoves.length > 0 && !isSubmitting;
  const canConfirmMoves =
    connected && pendingMoves.length > 0 &&
    !isSubmitting &&
    (localPreviewState.status === 'FINISHED' || pendingMoves.length >= maxPlayableMoveCount);
  const showMoveControls = viewerPlayer !== 'spectator' && isMyTurn && gameState.status === 'PLAYING' && !isSubmitting;

  // Filter for currently selected piece
  const highlightedDestinations = selectedPoint !== null
    ? legalMoves.filter(m => m.from === selectedPoint && validateMoveRule(localPreviewState, m))
    : [];
  const getBearOffMove = (from: SelectedPoint) => {
    if (from === null || from === 'bar' || viewerPlayer === 'spectator') return null;

    const bearingDistance = viewerPlayer === 'player1' ? 24 - from : from + 1;
    return legalMoves
      .filter((move) => move.from === from && move.to === 'borneOff')
      .filter((move) => validateMoveRule(localPreviewState, move))
      .sort((first, second) => {
        const score = (move: Move) => {
          const exactPenalty = move.dieValue === bearingDistance ? 0 : 100;
          return exactPenalty + move.dieValue;
        };

        return score(first) - score(second);
      })[0] ?? null;
  };
  const selectedBearOffMove = getBearOffMove(selectedPoint);
  const canBearOffSelected = selectedBearOffMove !== null;

  const playMove = (move: Move) => {
    playFeedback("move");
    setPendingMoves((moves) => [...moves, move]);
    setSelectedPoint(null);
  };

  const handlePointClick = (index: number) => {
    if (!canInteractWithBoard) return;

    // A highlighted destination keeps priority over selecting a new source.
    // Otherwise, one tap on an eligible checker bears it off using the same
    // validated move / pending preview / undo flow as a normal board move.
    const destinationMove = highlightedDestinations.find(move => move.to === index);
    if (!destinationMove) {
      const bearOffMove = getBearOffMove(index);
      if (bearOffMove) {
        playMove(bearOffMove);
        return;
      }
    }

    // If already selected, try to move to this point
    if (selectedPoint !== null) {
      if (selectedPoint === index) {
        setSelectedPoint(null); // deselect
        return;
      }

      const move = highlightedDestinations.find(m => m.to === index);
      if (move) {
        // Enforce large dice rule if needed
        if (validateMoveRule(localPreviewState, move)) {
          playMove(move);
        } else {
          alert("Invalid move: you must play the larger die.");
        }
        return;
      }

      // If clicked elsewhere but it's not a valid destination, select the new point if it has our checker
      if (localPreviewState.board[index].player === viewerPlayer && localPreviewState.board[index].count > 0) {
        setSelectedPoint(index);
      } else {
        setSelectedPoint(null);
      }
    } else {
      // Nothing selected, try to select
      // But check if we HAVE to play from bar
      if (localPreviewState.bar[viewerPlayer] > 0) {
        // Can only select bar
        return;
      }

      if (localPreviewState.board[index].player === viewerPlayer && localPreviewState.board[index].count > 0) {
        setSelectedPoint(index);
      }
    }
  };

  const handleBarClick = (player: Player) => {
    if (!canInteractWithBoard || player !== viewerPlayer) return;
    if (localPreviewState.bar[viewerPlayer] > 0) {
      setSelectedPoint('bar');
    }
  };

  const canClickSourceChecker = (index: number) => {
    if (!canInteractWithBoard) return false;
    if (localPreviewState.bar[viewerPlayer] > 0) return false;
    if (localPreviewState.board[index].player !== viewerPlayer) return false;
    if (localPreviewState.board[index].count === 0) return false;

    return selectedPoint === index || legalMoves.some((move) => move.from === index);
  };

  const canClickBarChecker = (player: Player) => (
    canInteractWithBoard &&
    viewerPlayer === player &&
    localPreviewState.bar[player] > 0 &&
    legalMoves.some((move) => move.from === 'bar')
  );

  const renderBarCheckers = (player: Player) => {
    const count = previewState.bar[player];
    const canClickTopBarChecker = canClickBarChecker(player);

    return (
      <button
        type="button"
        className="bar-hitbox relative flex h-full min-h-0 w-full flex-col items-center overflow-hidden rounded-sm py-1 focus-visible:outline-2 focus-visible:outline-[var(--teal)]"
        style={{ justifyContent: player === 'player2' ? 'flex-start' : 'flex-end' }}
        disabled={!canClickTopBarChecker}
        aria-label={`Select ${player === 'player1' ? 'white' : 'blue'} checkers on bar, ${count} checkers`}
        aria-pressed={selectedPoint === 'bar' && viewerPlayer === player}
        onClick={() => handleBarClick(player)}
      >
        {count > 0 && (
          <Checker
            player={player}
            count={count}
            isSelected={selectedPoint === 'bar' && viewerPlayer === player}
          />
        )}
      </button>
    );
  };

  const handleBearOffClick = () => {
    if (!canInteractWithBoard || !selectedBearOffMove) return;
    playMove(selectedBearOffMove);
  };

  const renderHalfBoard = (indices: number[], isTop: boolean) => {
    return (
      <div className={roomStyles.gameRoomHalf}>
        {indices.map((idx) => {
          const destinationMoves = highlightedDestinations.filter(m => m.to === idx);
          const isHighlighted = destinationMoves.length > 0;
          const isSelected = selectedPoint === idx;
          const checkerCanBeClicked = isHighlighted || canClickSourceChecker(idx);

          return (
            <div key={idx} className={roomStyles.gameRoomPoint} data-room-point>
              <PointUI
                pointIndex={idx}
                pointData={previewState.board[idx]}
                isTop={isTop}
                isEven={idx % 2 === 0}
                isHighlighted={isHighlighted}
                highlightValues={destinationMoves.map((move) => move.dieValue)}
                selectedChecker={isSelected}
                onPointClick={() => handlePointClick(idx)}
                onCheckerClick={() => handlePointClick(idx)}
                isCheckerClickable={checkerCanBeClicked}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const topIndicesLeft = [11, 10, 9, 8, 7, 6];
  const topIndicesRight = [5, 4, 3, 2, 1, 0];
  const bottomIndicesLeft = [12, 13, 14, 15, 16, 17];
  const bottomIndicesRight = [18, 19, 20, 21, 22, 23];
  const renderBorneOffPieces = (player: Player, count: number) => {
    const isPlayer1 = player === 'player1';

    return Array.from({ length: count }).map((_, index) => (
      <div
        key={`${player}-${index}`}
        className={[
          'bear-off-piece h-2 w-10 rounded-full border shadow-sm sm:h-2.5 sm:w-14',
          isPlayer1
            ? 'border-[var(--coral)] bg-[var(--sand)]'
            : 'border-[var(--teal)] bg-[var(--ocean)]',
        ].join(' ')}
      />
    ));
  };

  return (
    <div className={roomStyles.gameRoomFrame}>
      <div className={roomStyles.gameRoomBoard}>

      {gameState.dice.length === 2 && (
        <div key={gameState.turnNumber} className={`dice-roll ${roomStyles.gameRoomDice}`}>
          <Die value={gameState.dice[0]} isUsed={!previewState.remainingMoves.includes(gameState.dice[0])} className={roomStyles.gameRoomDie} />
          <Die value={gameState.dice[1]} isUsed={!previewState.remainingMoves.includes(gameState.dice[1])} className={roomStyles.gameRoomDie} />
        </div>
      )}

      {/* Board Layout */}
      <div className={roomStyles.gameRoomInner}>

        {/* Top Half */}
        <div className={roomStyles.gameRoomRow}>
          {renderHalfBoard(topIndicesLeft, true)}

          {/* BAR */}
          <div
            className={roomStyles.gameRoomBar}
          >
            {/* Player 2 Bar */}
            {renderBarCheckers('player2')}
          </div>

          {renderHalfBoard(topIndicesRight, true)}
        </div>

        {/* Middle Hinge Line */}
        <div className={roomStyles.gameRoomCenter}>
          <div className="h-px w-full bg-[var(--sand)] shadow-sm sm:h-[2px]" />
        </div>

        {/* Bottom Half */}
        <div className={roomStyles.gameRoomRow}>
          {renderHalfBoard(bottomIndicesLeft, false)}

          {/* BAR */}
          <div
            className={roomStyles.gameRoomBar}
          >
            {/* Player 1 Bar */}
            {renderBarCheckers('player1')}
          </div>

          {renderHalfBoard(bottomIndicesRight, false)}
        </div>

      </div>

      {showMoveControls && (
        <div className={`board-move-controls ${roomStyles.gameRoomMoveControls}`}>
          <button
            type="button"
            onClick={() => {
              setPendingMoves((moves) => moves.slice(0, -1));
              setSelectedPoint(null);
            }}
            disabled={!canUndo}
            className="pointer-events-auto rounded-lg border border-[var(--line)] bg-[var(--navy)] px-4 py-2 text-xs font-bold text-[var(--sand)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canConfirmMoves) return;
              setIsSubmitting(true);
              void onConfirmMoves(pendingMoves).finally(() => {
                setIsSubmitting(false);
              });
            }}
            disabled={!canConfirmMoves}
            className="pointer-events-auto rounded-lg bg-[var(--coral)] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      )}
      </div>

      <aside
        role="button"
        tabIndex={canBearOffSelected ? 0 : -1}
        aria-label="Bear off selected checker"
        aria-disabled={!canBearOffSelected}
        onKeyDown={(event) => {
          if (canBearOffSelected && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            handleBearOffClick();
          }
        }}
        onClick={canBearOffSelected ? handleBearOffClick : undefined}
        className={[
          roomStyles.gameRoomTray,
          canBearOffSelected ? 'cursor-pointer ring-2 ring-[var(--coral)] shadow-[0_0_18px_rgba(217,130,112,0.35)]' : '',
        ].join(' ')}
      >
        <div className="bear-off-pieces absolute inset-2 flex min-h-0 flex-col items-center gap-2 sm:inset-3">
          <div className="bear-off-stack bear-off-stack-player2 flex min-h-0 flex-1 flex-col items-center justify-end gap-0.5">
            <span className="tray-count">{previewState.borneOff.player2.toString().padStart(2, '0')}</span>
            {renderBorneOffPieces('player2', previewState.borneOff.player2)}
          </div>
          <div className="bear-off-divider h-0.5 w-full shrink-0 bg-[var(--navy)]/45" />
          <div className="bear-off-stack bear-off-stack-player1 flex min-h-0 flex-1 flex-col items-center justify-start gap-0.5">
            {renderBorneOffPieces('player1', previewState.borneOff.player1)}
            <span className="tray-count">{previewState.borneOff.player1.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </aside>

      {hectorPlayback.remaining > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--navy)]/70 p-6">
          <video
            key={hectorPlayback.sequence}
            src="/hector.mp4"
            aria-label="Hector has captured a checker"
            onLoadedData={(event) => {
              const video = event.currentTarget;
              if (video.dataset.playbackStarted) return;
              video.dataset.playbackStarted = 'true';
              void video.play().catch(() => {
                // Mobile browsers may block sound on remotely triggered playback.
                video.muted = true;
                void video.play().catch(finishHectorPlayback);
              });
            }}
            onEnded={finishHectorPlayback}
            onError={finishHectorPlayback}
            loop={false}
            playsInline
            className="hector-capture max-h-[78vh] w-[min(82vw,460px)] object-cover shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}

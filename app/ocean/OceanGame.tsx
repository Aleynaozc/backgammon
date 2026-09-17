'use client';

import { isGameDevToolsEnabled } from '@/lib/game/dev-tools';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Dices, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { getInitialGameState } from '@/lib/game/board';
import { checkTurnEnd, getAllLegalMoves, validateMoveRule } from '@/lib/game/engine';
import { applyMove } from '@/lib/game/moves';
import { playFeedback, setFeedbackEnabled } from '@/lib/game/feedback';
import type { GameState, Move } from '@/types/game';
import s from './ocean.module.css';

const top = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const bottom = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Die({ value }: { value: number }) {
  return <span className={s.die} aria-label={`Die: ${value}`}>{Array.from({ length: 9 }, (_, i) => <i key={i} className={pips[value].includes(i) ? s.pip : undefined} />)}</span>;
}

export default function OceanGame() {
  const [game, setGame] = useState(getInitialGameState);
  const [selected, setSelected] = useState<Move['from'] | null>(null);
  const [sound, setSound] = useState(false);
  const [invite, setInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [dev, setDev] = useState(false);
  const [history, setHistory] = useState<GameState[]>([]);
  const waiting = game.status === 'WAITING';
  const finished = game.status === 'FINISHED';
  const legal = game.status === 'PLAYING' ? getAllLegalMoves(game) : [];
  const targets = selected === null ? [] : legal.filter(m => m.from === selected && validateMoveRule(game, m));
  const name = game.currentPlayer === 'player1' ? 'ALEYNA' : 'GUEST';

  useEffect(() => () => setFeedbackEnabled(false), []);
  useEffect(() => {
    if (!invite) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setInvite(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [invite]);

  function move(m: Move) {
    setHistory(previous => [...previous, game]);
    setGame(checkTurnEnd(applyMove(game, m)));
    setSelected(null);
    playFeedback('move');
  }

  function select(index: number) {
    const destination = targets.find(m => m.to === index);
    if (destination) return move(destination);
    setSelected(selected === index ? null : legal.some(m => m.from === index) ? index : null);
  }

  function roll() {
    if (waiting || finished || game.dice.length) return;
    const values = crypto.getRandomValues(new Uint32Array(2));
    const dice: [number, number] = [values[0] % 6 + 1, values[1] % 6 + 1];
    setHistory([]);
    setGame(checkTurnEnd({ ...game, dice, remainingMoves: dice[0] === dice[1] ? Array(4).fill(dice[0]) : [...dice] }));
    playFeedback('dice');
  }

  function start() {
    setGame({ ...getInitialGameState(), status: 'PLAYING' });
    setHistory([]);
    setSelected(null);
  }

  function row(indices: number[], lower: boolean) {
    return <div className={`${s.row} ${lower ? s.lower : ''}`}>{indices.map((index, position) => {
      const point = game.board[index];
      const highlighted = targets.some(m => m.to === index);
      return <button key={index} type="button" onClick={() => select(index)} disabled={!highlighted && !legal.some(m => m.from === index)}
        className={`${s.point} ${position % 2 === (lower ? 1 : 0) ? s.coral : ''} ${selected === index ? s.selected : ''} ${highlighted ? s.target : ''}`}
        style={{ gridColumn: position < 6 ? position + 1 : position + 2 }}
        aria-label={`Point ${index + 1}, ${point.count} ${point.player === 'player1' ? 'ivory' : 'teal'} checkers${highlighted ? ', available move' : ''}`} aria-pressed={selected === index}>
        <span className={s.number}>{index + 1}</span><span className={s.triangle} />
        <span className={s.stack}>{Array.from({ length: Math.min(point.count, 5) }, (_, i) => <span key={i} className={`${s.checker} ${point.player === 'player2' ? s.teal : ''}`}>{i === 4 && point.count > 5 ? point.count : ''}</span>)}</span>
        {highlighted && <span className={s.destination} />}
      </button>;
    })}</div>;
  }

  return <main className={s.page}>
    <header className={s.header}>
      <Link href="/" className={s.brand} aria-label="Backgammon home"><span className={s.brandMark}><i /><i /><i /></span> ocean<span className={s.brandSub}>BACKGAMMON CLUB</span></Link>
      <span className={s.edition}>THE EVENING EDITION <span>—</span> 01</span>
      <button className={s.iconButton} onClick={() => { setFeedbackEnabled(!sound); setSound(!sound); }} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
    </header>

    <section className={s.gameArea} aria-label="Backgammon table">
      <div className={s.tableHeading}><div><p className={s.eyebrow}>GOOD TEAM. A LITTLE COMPETITION.</p><h1>Make time for a good game.</h1></div><span className={s.tableLabel}>TURKISH X SPANISH <b>01</b></span></div>
      <div className={s.playerRow}>
        <div className={s.player}><span className={`${s.playerDot} ${s.ivoryDot}`} /><span>ALEYNA <small>{waiting ? 'YOU' : 'IVORY'}</small></span></div>
        <span className={s.status} role="status"><i />{waiting ? 'WAITING FOR OPPONENT' : finished ? `${game.winner === 'player1' ? 'ALEYNA' : 'GUEST'} WINS` : `${name}’S TURN`}</span>
        <div className={`${s.player} ${s.opponent}`}><span>{waiting ? 'OPEN SEAT' : 'GUEST'}<small>{waiting ? 'INVITE A FRIEND' : 'OCEAN'}</small></span><span className={`${s.playerDot} ${waiting ? s.emptyDot : s.tealDot}`} /></div>
      </div>

      <div className={s.boardFrame}>
        <div className={s.board}>
          {row(top, false)}
          <div className={s.center}><span className={s.centerLine} /><div className={s.diceArea}>{game.dice.length ? game.dice.map((value, i) => <Die key={i} value={value} />) : <span className={s.boardWord}>O C E A N</span>}</div><span className={s.centerLine} /></div>
          {row(bottom, true)}
          <div className={s.bar}>{(['player2', 'player1'] as const).map(player => <button key={player} className={s.barButton} disabled={!game.bar[player] || player !== game.currentPlayer || !game.dice.length} onClick={() => setSelected('bar')} aria-label={`${game.bar[player]} captured checkers, select to re-enter`} aria-pressed={selected === 'bar' && player === game.currentPlayer}>{game.bar[player] > 0 && <span className={`${s.checker} ${player === 'player2' ? s.teal : ''}`}>{game.bar[player]}</span>}</button>)}</div>
        </div>
        <div className={s.tray}><span className={s.trayCount}>{game.borneOff.player2.toString().padStart(2, '0')}</span><span className={s.trayLine} /><button className={s.bearOff} disabled={!targets.some(m => m.to === 'borneOff')} onClick={() => { const m = targets.find(m => m.to === 'borneOff'); if (m) move(m); }} aria-label="Bear off selected checker"><ArrowUpRight size={17} /></button><span className={s.trayLine} /><span className={s.trayCount}>{game.borneOff.player1.toString().padStart(2, '0')}</span></div>
      </div>

      <div className={s.controls}>
        <button className={s.secondary} onClick={() => setInvite(true)}>Invite a friend <ArrowUpRight size={15} /></button>
        <span className={s.hint}>{waiting ? 'A good game starts with good company.' : finished ? 'Well played. Another round?' : game.dice.length ? 'Select a checker, then its destination.' : 'Take your time. Roll when you’re ready.'}</span>
        <div className={s.actions}>{history.length > 0 && <button className={s.iconButton} aria-label="Undo last move" onClick={() => { setGame(history[history.length - 1]); setHistory(history.slice(0, -1)); setSelected(null); }}><RotateCcw size={16} /></button>}<button className={s.primary} disabled={waiting || (!finished && game.dice.length > 0)} onClick={finished ? start : roll}><Dices size={17} />{finished ? 'Play again' : 'Roll dice'}</button></div>
      </div>
    </section>

    <footer className={s.footer}><Link href="/"><ArrowLeft size={13} /> Back to lobby</Link><span>A QUIETER KIND OF COMPETITION.</span><button onClick={start}>{waiting ? 'Try a local game' : 'Restart local game'} <ArrowUpRight size={13} /></button></footer>

    {invite && <div className={s.backdrop} onClick={() => setInvite(false)}><section className={s.modal} role="dialog" aria-modal="true" aria-labelledby="invite-title" onClick={event => event.stopPropagation()}><button autoFocus className={s.close} aria-label="Close invitation" onClick={() => setInvite(false)}><X size={20} /></button><p className={s.eyebrow}>THERE’S ROOM FOR TWO</p><h2 id="invite-title">Better with company.</h2><p>This table is a design preview with a local two-player mode. Share the preview, or head to the lobby to create an online game.</p><button className={s.primary} onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check size={16} /> : <ArrowUpRight size={16} />}{copied ? 'Preview link copied' : 'Copy preview link'}</button>{copyError && <p role="status">Copy the address from your browser to share this preview.</p>}<Link className={s.modalLink} href="/">Create an online game <ArrowUpRight size={15} /></Link></section></div>}
    {isGameDevToolsEnabled() && <div className={s.dev}><button onClick={() => setDev(!dev)} aria-expanded={dev}>DEV</button>{dev && <div><p>Ocean / local preview</p><button onClick={() => { setGame(getInitialGameState()); setSelected(null); setHistory([]); }}>Reset waiting state</button><button onClick={start}>Start local game</button></div>}</div>}
  </main>;
}

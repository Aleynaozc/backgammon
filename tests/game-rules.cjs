/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness transpiles the TypeScript engine in memory. */
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const { getInitialGameState } = require('../lib/game/board.ts');
const { checkTurnEnd, validateMoveRule } = require('../lib/game/engine.ts');
const { applyMove, getLegalMovesForPiece } = require('../lib/game/moves.ts');
function state() {
  return { ...getInitialGameState(), status: 'PLAYING', board: Array.from({length:24}, () => ({player:null,count:0})), dice:[1,2], remainingMoves:[1,2] };
}
test('blocked bar automatically passes and records reason', () => {
  const s=state(); s.bar.player1=1;
  s.board[0]={player:'player2',count:2}; s.board[1]={player:'player2',count:2};
  const next=checkTurnEnd(s);
  assert.equal(next.currentPlayer,'player2'); assert.equal(next.lastPass.player,'player1'); assert.deepEqual(next.dice,[]);
});
test('unrolled turn does not pass', () => {
  const s=state(); s.dice=[]; s.remainingMoves=[];
  assert.equal(checkTurnEnd(s),s);
});
test('capture moves blot to bar and bar must be played first', () => {
  const s=state(); s.board[0]={player:'player1',count:1}; s.board[1]={player:'player2',count:1};
  const next=applyMove(s,{from:0,to:1,dieValue:1}); assert.equal(next.bar.player2,1); assert.equal(next.board[1].player,'player1');
  s.bar.player1=1; assert.equal(validateMoveRule(s,{from:0,to:1,dieValue:1}),false);
});
test('oversized bearing off only allowed from furthest checker, both players', () => {
  for (const player of ['player1','player2']) {
    const s=state(); s.currentPlayer=player; s.borneOff[player]=13;
    const near=player==='player1'?23:0, far=player==='player1'?20:3;
    s.board[near]={player,count:1}; s.board[far]={player,count:1};
    assert.equal(getLegalMovesForPiece(s,player,near,6),null);
    assert.equal(getLegalMovesForPiece(s,player,far,6).to,'borneOff');
    s.bar[player]=1; assert.equal(getLegalMovesForPiece(s,player,far,6),null);
  }
});
test('higher die required when only one die can be played', () => {
  const s=state(); s.borneOff.player1=14; s.board[23]={player:'player1',count:1};
  assert.equal(validateMoveRule(s,{from:23,to:'borneOff',dieValue:1}),false);
  assert.equal(validateMoveRule(s,{from:23,to:'borneOff',dieValue:2}),true);
});

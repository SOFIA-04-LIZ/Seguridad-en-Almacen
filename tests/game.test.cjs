'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const nodes = new Map();
function node() {
  return {
    children: [],
    dataset: {},
    textContent: '',
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} },
    setAttribute() {},
    addEventListener(type, handler) {
      (this.listeners ??= {})[type] = handler;
    },
    setPointerCapture() {},
    getBoundingClientRect() {
      return { left: 0, width: 200, height: 44 };
    },
    scrollIntoView() {},
    append(child) {
      this.children.push(child);
    },
    querySelector() {
      return node();
    },
    set innerHTML(value) {
      this.html = value;
      this.children = [];
      if (this === nodes.get('#modal'))
        for (const key of ['.equipment', '.hazard-options', '.feedback', '.checklist-options'])
          nodes.delete(key);
    },
    get innerHTML() {
      return this.html || '';
    },
  };
}
const document = {
  hidden: false,
  querySelector(key) {
    if (!nodes.has(key)) nodes.set(key, node());
    return nodes.get(key);
  },
  querySelectorAll(key) {
    return key === '[data-equipment]' ? nodes.get('.equipment')?.children || [] : [];
  },
  createElement: node,
  addEventListener() {},
};
let canvasCalls = 0;
const context = new Proxy({}, { get: () => () => { canvasCalls++; }, set: () => true });
document.querySelector('#game').getContext = () => context;
document.querySelector('#game').getBoundingClientRect = () => ({
  width: 1200,
  height: 540,
});
const sandbox = {
  document,
  window: { addEventListener() {} },
  requestAnimationFrame() {},
  console,
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../scenarios.js'), 'utf8'),
  sandbox,
);
const code = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8').replace(
  /reset\(\);\s*requestAnimationFrame\(frame\);/,
  `reset();globalThis.test={frame,updateWorkers,passingVisible,pallets,inventoryReach,inspectHazard,get world(){return WORLD},toggleHandrail,nearbyHandrail,get railHeld(){return railHeld},scoreSummary,finish,inventorySummary,update,interact,reset,render,pause,hud,hazards,crossings,noJumpZones,keys,workers,stairs,stairWidth,floorAt,runSpeed,stopTime,stopWidth,buildSector,advanceSector,focusTokens,coins,
 get sector(){return sector},get totalFish(){return totalFish},get totalCoins(){return totalCoins},get fishFound(){return fishFound},get streak(){return streak},get completedStairs(){return completedStairs},get totalActs(){return totalActs},get totalReports(){return totalReports},get totalPallets(){return totalPallets},
 get player(){return player},get state(){return state},get lives(){return lives},get worn(){return worn},get epp(){return epp},get incident(){return incident},get triggered(){return triggered},get found(){return found},
 start(ids=['helmet','vest','boots']){worn=new Set(ids);state='playing';hud()},
 place(x,y=380){player.x=x;player.y=y;player.vx=player.vy=0;player.ground=true;clearKeys()}};`,
);
vm.runInContext(code, sandbox);
const t = sandbox.test,
  $ = (s) => document.querySelector(s),
  step = (n = 1) => {
    for (let i = 0; i < n; i++) t.update(1 / 60);
  };
// The actual entry button accepts wrong and empty choices, and exclusive slots stay exclusive.
assert.equal(t.state, 'ready');
$('#start-game').onclick();
assert.equal(t.state, 'equipment');
$('#enter').onclick();
assert.equal(t.state, 'playing');
const lever = $('#speed-lever'),
  pointer = { pointerId: 1, preventDefault() {} };
lever.listeners.pointerdown({ ...pointer, clientX: 0 });
assert.equal(t.keys.left, true);
assert.equal(t.keys.right, false);
lever.listeners.pointermove({ ...pointer, clientX: 200 });
assert.equal(t.keys.left, false);
assert.equal(t.keys.right, true);
lever.listeners.pointerup(pointer);
assert.equal(t.keys.left, false);
assert.equal(t.keys.right, false);
assert.equal(t.runSpeed(), 300);
const runnerStart = t.player.x;
step(120);
assert.equal(t.player.x, runnerStart, 'opening preview should allow observation');
step(50);
assert(t.player.x > runnerStart, 'runner should advance after the preview');
t.keys.left = true;
const brakePoint = t.player.x;
step(10);
assert.equal(t.player.x, brakePoint, 'brake should stop the runner');
t.keys.left = false;
t.keys.right = true;
step(5);
assert(t.player.x > brakePoint + 20, 'accelerate should increase speed');
assert.equal(t.epp, false);
const firstSectorSpeed = t.runSpeed();
t.advanceSector();
assert.equal(t.runSpeed(), firstSectorSpeed + 20, 'Each sector adds a small speed increase');
t.reset();
$('#start-game').onclick();
const buttons = $('.equipment').children;
buttons.find((b) => b.dataset.equipment === 'helmet').onclick();
buttons.find((b) => b.dataset.equipment === 'cap').onclick();
buttons.find((b) => b.dataset.equipment === 'headphones').onclick();
$('#enter').onclick();
assert(t.worn.has('cap'));
assert(!t.worn.has('helmet'));
assert(t.worn.has('headphones'));
// Each equipment incident is outside a crossing, costs exactly one life and corrects its cause.
for (const [ids, x, id, fix] of [
  [['cap', 'vest', 'boots'], 301, 'head', 'helmet'],
  [['helmet', 'vest', 'boots', 'headphones'], 651, 'audio', null],
  [['helmet', 'vest', 'sandals'], 1121, 'feet', 'boots'],
  [['helmet', 'boots'], 1651, 'visibility', 'vest'],
  [['vest', 'boots'], 301, 'head', 'helmet'],
  [['helmet', 'vest'], 1121, 'feet', 'boots'],
]) {
  t.reset();
  t.start(ids);
  t.place(x);
  step();
  assert.equal(t.state, 'incident');
  assert.equal(t.incident.id, id);
  assert.equal(t.lives, 2);
  assert(!t.crossings.some((c) => x > c.x && x < c.x + c.w));
  t.render();
  step(65);
  t.render();
  step(65);
  assert.equal(t.state, 'lesson');
  const lives = t.lives;
  step(100);
  assert.equal(t.lives, lives);
  $('#correct').onclick();
  assert.equal(t.state, 'playing');
  if (fix) assert(t.worn.has(fix));
  assert(!t.worn.has('headphones'));
  step(120);
  assert.equal(t.lives, 2);
}
// Passing an unreported condition or act costs one life and explains the miss once.
t.reset();
t.start();
t.advanceSector();
const missedHazard = t.hazards[0];
t.hazards.filter((h) => h !== missedHazard).forEach((h) => (h.reported = true));
t.workers.forEach((w) => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
t.crossings.forEach((c) => (c.cleared = true));
t.place(missedHazard.x + 110);
if (t.nearbyHandrail()) t.toggleHandrail();
t.keys.right = true;
step();
assert.equal(t.state, 'lesson');
assert.equal(t.lives, 2);
assert(missedHazard.missed);
assert($('#modal').innerHTML.includes(missedHazard.title));
$('#continue-miss').onclick();
step();
assert.equal(t.lives, 2);
t.reset();
t.start();
const missedAct = t.workers.find((w) => w.id === 'phoneWalking');
t.hazards.forEach((h) => (h.reported = true));
t.workers.filter((w) => w !== missedAct).forEach((w) => (w.reported = true));
t.crossings.forEach((c) => (c.cleared = true));
t.place(missedAct.max + 110);
if (t.nearbyHandrail()) t.toggleHandrail();
t.keys.right = true;
step();
assert.equal(t.state, 'lesson');
assert.equal(t.lives, 2);
assert(missedAct.missed);
assert($('#modal').innerHTML.includes(missedAct.title));
$('#continue-miss').onclick();
t.place(missedAct.x - 16);
t.interact();
assert.equal(t.state, 'inspection');
$('.hazard-options').children[missedAct.answer].onclick();
assert.equal(t.state, 'playing');
assert(missedAct.reported);
// Optional airborne attention points reward timing without replacing safety objectives.
t.reset();
t.start();
assert(t.focusTokens.length > 0);
const token = t.focusTokens[0];
t.place(token.x - 16, 320);
t.player.ground = false;
step();
assert(token.collected);
assert.equal(t.streak, 1);
// Three bad choices show the third explanation before the loss screen.
t.reset();
t.start(['cap', 'sandals', 'headphones']);
for (const x of [301, 651, 1121]) {
  t.place(x);
  step();
  step(120);
  assert.equal(t.state, 'lesson');
  $('#correct').onclick();
}
assert.equal(t.state, 'lost');
assert.equal(t.lives, 0);
const replayGear = [...t.worn].sort();
$('#again').onclick();
assert.equal(t.state, 'playing');
assert.equal(t.lives, 3);
assert.deepEqual([...t.worn].sort(), replayGear);
const replayX = t.player.x;
step(120);
assert.equal(t.player.x, replayX);
step(50);
assert(t.player.x > replayX, 'one-tap replay should resume after the preview');
// Wrong answers do not report; a correct answer registers once and preserves lives.
t.reset();
t.start();
t.advanceSector();
t.place(t.hazards[0].x);
t.interact();
assert.equal(t.state, 'inspection');
$('.hazard-options').children[(t.hazards[0].answer + 1) % 3].onclick();
assert.equal(t.hazards[0].reported, false);
assert.equal(t.lives, 2);
$('.hazard-options').children[t.hazards[0].answer].onclick();
assert.equal(t.hazards[0].reported, true);
assert.equal(t.state, 'playing');
t.interact();
assert.equal(t.state, 'inspection');
$('.hazard-options').children[t.hazards[0].answer].onclick();
assert.equal(t.hazards.filter((h) => h.reported).length, 1);
// No exit at the former door location.
t.place(t.pallets.find(p => p.brand === 'STELLA').x + 37);
t.interact();
assert(t.found);
t.crossings.forEach((c) => (c.cleared = true));
t.hud();
t.place(100);
t.interact();
assert.equal(t.state, 'playing');
// Flying Fish is a separate pallet objective and the new observations are present.
t.reset();
t.start();
assert(
  Math.min(
    ...t.hazards.map((h) => h.x),
    ...t.workers.filter((w) => w.id !== 'noHandrail').map((w) => w.min),
  ) >= 425,
  'opening route should be clear',
);
assert.equal(t.hazards.length, 0);
assert(!t.hazards.some((h) => h.id === 'bench'));
assert(t.workers.some((w) => w.id === 'noVest'));
assert(!t.workers.some((w) => w.id === 'nearForklift'));
t.place(1283);
t.interact();
assert(t.fishFound);
assert.equal(t.totalFish, 1);
assert.equal(t.totalFish, 1);
// Coins on the safe route grant an extra life after five pickups.
t.reset();
t.start();
const safeCoins = t.coins.filter((c) => !c.risky);
assert(safeCoins.length >= 5);
for (const coin of safeCoins.slice(0, 5)) {
  t.place(coin.x - 16);
  step();
}
assert.equal(t.totalCoins, 5);
assert.equal(t.lives, 4);
const risky = t.coins.find((c) => c.risky);
assert(risky);
assert(!risky.collected);
t.crossings.forEach((c) => (c.cleared = true));
t.place(risky.x - 16);
step();
assert(risky.collected);
// A coin appears in the center of the crossing and expires after two seconds.
t.reset();
t.start();
const timed = t.coins.find((c) => c.risky),
  cross = timed.crossing;
assert.equal(timed.x, cross.x + cross.w / 2);
assert.equal(timed.active, false);
t.place(cross.x - t.stopWidth() - 45);
step();
assert(timed.active);
assert(cross.coinTrap);
step(65);
assert(timed.expired);
assert.equal(timed.active, false);
assert.equal(cross.coinTrap, false);
assert.equal(timed.collected, false);
assert.equal(t.lives, 3);
assert.equal(t.state, 'playing');
t.reset();
t.start();
const safeTimed = t.coins.find((c) => c.risky),
  safeCross = safeTimed.crossing;
t.place(safeCross.x - t.stopWidth() - 16);
step(65);
assert(safeCross.cleared);
assert(safeTimed.expired);
assert.equal(t.lives, 3);
// Complete the full route, inspecting every condition through real answer handlers.
t.reset();
t.start();
t.workers.forEach((w) => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
let frames = 0;
while (t.sector === 1 && frames++ < 5000) {
  const p = t.player,
    c = t.crossings.find((c) => !c.cleared && p.x + 32 > c.x - 95 && p.x + 32 <= c.x);
  t.keys.right = !c;
  if (t.nearbyHandrail() && !t.railHeld) t.toggleHandrail();
  step();
  const h = t.hazards.find((h) => !h.reported && Math.abs(p.x + 16 - h.x) < 65);
  if (h) {
    t.interact();
    assert.equal(t.state, 'inspection');
    $('.hazard-options').children[h.answer].onclick();
    assert.equal(t.state, 'playing');
  }
  if (p.x > 2470 && !t.found) t.interact();
  assert.equal(t.state, 'playing');
}
assert(frames < 5000);
assert.equal(t.sector, 2);
assert.equal(t.totalReports, 0);
assert.equal(t.totalPallets, 1);
assert.equal(t.completedStairs, 1);
assert(t.lives >= 3 && t.lives <= 5);
assert.equal(t.state, 'playing');
assert(t.hazards.every((h) => !h.reported));
assert.equal(t.stairs.length, 2);
assert.equal(t.crossings.length, 3);
t.render();
// Crossing penalties still work, even in the air.
t.reset();
t.start();
t.place(t.crossings[0].x - 31, 270);
t.player.ground = false;
t.keys.right = true;
step();
assert.equal(t.state, 'dying');
assert.equal(t.lives, 2);
step(100);
assert.equal(t.state, 'lesson');
assert($('#modal').innerHTML.includes('Una moneda no vale tu vida'));
$('#after-coin').onclick();
assert.equal(t.state, 'playing');
// Every storage and hazard zone disallows takeoff and cannot be used as a platform.
t.reset();
t.start();
for (const zone of t.noJumpZones) {
  t.crossings.forEach((c) => (c.cleared = true));
  t.place(zone.x + 5);
  t.keys.jump = true;
  step();
  assert.equal(t.player.y, 380);
}
t.reset();
t.start();
t.keys.jump = true;
step();
assert(t.player.y < 380);
step(60);
assert.equal(t.player.y, 380);
t.pause();
const x = t.player.x;
t.keys.right = true;
step(60);
assert.equal(t.player.x, x);
assert.equal(t.state, 'paused');
t.reset();
assert(t.hazards.every((h) => !h.reported));
assert.equal(t.triggered.size, 0);
assert.equal(t.worn.size, 0);
assert.equal(t.lives, 3);
console.log(
  'PASS: entry choices, six equipment cases, explanations/corrections, game over, hazard quiz/reporting, continuous mission, no exit, crossing penalties, no climbing, pause and reset.',
);

// Mandatory ascent and descent, plus difficulty growth across five consecutive sectors.
t.reset();
t.start();
assert.equal(t.sector, 1);
assert.equal(t.stairs.length, 1);
let maxHeight = 0;
let limit = 0;
const stairCompletions = [];
while (t.sector < 6 && limit++ < 15000) {
  t.hazards.forEach((h) => (h.reported = true));
  t.workers.forEach((w) => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
  const p = t.player,
    c = t.crossings.find(
      (c) => !c.cleared && p.x + 32 > c.x - t.stopWidth() + 15 && p.x + 32 <= c.x,
    );
  t.keys.right = !c;
  if (t.nearbyHandrail() && !t.railHeld) t.toggleHandrail();
  const before = t.completedStairs,
    sectorBefore = t.sector;
  step();
  if (t.completedStairs !== before) stairCompletions.push(sectorBefore);
  maxHeight = Math.max(maxHeight, 380 - p.y);
  assert.equal(t.state, 'playing', 'Continuous safe route must remain traversable');
}
assert(limit < 15000);
assert.equal(t.sector, 6);
assert.equal(t.runSpeed(), 400);
assert(maxHeight >= 135);
assert.equal(t.completedStairs, 9, JSON.stringify(stairCompletions));
assert(t.lives >= 3 && t.lives <= 5);
assert.equal(t.crossings.length, 4);
assert(t.stopTime() > 1.2);
assert(t.stopWidth() < 115);
// Cannot jump over the staircase entrance or jump from its upper walkway.
t.reset();
t.start();
const stair = t.stairs[0];
t.place(stair.x - 17, 270);
t.player.ground = false;
t.keys.right = true;
step();
assert(t.player.x + 16 < stair.x);
t.place(
  stair.x + stair.steps * stair.tread + 30,
  t.floorAt(stair.x + stair.steps * stair.tread + 46) - 66,
);
t.keys.jump = true;
step();
assert(t.player.ground);
assert.equal(t.player.vy, 0);
console.log(
  'PASS: five endless sectors, cumulative counters, increased crossings/waiting, narrower stop areas, mandatory stairs and no staircase jump bypass.',
);

// Unsafe acts move, remain unmarked before reporting and are separate from conditions.
t.reset();
t.start();
const phoneWorker = t.workers.find((w) => w.id === 'phoneWalking');
assert(phoneWorker && !phoneWorker.onStairs);
assert.equal(phoneWorker.feet, 446);
t.place(phoneWorker.x - 16, phoneWorker.feet - 66);
t.interact();
assert.equal(t.state, 'inspection');
assert(
  $('.hazard-options').children[phoneWorker.answer].textContent.includes('teléfono'),
);
$('.hazard-options').children[phoneWorker.answer].onclick();
assert(phoneWorker.reported);
assert.equal(t.totalActs, 1);
t.reset();
t.start();
const worker = t.workers.find(w => w.id === 'phoneWalking');
const initialX = worker.x;
step(30);
assert.notEqual(worker.x, initialX);
t.place(worker.x - 16, worker.feet - 66);
t.interact();
assert.equal(t.state, 'inspection');
$('.hazard-options').children[(worker.answer + 1) % 3].onclick();
assert.equal(t.totalActs, 0);
assert(!worker.reported);
$('.hazard-options').children[worker.answer].onclick();
assert.equal(t.totalActs, 1);
assert.equal(t.totalReports, 0);
assert(worker.reported);
assert.equal(t.state, 'playing');
t.interact();
assert.equal(t.state, 'inspection');
$('.hazard-options').children[worker.answer].onclick();
assert.equal(t.totalActs, 1);
t.advanceSector();
t.advanceSector();
const stairWorker = t.workers.find((w) => w.id === 'noHandrail');
t.place(stairWorker.x - 16, stairWorker.feet - 66);
t.interact(); // First interaction takes the handrail.
t.interact();
assert.equal(t.state, 'inspection');
const frozenX = stairWorker.x;
step(90);
assert.equal(stairWorker.x, frozenX);
$('.hazard-options').children[stairWorker.answer].onclick();
assert.equal(t.state, 'playing');
assert.equal(t.totalActs, 2);
assert.equal(t.totalReports, 0);
t.render();
// Reports survive sector changes; new people are reportable and full reset clears the totals.
t.hazards.forEach((h) => (h.reported = true));
t.workers.forEach((w) => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
t.place(t.world - 40);
t.keys.right = true;
step(10);
assert.equal(t.sector, 4);
assert.equal(t.totalActs, 2);
assert(t.workers.every((w) => !w.reported));
t.keys.right = false;
const climber = t.workers.find((w) => w.id === 'noHandrail');
let low = climber.feet,
  high = climber.feet;
for (let i = 0; i < 600; i++) {
  step();
  low = Math.min(low, climber.feet);
  high = Math.max(high, climber.feet);
}
assert(high - low > 60, 'Worker visibly climbs and descends');
t.reset();
assert.equal(t.totalActs, 0);
assert(t.workers.every((w) => !w.reported));
console.log(
  'PASS: moving unsafe actors, wrong/correct answers, separate counts, duplicate protection, inspection pause, stair movement, sector persistence and reset.',
);

// Every rebuild moves each scenario to a different bay, without overlap or unreachable acts.
let prior = new Map(),
  priorCrossings = [],
  priorStairs = [];
for (let layout = 0; layout < 120; layout++) {
  if (layout % 8 === 0) {
    t.reset();
    t.start();
  } else t.advanceSector();
  const positions = new Map(t.hazards.map((h) => [h.id, h.x]));
  for (const walker of t.workers.filter((w) => !w.onStairs && !w.id.startsWith('forklift') && w.id !== 'running'))
    positions.set(walker.id, (walker.min + walker.max) / 2);
  for (const crossing of t.crossings) {
    assert(
      priorCrossings.every((x) => Math.abs(crossing.x - x) >= 50),
      'Crossing repeated its previous position',
    );
    assert(
      t.stairs.every(
        (stair) =>
          crossing.x + crossing.w + 60 < stair.x ||
          crossing.x - 60 > stair.x + t.stairWidth(stair),
      ),
      'Crossing overlaps a staircase',
    );
  }
  for (const stair of t.stairs)
    assert(
      priorStairs.every((x) => Math.abs(stair.x - x) >= 50),
      'Staircase repeated its previous position',
    );
  const phone = t.workers.find((w) => w.id === 'phoneWalking');
  assert(
    phone && !phone.onStairs && phone.feet === 446,
    'Phone worker must stay on the warehouse floor',
  );
  for (const [id, x] of positions) {
    if (prior.has(id))
      assert(Math.abs(x - prior.get(id)) > 100, 'Same scenario must change bays');
    assert(x > 100 && x < t.world - 80);
    for (const c of t.crossings)
      assert(
        x + 70 < c.x - t.stopWidth() || x - 70 > c.x + c.w,
        'Bay avoids crossings and stop zones',
      );
    for (const stair of t.stairs)
      assert(
        x + 70 < stair.x || x - 70 > stair.x + t.stairWidth(stair),
        'Ground bay avoids staircase',
      );
  }
  const points = [...positions.values()];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      assert(Math.abs(points[i] - points[j]) > 170, 'Scenes remain separated');
  const actor = t.workers.find((w) => w.id === 'noHandrail');
  assert.equal(Boolean(actor), t.sector >= 3);
  if (actor) {
    assert.equal(actor.feet, t.floorAt(actor.x));
    assert(actor.feet < 446);
    assert(t.stairs.some((s) => actor.min > s.x && actor.max < s.x + t.stairWidth(s)));
  }
  prior = positions;
  priorCrossings = t.crossings.map((c) => c.x);
  priorStairs = t.stairs.map((s) => s.x);
}
console.log(
  'PASS: 120 randomized layouts, no repeated scenario bay, separated objects, clear crossings and valid stair patrols.',
);

// Final inventory includes every started sector and resets with a new game.
t.reset();
t.start();
assert.match(t.inventorySummary(), /Stella Artois<\/th><td>0 de 1<\/td><td>1/);
assert.match(t.inventorySummary(), /diferencia de inventario de 2 tarimas/);
t.place(t.pallets.find(p => p.brand === 'STELLA').x + 37);
t.interact();
assert.match(t.inventorySummary(), /Stella Artois<\/th><td>1 de 1<\/td><td>0/);
assert.match(t.inventorySummary(), /diferencia de inventario de 1 tarima sin/);
t.place(1230);
t.interact();
assert.match(t.inventorySummary(), /No hay diferencia de inventario/);
t.advanceSector();
assert.match(t.inventorySummary(), /Flying Fish<\/th><td>1 de 2<\/td><td>1/);
t.finish();
assert.match($('#modal').innerHTML, /Inventario de tarimas/);
assert.match($('#modal').innerHTML, /diferencia de inventario de 2 tarimas/);
t.reset();
assert.match(t.inventorySummary(), /Stella Artois<\/th><td>0 de 1<\/td><td>1/);
console.log('PASS: final inventory counts, missing pallets, complete inventory, cumulative sectors and reset.');

// Scoring rewards unique progress and registered inventory; new games reset it.
assert.equal(t.scoreSummary().total, 0);
t.start();
t.place(310);
t.update(0);
assert.equal(t.scoreSummary().distance, 200);
assert.equal(t.scoreSummary().travel, 2);
t.place(210);
t.update(0);
assert.equal(t.scoreSummary().distance, 200);
t.advanceSector();
t.place(130);
t.update(0);
assert.equal(t.scoreSummary().distance, 300);
t.place(t.pallets.find(p => p.brand === 'STELLA').x + 37);
t.interact();
t.interact();
assert.equal(t.scoreSummary().inventory, 100);
assert.equal(t.scoreSummary().total, 103);
t.finish();
assert.doesNotMatch($('#modal').innerHTML, /<span>Stella:|<span>Flying Fish:/);
assert.match($('#modal').innerHTML, /result-box/);
assert.match($('#modal').innerHTML, /103 puntos/);
t.reset();
assert.equal(t.scoreSummary().total, 0);
assert.equal(t.scoreSummary().distance, 0);
console.log('PASS: score breakdown, unique distance, sector accumulation, duplicate inventory prevention and reset.');

// Interact takes the handrail; ignoring it costs one life per staircase.
t.reset();
t.start();
t.hazards.forEach(h => h.reported = true);
t.workers.forEach(w => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
const railStair = t.stairs[0];
t.place(railStair.x - 17);
t.keys.right = true;
step();
assert.equal(t.state, 'lesson');
assert.equal(t.lives, 2);
assert.equal(t.railHeld, false);
assert.match($('#modal').innerHTML, /apoyo y equilibrio/);
step(30);
assert.equal(t.lives, 2, 'No repeated penalty while explanation is open');
$('#after-handrail').onclick();
t.interact();
assert.equal(t.railHeld, true, 'Existing interaction chooses the handrail');
t.update(3);
t.keys.right = true;
step(10);
assert(t.player.x > railStair.x);
t.interact();
assert.equal(t.railHeld, false);
step(10);
assert.equal(t.lives, 2, 'Same staircase is not penalized repeatedly');
t.place(railStair.x + t.stairWidth(railStair) + 60);
step();
assert.equal(t.railHeld, false);
// A new staircase can cause a new mistake; the last life opens results.
for (const remaining of [1, 0]) {
  t.advanceSector();
  t.hazards.forEach(h => h.reported = true);
  t.workers.forEach(w => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
  t.place(t.stairs[0].x - 17);
  t.keys.right = true;
  step();
  assert.equal(t.state, 'lesson');
  assert.equal(t.lives, remaining);
  $('#after-handrail').onclick();
  if (remaining) t.update(3);
}
assert.equal(t.state, 'lost');
t.reset();
t.start();
t.hazards.forEach(h => h.reported = true);
t.workers.forEach(w => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
t.place(t.stairs[0].x - 70);
t.interact();
assert(t.railHeld);
t.keys.right = true;
step(20);
assert.equal(t.lives, 3, 'Gripping before entry prevents the penalty');
assert.equal(t.state, 'playing');
t.interact();
step();
assert.equal(t.lives, 2, 'Releasing while climbing is also unsafe');
t.reset();
assert.equal(t.railHeld, false);
console.log('PASS: shared interaction, safe grip, missed/released handrail penalty, no duplicate penalty, new sectors and final-life results.');

// Every report opens choices, including already reported objects and later sectors.
for (const type of ['hazard', 'act']) {
  t.reset(); t.start(); t.advanceSector();
  const original = type === 'act' ? t.workers[0] : t.hazards[0];
  for (let repeat = 0; repeat < 2; repeat++) {
    t.inspectHazard(original);
    assert.equal(t.state, 'inspection');
    $('.hazard-options').children[original.answer].onclick();
    assert.equal(t.state, 'playing');
    assert.equal(type === 'act' ? t.totalActs : t.totalReports, 1);
  }
  t.advanceSector();
  const next = (type === 'act' ? t.workers : t.hazards).find(h => h.id === original.id);
  t.inspectHazard(next);
  assert.equal(t.state, 'inspection');
  $('.hazard-options').children[next.answer].onclick();
  assert.equal(type === 'act' ? t.totalActs : t.totalReports, 2);
}
// Mixed clusters grow and only the nearest target pallet can add inventory.
t.reset(); t.start();
let expectedStella = 0, expectedFish = 0;
for (let level = 1; level <= 12; level++) {
  const targets = t.pallets.filter(p => ['STELLA','FLYING FISH'].includes(p.brand));
  assert.equal(targets.length, level === 1 ? 2 : level >= 3 ? level * 2 : level);
  assert.equal(t.pallets.length, level === 1 ? 2 : targets.length * 2);
  expectedStella += targets.filter(p => p.brand === 'STELLA').length;
  expectedFish += targets.filter(p => p.brand === 'FLYING FISH').length;
  for (const pallet of t.pallets) {
    assert(t.crossings.every(c => pallet.x + 114 < c.x - t.stopWidth() || pallet.x > c.x + c.w));
    assert(t.stairs.every(st => pallet.x + 114 < st.x || pallet.x > st.x + t.stairWidth(st)));
  }
  t.hazards.forEach(h => h.reported = true);
  t.workers.forEach(w => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
  for (const pallet of t.pallets) {
    const before = t.totalPallets + t.totalFish;
    t.place(pallet.x + 37);
    t.interact();
    const target = targets.includes(pallet);
    assert.equal(t.totalPallets + t.totalFish, before + Number(target));
    t.interact();
    assert.equal(t.totalPallets + t.totalFish, before + Number(target));
  }
  assert.equal(t.totalPallets, expectedStella);
  assert.equal(t.totalFish, expectedFish);
  assert.match(t.inventorySummary(), /No hay diferencia de inventario/);
  if (level < 12) t.advanceSector();
}
console.log('PASS: repeatable report choices without duplicate credit, reset, 12 sectors of mixed inventory, distractors, nearest selection, safe placement and actual cumulative totals.');

// Incorrect inventory subtracts points on each attempt and survives sector changes.
t.reset(); t.start(); t.advanceSector();
t.hazards.forEach(h => h.reported = true);
t.workers.forEach(w => { w.reported = true; if (w.id === 'running' || w.id.startsWith('forklift')) w.departed = true; });
const incorrect = t.pallets.find(p => p.brand === 'CORONA');
t.place(incorrect.x + 37);
t.interact();
assert.equal(t.scoreSummary().penalty, 50);
assert.equal(t.scoreSummary().total, -50);
assert.equal(t.totalPallets + t.totalFish, 0);
assert.equal(t.lives, 3);
assert.match($('#toast').textContent, /−50 puntos/);
t.interact();
assert.equal(t.scoreSummary().penalty, 100);
const correct = t.pallets.find(p => p.brand === 'STELLA');
t.place(correct.x + 37);
t.interact();
assert.equal(t.scoreSummary().total, 0);
t.advanceSector();
assert.equal(t.scoreSummary().penalty, 100);
t.finish();
assert.match($('#modal').innerHTML, /Tarimas incorrectas: 2 · −100 pts/);
t.reset();
assert.equal(t.scoreSummary().penalty, 0);
assert.equal(t.scoreSummary().total, 0);
console.log('PASS: wrong inventory penalties, repeat attempts, correct inventory, sector persistence, results and reset.');

// Detection difficulty grows cumulatively through sector four, without speed increases.
t.reset(); t.start();
const progression = [
  { hazards: [], acts: ['noVest','noHelmet','phoneWalking','running'] },
  { hazards: ['leak','leaning'], acts: ['noVest','noHelmet','phoneWalking','running'] },
  { hazards: ['leak','leaning','wrap'], acts: ['noVest','noHelmet','phoneWalking','running','noHandrail'] },
  { hazards: ['leak','leaning','wrap','extinguisher','glass'], acts: ['noVest','noHelmet','phoneWalking','running','noHandrail','nearForklift','forkliftNoStop'] },
];
for (let level = 1; level <= 8; level++) {
  const base = progression[Math.min(level, 4) - 1];
  const expected = { hazards: [...base.hazards, ...(level >= 6 ? ['slippery','spill'] : [])], acts: [...base.acts, ...(level >= 5 ? ['forkliftSpeed'] : []), ...(level >= 7 ? ['stairChecklist'] : []), ...(level >= 3 ? ['standingPallet'] : [])] };
  assert.deepEqual(Array.from(t.hazards, h => h.id).sort(), [...expected.hazards].sort());
  assert.deepEqual(Array.from(t.workers, w => w.id).sort(), [...expected.acts].sort());
  assert.equal(t.runSpeed(), 300 + (level - 1) * 20);
  assert(t.hazards.every(h => Number.isFinite(h.x)));
  assert(t.workers.every(w => Number.isFinite(w.x)));
  t.render();
  if (level < 8) t.advanceSector();
}
t.reset();
assert.equal(t.hazards.length, 0);
assert.equal(t.workers.length, 4);
console.log('PASS: cumulative scenarios through sector 8, 300-unit player speed and reset.');

// Passing forklifts travel forward once and can be reported anywhere on screen.
for (const id of ['forkliftNoStop', 'forkliftSpeed', 'running']) {
  for (const shouldReport of [false, true]) {
    t.reset(); t.start();
    while (t.sector < 5) t.advanceSector();
    t.hazards.forEach(h => h.reported = true);
    t.workers.forEach(w => { if (w.id !== id) { w.reported = true; if (w.id.startsWith('forklift') || w.id === 'running') w.departed = true; } });
    const truck = t.workers.find(w => w.id === id);
    t.place(truck.min - 190);
    t.render();
    t.updateWorkers(1 / 60);
    assert(truck.passing);
    assert(t.passingVisible(truck));
    assert(truck.x < t.player.x, 'Truck enters from behind the player');
    const before = truck.x;
    t.interact();
    assert.equal(t.state, 'inspection', 'Visible truck is reportable beyond proximity radius');
    step(20);
    assert.equal(truck.x, before, 'Question pauses passing animation');
    if (shouldReport) $('.hazard-options').children[truck.answer].onclick();
    else {
      $('.hazard-options').children[(truck.answer + 1) % 3].onclick();
      assert(!truck.reported);
      $('#back').onclick();
    }
    let lastX = truck.x;
    for (let frame = 0; frame < 1000 && !truck.departed; frame++) {
      t.updateWorkers(1 / 60);
      assert(truck.x > lastX, 'Forward passage never reverses');
      lastX = truck.x;
    }
    assert(truck.departed);
    assert(!t.passingVisible(truck));
    assert.equal(t.lives, shouldReport ? 3 : 1);
    assert.equal(t.totalActs, shouldReport ? 1 : 0);
    if (!shouldReport) {
      assert.equal(t.state, 'lesson');
      assert($('#modal').innerHTML.includes(truck.explanation));
      $('#continue-miss').onclick();
    }
    const departedX = truck.x;
    t.updateWorkers(5);
    assert.equal(truck.x, departedX);
    assert.equal(t.lives, shouldReport ? 3 : 1, 'No repeated penalty after departure');
  }
}
console.log('PASS: one-way visible forklift reports, paused inspection, missed passage penalty and no repeat penalties.');

// Passing vehicles have dedicated stretches beyond ordinary risks and inventory.
t.reset(); t.start();
while (t.sector < 5) t.advanceSector();
for (const truck of t.workers.filter(w => w.id.startsWith('forklift'))) {
  assert(truck.min >= 9000);
  assert(t.hazards.every(h => h.x + 800 < truck.min));
  assert(t.workers.filter(w => !w.id.startsWith('forklift')).every(w => w.max + 800 < truck.min));
  assert(t.pallets.every(p => p.x + 114 + 800 < truck.min));
  assert(t.crossings.every(c => c.x + c.w + 800 < truck.min));
  assert(t.stairs.every(s => s.x + t.stairWidth(s) + 800 < truck.min));
}
t.finish();
assert.match($('#modal').innerHTML, /Apto para entrar al almacén/);
t.reset(); t.start();
for (let level = 1; level <= 4; level++) {
  t.finish();
  assert.match($('#modal').innerHTML, /No apto para entrar al almacén/);
  t.start();
  if (level < 4) t.advanceSector();
}
t.advanceSector(); t.finish();
assert.match($('#modal').innerHTML, /Apto para entrar al almacén/);
t.reset(); t.finish();
assert.match($('#modal').innerHTML, /No apto para entrar al almacén/);
console.log('PASS: isolated forklift stretches and qualification only after completing sector four.');

// The level-seven stair checklist requires all safe criteria and rejects unsafe ones.
t.reset(); t.start();
while (t.sector < 6) t.advanceSector();
assert(!t.workers.some(w => w.id === 'stairChecklist'));
t.advanceSector();
const checklistActor = t.workers.find(w => w.id === 'stairChecklist');
assert(checklistActor && checklistActor.onStairs);
assert.equal(checklistActor.feet, t.floorAt(checklistActor.x));
t.place(checklistActor.x - 16, checklistActor.feet - 66);
t.interact(); // Take the handrail before reporting the act.
t.interact();
assert.equal(t.state, 'inspection');
assert.equal($('.checklist-options').children.length, 6);
$('#check-stairs').onclick();
assert(!checklistActor.reported);
assert.equal(t.lives, 2);
const inputs = $('.checklist-options').children.map(label => label.children[0]);
inputs.forEach(input => { input.checked = true; input.onchange(); });
$('#check-stairs').onclick();
assert(!checklistActor.reported, 'Selecting every option must not pass');
assert.equal(t.lives, 1);
assert.match($('#modal').innerHTML, /casco, chaleco de alta visibilidad y botas de seguridad/);
inputs.forEach((input, i) => { input.checked = checklistActor.checklist[i].correct; input.onchange(); });
$('#check-stairs').onclick();
assert(checklistActor.reported);
assert.equal(t.totalActs, 1);
assert.equal(t.state, 'playing');
t.inspectHazard(checklistActor);
$('.checklist-options').children.forEach((label, i) => { const input = label.children[0]; input.checked = checklistActor.checklist[i].correct; input.onchange(); });
$('#check-stairs').onclick();
assert.equal(t.totalActs, 1);
t.advanceSector();
assert(t.workers.some(w => w.id === 'stairChecklist' && !w.reported));
console.log('PASS: level-seven checklist, unsafe selection rejection, correction, real interaction, repeat reporting and later sectors.');

// The final checklist mistake shows the explanation before ending the game.
const finalChecklist = t.workers.find(w => w.id === 'stairChecklist');
t.inspectHazard(finalChecklist);
$('#check-stairs').onclick();
assert.equal(t.lives, 0);
assert.equal(t.state, 'lesson');
assert(!finalChecklist.reported);
assert.equal($('#back').disabled, true);
assert.match($('.feedback').textContent, /−1 vida/);
$('#check-stairs').onclick();
assert.equal(t.state, 'lost');
assert.equal(t.lives, 0);
console.log('PASS: checklist life penalties, required EPP and final-life explanation/results.');

// A person standing directly on a bare pallet appears from sector three and is reportable from the floor.
t.reset(); t.start(); t.advanceSector();
assert(!t.workers.some(w => w.id === 'standingPallet'));
t.advanceSector();
const palletWorker = t.workers.find(w => w.id === 'standingPallet');
assert(palletWorker);
assert.equal(palletWorker.feet, 446 - 12);
const palletWorkerX = palletWorker.x;
t.updateWorkers(1);
assert.equal(palletWorker.x, palletWorkerX);
assert.equal(palletWorker.feet, 434);
assert(t.noJumpZones.some(z => palletWorker.x >= z.x && palletWorker.x <= z.x + z.w));
t.place(palletWorker.x - 16);
if (t.nearbyHandrail() && !t.railHeld) t.toggleHandrail();
t.interact();
assert.equal(t.state, 'inspection');
$('.hazard-options').children[(palletWorker.answer + 1) % 3].onclick();
assert(!palletWorker.reported);
$('.hazard-options').children[palletWorker.answer].onclick();
assert(palletWorker.reported);
assert.equal(t.totalActs, 1);
t.render();
t.advanceSector();
assert(t.workers.some(w => w.id === 'standingPallet' && !w.reported));
console.log('PASS: sector-three pallet act, stationary elevated person, ground interaction and later sectors.');

// Runners have a clear dedicated stretch, separate from other observation scenes.
for (const level of [1, 3, 7]) {
  t.reset(); t.start();
  while (t.sector < level) t.advanceSector();
  const runner = t.workers.find(w => w.id === 'running');
  assert(runner.min >= 9000);
  assert(t.hazards.every(h => h.x + 800 < runner.min));
  assert(t.pallets.every(p => p.x + 114 + 800 < runner.min));
  assert(t.crossings.every(c => c.x + c.w + 800 < runner.min));
  assert(t.stairs.every(s => s.x + t.stairWidth(s) + 800 < runner.min));
  assert(t.workers.filter(w => w !== runner && !w.id.startsWith('forklift')).every(w => w.max + 800 < runner.min));
  assert(t.workers.filter(w => w.id.startsWith('forklift')).every(w => w.min > runner.max + 800));
}
console.log('PASS: isolated runner scene in early and advanced sectors.');

// Static dialogs do not redraw continuously; hidden tabs perform no drawing.
t.reset(); t.start(); t.pause();
t.frame(1000);
const pausedCalls = canvasCalls;
t.frame(1020); t.frame(1040);
assert.equal(canvasCalls, pausedCalls);
t.pause();
t.frame(1060);
assert(canvasCalls > pausedCalls);
const activeCalls = canvasCalls;
t.frame(1065);
assert.equal(canvasCalls, activeCalls, 'High-refresh frames are skipped');
document.hidden = true;
t.frame(1080);
assert.equal(canvasCalls, activeCalls);
document.hidden = false;
t.reset();
t.frame(1100);
assert(canvasCalls > activeCalls, 'Reset invalidates the static scene');
console.log('PASS: paused/hidden drawing suppression, high-refresh frame limit and reset redraw.');

// Exclusive passages also vary, without repeating their previous position.
const previousPassagePositions = new Map();
for (let layout = 0; layout < 40; layout++) {
  t.reset(); t.start();
  while (t.sector < 5) t.advanceSector();
  for (const actor of t.workers.filter(w => w.id === 'running' || w.id.startsWith('forklift'))) {
    const previous = previousPassagePositions.get(actor.id);
    // Rebuild the same sector to check the immediately preceding position.
    previousPassagePositions.set(actor.id, actor.min);
  }
  t.buildSector();
  for (const actor of t.workers.filter(w => w.id === 'running' || w.id.startsWith('forklift')))
    assert(Math.abs(actor.min - previousPassagePositions.get(actor.id)) >= 100);
}
// Any wrong observation answer costs a life; the final mistake cannot bypass results.
for (const kind of ['hazards', 'workers']) {
  t.reset(); t.start(); t.advanceSector();
  const observation = t[kind].find(item => !item.checklist);
  t.inspectHazard(observation);
  const wrong = $('.hazard-options').children[(observation.answer + 1) % 3];
  for (const remaining of [2, 1, 0]) {
    wrong.onclick();
    assert.equal(t.lives, remaining);
    assert(!observation.reported);
    assert($('.feedback').textContent.includes(observation.explanation));
  }
  assert.equal(t.state, 'lesson');
  $('.hazard-options').children[observation.answer].onclick();
  assert(!observation.reported);
  assert.equal(t.lives, 0);
  $('#back').onclick();
  assert.equal(t.state, 'lost');
}
console.log('PASS: randomized exclusive passages and wrong-answer life penalties through game over.');

// More correct and incorrect inventory is guaranteed from sector three; layout varies.
t.reset(); t.start(); t.advanceSector(); t.advanceSector();
assert.equal(t.pallets.length, 12);
assert.equal(t.pallets.filter(p => ['STELLA', 'FLYING FISH'].includes(p.brand)).length, 6);
const inventoryLayouts = new Set();
for (let attempt = 0; attempt < 20; attempt++) {
  t.buildSector();
  inventoryLayouts.add(t.pallets.map(p => p.x + ':' + p.brand).join(','));
  assert.equal(t.pallets.length, 12);
}
assert(inventoryLayouts.size > 1);
t.advanceSector();
assert.equal(t.pallets.length, 16);
console.log('PASS: guaranteed larger mixed inventory from sector three and randomized positions.');

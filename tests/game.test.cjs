'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const nodes = new Map();
function node() {
  return {children:[],dataset:{},textContent:'',disabled:false,
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},
    append(child){this.children.push(child)},querySelector(){return node()},
    set innerHTML(value){this.html=value;this.children=[];if(this===nodes.get('#modal'))for(const key of ['.equipment','.hazard-options','.feedback'])nodes.delete(key)},
    get innerHTML(){return this.html || ''}};
}
const document = {hidden:false,querySelector(key){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key)},
  querySelectorAll(key){return key==='[data-equipment]'?(nodes.get('.equipment')?.children||[]):[]},createElement:node,addEventListener(){}};
const context = new Proxy({}, {get:()=>()=>{},set:()=>true});
document.querySelector('#game').getContext=()=>context;
document.querySelector('#game').getBoundingClientRect=()=>({width:1200,height:540});
const sandbox = {document,window:{addEventListener(){}},requestAnimationFrame(){},console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../scenarios.js'),'utf8'),sandbox);
const code = fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('reset();requestAnimationFrame(frame);',`reset();globalThis.test={update,interact,reset,render,pause,hud,hazards,crossings,noJumpZones,keys,workers,stairs,stairWidth,floorAt,stopTime,stopWidth,buildSector,advanceSector,
 get sector(){return sector},get completedStairs(){return completedStairs},get totalActs(){return totalActs},get totalReports(){return totalReports},get totalPallets(){return totalPallets},
 get player(){return player},get state(){return state},get lives(){return lives},get worn(){return worn},get epp(){return epp},get incident(){return incident},get triggered(){return triggered},get found(){return found},
 start(ids=['helmet','vest','boots']){worn=new Set(ids);state='playing';hud()},
 place(x,y=380){player.x=x;player.y=y;player.vx=player.vy=0;player.ground=true;clearKeys()}};`);
vm.runInContext(code,sandbox);
const t=sandbox.test, $=s=>document.querySelector(s), step=(n=1)=>{for(let i=0;i<n;i++)t.update(1/60)};
// The actual entry button accepts wrong and empty choices, and exclusive slots stay exclusive.
$('#enter').onclick();assert.equal(t.state,'playing');assert.equal(t.epp,false);
t.reset();const buttons=$('.equipment').children;
buttons.find(b=>b.dataset.equipment==='helmet').onclick();buttons.find(b=>b.dataset.equipment==='cap').onclick();
buttons.find(b=>b.dataset.equipment==='headphones').onclick();$('#enter').onclick();
assert(t.worn.has('cap'));assert(!t.worn.has('helmet'));assert(t.worn.has('headphones'));
// Each equipment incident is outside a crossing, costs exactly one life and corrects its cause.
for(const [ids,x,id,fix] of [
 [['cap','vest','boots'],301,'head','helmet'],[['helmet','vest','boots','headphones'],651,'audio',null],
 [['helmet','vest','sandals'],1121,'feet','boots'],[['helmet','boots'],1651,'visibility','vest'],
 [['vest','boots'],301,'head','helmet'],[['helmet','vest'],1121,'feet','boots']]){
  t.reset();t.start(ids);t.place(x);step();assert.equal(t.state,'incident');assert.equal(t.incident.id,id);assert.equal(t.lives,2);
  assert(!t.crossings.some(c=>x>c.x&&x<c.x+c.w));t.render();step(65);t.render();step(65);assert.equal(t.state,'lesson');
  const lives=t.lives;step(100);assert.equal(t.lives,lives);$('#correct').onclick();assert.equal(t.state,'playing');
  if(fix)assert(t.worn.has(fix));assert(!t.worn.has('headphones'));step(120);assert.equal(t.lives,2);
}
// Three bad choices show the third explanation before the loss screen.
t.reset();t.start(['cap','sandals','headphones']);
for(const x of [301,651,1121]){t.place(x);step();step(120);assert.equal(t.state,'lesson');$('#correct').onclick();}
assert.equal(t.state,'lost');assert.equal(t.lives,0);
// Wrong answers do not report; a correct answer registers once and preserves lives.
t.reset();t.start();t.place(t.hazards[0].x);t.interact();assert.equal(t.state,'inspection');
$('.hazard-options').children[1].onclick();assert.equal(t.hazards[0].reported,false);assert.equal(t.lives,3);
$('.hazard-options').children[0].onclick();assert.equal(t.hazards[0].reported,true);$('#continue').onclick();
t.interact();assert.equal(t.state,'playing');assert.equal(t.hazards.filter(h=>h.reported).length,1);
// No exit at the former door location.
t.place(2500);t.interact();assert(t.found);t.crossings.forEach(c=>c.cleared=true);t.hud();t.place(4000);t.interact();assert.equal(t.state,'playing');
// Complete the full route, inspecting every condition through real answer handlers.
t.reset();t.start();let frames=0;
while(t.sector===1&&frames++<5000){
 const p=t.player,c=t.crossings.find(c=>!c.cleared&&p.x+32>c.x-95&&p.x+32<=c.x);
 t.keys.right=!c;step();
 const h=t.hazards.find(h=>!h.reported&&Math.abs(p.x+16-h.x)<65);
 if(h){t.interact();assert.equal(t.state,'inspection');$('.hazard-options').children[h.answer].onclick();$('#continue').onclick();}
 if(p.x>2470&&!t.found)t.interact();assert.equal(t.state,'playing');
}
assert(frames<5000);assert.equal(t.sector,2);assert.equal(t.totalReports,5);assert.equal(t.totalPallets,1);assert.equal(t.completedStairs,1);assert.equal(t.lives,3);assert.equal(t.state,'playing');assert(t.hazards.every(h=>!h.reported));assert.equal(t.stairs.length,2);assert.equal(t.crossings.length,3);t.render();
// Crossing penalties still work, even in the air.
t.reset();t.start();t.place(849,270);t.player.ground=false;step();assert.equal(t.state,'dying');assert.equal(t.lives,2);step(100);assert.equal(t.state,'playing');
// Every storage and hazard zone disallows takeoff and cannot be used as a platform.
t.reset();t.start();for(const zone of t.noJumpZones){t.crossings.forEach(c=>c.cleared=true);t.place(zone.x+5);t.keys.jump=true;step();assert.equal(t.player.y,380);}
t.reset();t.start();t.keys.jump=true;step();assert(t.player.y<380);step(60);assert.equal(t.player.y,380);
t.pause();const x=t.player.x;t.keys.right=true;step(60);assert.equal(t.player.x,x);assert.equal(t.state,'paused');
t.reset();assert(t.hazards.every(h=>!h.reported));assert.equal(t.triggered.size,0);assert.equal(t.worn.size,0);assert.equal(t.lives,3);
console.log('PASS: entry choices, six equipment cases, explanations/corrections, game over, hazard quiz/reporting, continuous mission, no exit, crossing penalties, no climbing, pause and reset.');

// Mandatory ascent and descent, plus difficulty growth across five consecutive sectors.
t.reset();t.start();let maxHeight=0;let limit=0;
while(t.sector<6&&limit++<15000){
 const p=t.player,c=t.crossings.find(c=>!c.cleared&&p.x+32>c.x-t.stopWidth()+15&&p.x+32<=c.x);
 t.keys.right=!c;step();maxHeight=Math.max(maxHeight,380-p.y);
 assert.equal(t.state,'playing','Continuous safe route must remain traversable');
}
assert(limit<15000);assert.equal(t.sector,6);assert(maxHeight>=135);assert.equal(t.completedStairs,9);assert.equal(t.lives,3);assert.equal(t.crossings.length,4);assert(t.stopTime()>1.2);assert(t.stopWidth()<115);
// Cannot jump over the staircase entrance or jump from its upper walkway.
t.reset();t.start();const stair=t.stairs[0];t.place(stair.x-17,270);t.player.ground=false;t.keys.right=true;step();assert(t.player.x+16<stair.x);
t.place(stair.x+stair.steps*stair.tread+30,t.floorAt(stair.x+stair.steps*stair.tread+46)-66);t.keys.jump=true;step();assert(t.player.ground);assert.equal(t.player.vy,0);
console.log('PASS: five endless sectors, cumulative counters, increased crossings/waiting, narrower stop areas, mandatory stairs and no staircase jump bypass.');

// Unsafe acts move, remain unmarked before reporting and are separate from conditions.
t.reset();t.start();const worker=t.workers[0];const initialX=worker.x;step(30);assert.notEqual(worker.x,initialX);
t.place(worker.x-16,worker.feet-66);t.interact();assert.equal(t.state,'inspection');
$('.hazard-options').children[(worker.answer+1)%3].onclick();assert.equal(t.totalActs,0);assert(!worker.reported);
$('.hazard-options').children[worker.answer].onclick();assert.equal(t.totalActs,1);assert.equal(t.totalReports,0);assert(worker.reported);$('#continue').onclick();
t.interact();assert.equal(t.state,'playing');assert.equal(t.totalActs,1);
const stairWorker=t.workers[1];t.place(stairWorker.x-16,stairWorker.feet-66);t.interact();assert.equal(t.state,'inspection');
const frozenX=stairWorker.x;step(90);assert.equal(stairWorker.x,frozenX);
$('.hazard-options').children[stairWorker.answer].onclick();$('#continue').onclick();assert.equal(t.totalActs,2);assert.equal(t.totalReports,0);t.render();
// Reports survive sector changes; new people are reportable and full reset clears the totals.
t.place(4960);t.keys.right=true;step(10);assert.equal(t.sector,2);assert.equal(t.totalActs,2);assert(t.workers.every(w=>!w.reported));
const climber=t.workers[1];let low=climber.feet,high=climber.feet;for(let i=0;i<600;i++){step();low=Math.min(low,climber.feet);high=Math.max(high,climber.feet);}assert(high-low>60,'Worker visibly climbs and descends');
t.reset();assert.equal(t.totalActs,0);assert(t.workers.every(w=>!w.reported));
console.log('PASS: moving unsafe actors, wrong/correct answers, separate counts, duplicate protection, inspection pause, stair movement, sector persistence and reset.');

// Every rebuild moves each scenario to a different bay, without overlap or unreachable acts.
let prior=new Map();
for(let layout=0;layout<120;layout++){
 if(layout%8===0){t.reset();t.start();}else t.advanceSector();
 const positions=new Map(t.hazards.map(h=>[h.id,h.x]));const walker=t.workers.find(w=>w.id==='noHelmet');positions.set(walker.id,(walker.min+walker.max)/2);
 for(const [id,x] of positions){
  if(prior.has(id))assert(Math.abs(x-prior.get(id))>100,'Same scenario must change bays');
  assert(x>100&&x<4920);
  for(const c of t.crossings)assert(x+70<c.x-t.stopWidth()||x-70>c.x+c.w,'Bay avoids crossings and stop zones');
  for(const stair of t.stairs)assert(x+70<stair.x||x-70>stair.x+t.stairWidth(stair),'Ground bay avoids staircase');
 }
 const points=[...positions.values()];for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert(Math.abs(points[i]-points[j])>170,'Scenes remain separated');
 const actor=t.workers.find(w=>w.id==='noHandrail');assert.equal(actor.feet,t.floorAt(actor.x));assert(actor.feet<446);assert(t.stairs.some(s=>actor.min>s.x&&actor.max<s.x+t.stairWidth(s)));
 prior=positions;
}
console.log('PASS: 120 randomized layouts, no repeated scenario bay, separated objects, clear crossings and valid stair patrols.');

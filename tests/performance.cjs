'use strict';
// Reuse the logic suite's lightweight browser harness, without running its tests.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let harness = fs.readFileSync(path.join(__dirname, 'game.test.cjs'), 'utf8')
  .split('// The actual entry button')[0]
;
if (process.argv[2]) harness = harness.replace("path.join(__dirname, '../game.js')", JSON.stringify(path.resolve(process.argv[2])));
harness += `
const samples = [];
for (const level of [1, 8, 30]) {
  t.reset(); t.start();
  while (t.sector < level) t.advanceSector();
  canvasCalls = 0;
  t.render();
  samples.push({ sector: level, canvasCalls: canvasCalls });
}
console.log(JSON.stringify(samples));
if (!baseline) {
  assert(samples.every(s => s.canvasCalls < 1500), 'Render work must stay bounded by the viewport');
}
`;
vm.runInNewContext(harness, { require, __dirname, console, baseline: Boolean(process.argv[2]) });

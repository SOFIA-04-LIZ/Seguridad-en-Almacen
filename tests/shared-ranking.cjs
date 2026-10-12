'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let harness = fs.readFileSync(path.join(__dirname, 'game.test.cjs'), 'utf8').split('// The actual entry button')[0];
harness = harness.replace("const fs = require('node:fs');", '').replace("const vm = require('node:vm');", '').replace("const path = require('node:path');", '');
harness = harness.replace('vm.runInContext(code, sandbox);', `
let entries = [{name:'First',score:100}], failSave = false, calls = 0, accepted = true;
sandbox.window.WAREHOUSE_RANKING = {
 newRun: () => 'run-' + Math.random(),
 list: async () => entries,
 submit: async () => { calls++; if (failSave) throw new Error('offline'); return {accepted,position:2}; },
};
vm.runInContext(code, sandbox);`);
vm.runInNewContext(harness + `
(async () => {
 const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
 await flush();
 assert.equal(t.readRanking()[0].name, 'First');
 t.reset(); t.start(); t.finish(); await flush();
 const submit = name => { $('#ranking-name').value=name; return $('#ranking-form').onsubmit({preventDefault(){}}); };
 failSave=true; await submit('Sofia');
 assert($('#ranking-status').textContent.includes('No se pudo confirmar'));
 failSave=false; const pending=submit('Sofia'); await submit('Duplicate'); await pending;
 assert.equal(calls,2,'Double submission must be blocked');
 assert($('#ranking-status').textContent.includes('¡Guardado!'));
 await submit('Duplicate'); assert.equal(calls,2);
 t.reset(); t.start(); t.finish(); await flush(); accepted=false;
 await submit('Another');
 assert($('#ranking-status').textContent.includes('El ranking cambió'));
 console.log('PASS: shared ranking load, failed-save retry, duplicate protection and concurrent qualification rejection.');
})().catch(error => {console.error(error);process.exitCode=1});
`, {require,fs,vm,path,__dirname,console,process});

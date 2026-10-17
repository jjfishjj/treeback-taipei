import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DISTRICTS, score } from '../public/model.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root, name),'utf8');

test('HTML assets use portable relative paths and every local asset exists', async () => {
  const html = await read('public/index.html');
  const refs = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g),m=>m[1]);
  for (const ref of refs) {
    if (/^(https?:|#)/.test(ref)) continue;
    assert.ok(ref.startsWith('./'),`Nonportable resource: ${ref}`);
    assert.ok((await stat(path.join(root,'public',ref))).isFile());
  }
  assert.match(html,/<html lang="zh-Hant">/);
  assert.match(html,/這是模擬，不是城市現況排名/);
});
test('all three downloads are nonempty and linked with portable URLs', async () => {
  const content = await read('public/content.mjs');
  for (const file of ['site-sampling-plan.md','candidate-template.csv','simulation-inputs.csv']) {
    assert.ok(content.includes(`./downloads/${file}`));
    assert.ok((await stat(path.join(root,'public/downloads',file))).size>0);
  }
});
test('blank candidate template covers the required fieldwork schema, without fake records', async () => {
  const raw = await read('public/downloads/candidate-template.csv');
  const [header,...rows] = raw.trim().split(/\r?\n/);
  const columns = header.split(',');
  assert.equal(new Set(columns).size,55);
  assert.equal(rows.length,0);
  const spec = await read('public/downloads/site-sampling-plan.md');
  const section = spec.split('## 8.')[1].split('### 示例')[0];
  for (const line of section.split('\n').filter(l=>l.startsWith('|'))) {
    const cell = line.split('|')[2] || '';
    for (const match of cell.matchAll(/`([A-Za-z][A-Za-z0-9_]+)`/g)) {
      assert.ok(columns.includes(match[1]),`Missing field: ${match[1]}`);
    }
  }
});
test('original scenario CSV reproduces all twelve hardcoded assumptions and scores', async () => {
  const raw = (await read('public/downloads/simulation-inputs.csv')).replace(/^\uFEFF/,'');
  const lines = raw.trim().split(/\r?\n/);
  const header = lines.shift().split(',');
  const rows = lines.map(line => Object.fromEntries(line.split(',').map((value,i)=>[header[i],value])));
  assert.equal(rows.length,12);
  // The simulation fixture has simple, unquoted numeric/name fields.
  for (const district of DISTRICTS) {
    const row = rows.find(r => Object.values(r).includes(district.name));
    assert.ok(row,`Missing district: ${district.name}`);
    const actual = score(district);
    assert.ok(header.includes('TES_equity'),'TES_equity column must exist');
    for (const [column, value] of [['canopy_pct_assumed',district.C],['H_heat_assumed',district.H],['P_population_assumed',district.P],['V_vulnerability_assumed',district.V]]) {
      assert.equal(Number(row[column]),value);
    }
    // Original CSV is rounded to four decimal places, not full precision.
    assert.ok(Math.abs(Number(row.TES_equity)-actual.TES)<=0.000051);
  }
});
test('route manifest declares the dashboard and both hash-based pages', async () => {
  const {routes} = JSON.parse(await read('public/manus-routes.json'));
  assert.deepEqual(routes.map(r=>r.path),['/','/#fieldwork','/#sources']);
});

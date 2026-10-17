import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WEIGHTS, DISTRICTS, GOAL, score, rank, redistribute, band, csvFor } from '../public/model.mjs';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);

test('every whole-percent weighting produces bounded, complementary scores', () => {
  for (let H = 0; H <= 100; H++) {
    for (let P = 0; P <= 100 - H; P++) {
      const w = { H, P, V: 100 - H - P };
      for (const district of DISTRICTS) {
        const result = score(district, w);
        assert.ok(result.G >= 0 && result.G <= 1);
        assert.ok(result.S >= 0 && result.S <= 1);
        assert.ok(result.TES >= 0 && result.TES <= 100);
        close(result.TES + result.PPI, 100);
      }
    }
  }
});
test('canopy at or above the assumed goal has a zero clipped gap', () => {
  for (const C of [GOAL, GOAL + 10, 100]) {
    const result = score({ C, H: .9, P: .8, V: .7 });
    close(result.G, 0); close(result.TES, 100);
  }
});
test('higher canopy cannot worsen TES when other assumptions stay fixed', () => {
  const lower = score({ C: 10, H: .8, P: .8, V: .8 });
  const higher = score({ C: 20, H: .8, P: .8, V: .8 });
  assert.ok(higher.TES > lower.TES);
});
test('more weighted heat exposure cannot reduce PPI with a nonzero canopy gap', () => {
  const lower = score({ C: 10, H: .1, P: .5, V: .5 });
  const higher = score({ C: 10, H: .9, P: .5, V: .5 });
  assert.ok(higher.PPI > lower.PPI);
});
test('fractional and out-of-range slider values are rounded and clamped', () => {
  assert.equal(redistribute(DEFAULT_WEIGHTS, 'H', 40.6).H, 41);
  assert.equal(redistribute(DEFAULT_WEIGHTS, 'H', -10).H, 0);
  assert.equal(redistribute(DEFAULT_WEIGHTS, 'H', 110).H, 100);
});
test('zero-weight fallback retains the exact total for an odd remainder', () => {
  assert.deepEqual(redistribute({H:100,P:0,V:0}, 'H', 99), {H:99,P:1,V:0});
});
test('ranks are contiguous and sorted by full-precision TES', () => {
  for (const w of [DEFAULT_WEIGHTS, {H:100,P:0,V:0}, {H:0,P:100,V:0}, {H:0,P:0,V:100}]) {
    const results = rank(w);
    assert.deepEqual(results.map(r => r.rank), Array.from({length:12}, (_,i) => i+1));
    assert.equal(new Set(results.map(r => r.name)).size, 12);
    for (let i = 1; i < results.length; i++) assert.ok(results[i-1].TES <= results[i].TES);
  }
});
test('public model data are not mutated by calculation or redistribution', () => {
  const before = JSON.stringify(DISTRICTS);
  rank({H:10,P:20,V:70}); redistribute(DEFAULT_WEIGHTS,'V',90);
  assert.equal(JSON.stringify(DISTRICTS),before);
  assert.deepEqual(DEFAULT_WEIGHTS,{H:40,P:35,V:25});
});
test('CSV preserves baseline, scenario delta, rank direction and disclosure', () => {
  const rows = csvFor({H:25,P:25,V:50}).replace(/^\uFEFF/,'').split('\r\n');
  const current = rank({H:25,P:25,V:50});
  const baseline = rank();
  assert.equal(rows.length, 13);
  for (let i = 0; i < current.length; i++) {
    const cells = rows[i+1].slice(1,-1).split('","');
    const d = current[i], b = baseline.find(r => r.name===d.name);
    assert.equal(cells.length,18);
    close(Number(cells[13]), Number(d.TES.toFixed(6)));
    close(Number(cells[15]), Number((d.TES-b.TES).toFixed(6)));
    assert.equal(Number(cells[16]),b.rank-d.rank);
    assert.match(cells[17],/非實測／非官方評分/);
  }
});
test('display bands handle boundary values without changing the score', () => {
  assert.equal(band(40),'high'); assert.equal(band(39.999),'mid');
  assert.equal(band(20),'mid'); assert.equal(band(19.999),'low');
});

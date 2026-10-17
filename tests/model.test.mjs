import test from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICTS, DEFAULT_WEIGHTS, redistribute, score, rank, csvFor } from '../public/model.mjs';

test('12 districts reproduce the previous baseline without intermediate rounding', () => {
  assert.equal(DISTRICTS.length, 12);
  const rows = rank();
  assert.equal(rows[0].name,'大同區');
  assert.equal(rows[1].name,'萬華區');
  assert.ok(Math.abs(rows[0].TES-45.75)<1e-9);
  assert.ok(Math.abs(rows[1].TES-47.85104166666666)<1e-9);
  for (const row of rows) assert.ok(Math.abs(row.PPI+row.TES-100)<1e-9);
});
test('weight adjustment preserves nonnegative integer weights totaling 100', () => {
  let w={...DEFAULT_WEIGHTS};
  for (let repeat=0;repeat<10;repeat++) {
    for (const key of ['H','P','V']) {
      for (let value=0;value<=100;value++) {
        w=redistribute(w,key,value);
        assert.equal(w.H+w.P+w.V,100);
        assert.equal(w[key],value);
        for (const weight of Object.values(w)) {
          assert.ok(Number.isInteger(weight) && weight>=0 && weight<=100);
        }
      }
    }
  }
});
test('zero remaining weights recover with an even split', () => {
  assert.deepEqual(redistribute({H:100,P:0,V:0},'H',60),{H:60,P:20,V:20});
});
test('changing weights updates exact TES and keeps all scores in range', () => {
  const newWeights={H:0,P:0,V:100};
  assert.notEqual(score(DISTRICTS[0],newWeights).TES,score(DISTRICTS[0]).TES);
  for (const d of rank(newWeights)) assert.ok(d.TES>=0 && d.TES<=100);
});
test('CSV includes 12 districts, scenario weights and disclaimer', () => {
  const result=csvFor({H:60,P:25,V:15});
  assert.equal(result.split('\r\n').length,13);
  assert.ok(result.includes('情境假設，非實測／非官方評分'));
  assert.ok(result.includes('"60","25","15"'));
});

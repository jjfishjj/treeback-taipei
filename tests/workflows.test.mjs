import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const load = async name => parse(await readFile(new URL(`../.github/workflows/${name}.yml`,import.meta.url),'utf8'));

test('CI tests pull requests without write, deployment or target-event privileges', async () => {
  const ci = await load('ci');
  assert.ok('pull_request' in ci.on);
  assert.ok(!('pull_request_target' in ci.on));
  assert.deepEqual(ci.permissions,{contents:'read'});
  const commands=ci.jobs.test.steps.map(s=>s.run||'').join('\n');
  for (const command of ['pnpm check','pnpm test','pnpm test:e2e','pnpm build','--frozen-lockfile']) {
    assert.ok(commands.includes(command),`Missing CI gate: ${command}`);
  }
});
test('Pages builds only after the same reusable CI and deploys only after artifact upload', async () => {
  const pages = await load('pages');
  assert.ok(!('pull_request' in pages.on));
  assert.deepEqual(pages.on.push.branches,['main']);
  assert.equal(pages.jobs.test.uses,'./.github/workflows/ci.yml');
  assert.equal(pages.jobs.build.needs,'test');
  assert.equal(pages.jobs.deploy.needs,'build');
  assert.equal(pages.jobs.deploy.if,"github.ref == 'refs/heads/main'");
  assert.deepEqual(pages.jobs.deploy.permissions,{pages:'write','id-token':'write'});
  assert.equal(pages.jobs.deploy.environment.name,'github-pages');
  assert.ok(pages.jobs.build.steps.some(s=>s.with?.path==='dist'));
});
test('all external Actions use immutable commit references and no checkout credentials persist', async () => {
  for (const name of ['ci','pages']) {
    const workflow=await load(name);
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps || []) {
        if (step.uses) assert.match(step.uses,/^actions\/[a-z-]+@[a-f0-9]{40}$/);
        if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with['persist-credentials'],false);
      }
    }
  }
});

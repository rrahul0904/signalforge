import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 4317;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: String(port), OPENAI_API_KEY: '', METRICS_PUBLIC: '1', RATE_LIMIT_GENERATE: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForHealth(){
  for(let i=0;i<40;i++){
    try { const r=await fetch(`${base}/api/health`); if(r.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('Server did not become healthy');
}

try {
  await waitForHealth();
  const ready = await fetch(`${base}/api/ready`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).ai, 'deterministic-fallback');

  const page = await fetch(`${base}/?demo=1`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /SignalForge/);

  const memory = { productName:'Acme', features:['Realtime analytics'], audience:['Data teams'], colors:['#123456','#101010','#EEEEEE'] };
  const gen = await fetch(`${base}/api/generate`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({memory,prompt:'Create a launch graphic',format:'square'}) });
  assert.equal(gen.status, 200);
  const { asset } = await gen.json();
  assert.equal(asset.format, 'square');

  const edit = await fetch(`${base}/api/refine`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({memory,asset,instruction:'Create a vertical version'}) });
  assert.equal(edit.status, 200);
  const edited = (await edit.json()).asset;
  assert.equal(edited.format, 'story');
  assert.equal(edited.headline, asset.headline);
  assert.equal(edited.parentId, asset.id);

  const limited = await fetch(`${base}/api/generate`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({memory,prompt:'One more',format:'square'}) });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);

  const metrics = await fetch(`${base}/api/metrics`);
  assert.equal(metrics.status, 200);
  const snapshot = await metrics.json();
  assert.ok(snapshot.requests >= 5);
  assert.ok(snapshot.rateLimited >= 1);

  const blocked = await fetch(`${base}/api/scan`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({url:`http://127.0.0.1:${port}`}) });
  assert.equal(blocked.status, 422);
  assert.match((await blocked.json()).error, /Private|private|Local/);

  console.log('Smoke certification passed: readiness, page, generation, refinement, rate limiting, metrics, and SSRF rejection.');
} finally {
  child.kill('SIGTERM');
}

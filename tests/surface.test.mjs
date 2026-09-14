import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const js = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('core product surfaces exist', () => {
  for (const id of ['view-home','view-studio','view-memory','view-intel','scanForm','chatForm','memoryEditor','competitorForm']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('client includes scan, generation, selective refine, export, memory and intel flows', () => {
  for (const token of ['/api/scan','/api/generate','/api/refine','refineAsset','exportCreative','learnFromPrompt','renderMemory','renderIntel']) {
    assert.ok(js.includes(token), `missing ${token}`);
  }
});

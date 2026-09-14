import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
const { extract, localGenerate, localRefine, isPrivateIp, selectPalette, normalizeFormat, resolveRedirectUrl } = await import('../server.mjs');

test('extract builds product memory from HTML', () => {
  const html=`<html><head><title>Acme — Fast analytics</title><meta name="description" content="Analytics for modern teams"><meta property="og:image" content="https://acme.com/og.png"><style>:root{--brand:#6D5EF8}</style></head><body><h1>Ship decisions faster</h1><h2>Realtime dashboards for every team</h2><a>Start free</a></body></html>`;
  const m=extract(html,'https://acme.com');
  assert.equal(m.productName,'Acme');
  assert.equal(m.oneLiner,'Analytics for modern teams');
  assert.ok(m.features.includes('Ship decisions faster'));
  assert.ok(m.colors.includes('#6D5EF8'));
  assert.equal(m.logoAssets[0],'https://acme.com/og.png');
});

test('local generation is complete and brand-grounded', () => {
  const asset=localGenerate({productName:'Acme',features:['Realtime analytics'],audience:['Data teams'],colors:['#123456','#101010','#EEEEEE']},'Create a launch graphic','portrait');
  assert.match(asset.headline,/Acme/);
  assert.match(asset.subheadline,/Realtime analytics/);
  assert.equal(asset.format,'portrait');
  assert.equal(asset.suggestions.length,3);
  assert.equal(asset.palette.primary,'#123456');
});

test('selective refinement preserves untouched structured fields', () => {
  const memory={productName:'Acme',colors:['#123456','#101010','#EEEEEE']};
  const original=localGenerate(memory,'Create a launch graphic','square');
  const refined=localRefine(memory,original,'Create a vertical version');
  assert.equal(refined.format,'story');
  assert.equal(refined.headline,original.headline);
  assert.equal(refined.cta,original.cta);
  assert.equal(refined.parentId,original.id);
  assert.notEqual(refined.id,original.id);
});

test('dark refinement changes palette without rewriting copy', () => {
  const memory={productName:'Acme',colors:['#123456','#101010','#EEEEEE']};
  const original=localGenerate(memory,'Create a launch graphic','square');
  const refined=localRefine(memory,original,'Use a darker visual direction');
  assert.equal(refined.headline,original.headline);
  assert.equal(refined.subheadline,original.subheadline);
  assert.equal(refined.palette.ink,'#090A0F');
});

test('palette falls back safely',()=>{
  assert.deepEqual(selectPalette({}),{primary:'#6D5EF8',ink:'#17171B',soft:'#F4F2FF'});
});

test('format allowlist falls back safely',()=>{
  assert.equal(normalizeFormat('story'),'story');
  assert.equal(normalizeFormat('evil-format'),'square');
});

test('private addresses are rejected by helper',()=>{
  assert.equal(isPrivateIp('127.0.0.1'),true);
  assert.equal(isPrivateIp('10.1.2.3'),true);
  assert.equal(isPrivateIp('192.168.1.10'),true);
  assert.equal(isPrivateIp('100.64.0.1'),true);
  assert.equal(isPrivateIp('::ffff:127.0.0.1'),true);
  assert.equal(isPrivateIp('8.8.8.8'),false);
});

test('redirect resolution keeps relative redirects explicit for revalidation',()=>{
  assert.equal(resolveRedirectUrl(new URL('https://example.com/a'),'../b').href,'https://example.com/b');
  assert.equal(resolveRedirectUrl(new URL('https://example.com/a'),'http://127.0.0.1/admin').hostname,'127.0.0.1');
});

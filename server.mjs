import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import net from 'node:net';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 1_000_000;
const MAX_HTML = 2_000_000;
const MAX_REDIRECTS = 5;
const SCAN_TIMEOUT_MS = 12_000;
const VALID_FORMATS = new Set(['square', 'portrait', 'story', 'landscape']);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function send(res, status, payload, headers = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers
  });
  res.end(body);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function stripHtml(value = '') {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(html, regex) {
  const match = html.match(regex);
  return match?.[1] ? stripHtml(match[1]).trim() : '';
}

function uniq(list) {
  return [...new Set(list.map(v => v.trim()).filter(Boolean))];
}

function extract(html, url) {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const ogImage =
    firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["'][^>]*>/i);
  const headings = uniq([...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m => stripHtml(m[1]))).slice(0, 14);
  const buttons = uniq([...html.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)].map(m => stripHtml(m[1])).filter(t => t.length > 1 && t.length < 70)).slice(0, 20);
  const colors = uniq([
    ...[...html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m => m[0].toUpperCase()),
    ...[...html.matchAll(/#[0-9a-fA-F]{3}\b/g)].map(m => m[0].toUpperCase())
  ]).filter(c => !['#FFFFFF','#FFF','#000000','#000'].includes(c)).slice(0, 8);
  const text = stripHtml(html).slice(0, 18000);
  const host = new URL(url).hostname.replace(/^www\./, '');
  const productName = title.split(/[|–—-]/)[0]?.trim() || host.split('.')[0];
  const featureCandidates = headings.filter(h => h.length >= 12 && h.length <= 110 && !/pricing|faq|frequently|login|sign up|contact/i.test(h)).slice(0, 8);
  const tone = /enterprise|security|compliance|platform/i.test(text) ? 'Confident, professional, evidence-led' :
               /creator|fun|easy|beautiful|magic/i.test(text) ? 'Friendly, energetic, creator-first' :
               'Clear, concise, product-led';
  const audience = /developer|api|sdk|code/i.test(text) ? ['Developers', 'Technical founders'] :
                   /saas|founder|startup/i.test(text) ? ['SaaS founders', 'Growth teams'] :
                   ['Product teams', 'Modern businesses'];

  return {
    id: crypto.randomUUID(),
    sourceUrl: url,
    scannedAt: new Date().toISOString(),
    productName,
    oneLiner: metaDescription || headings[0] || `${productName} helps customers get better results with less friction.`,
    positioning: headings[0] || metaDescription || `A focused solution from ${productName}.`,
    audience,
    features: featureCandidates.length ? featureCandidates : headings.slice(0, 6),
    benefits: headings.slice(1, 6),
    tone,
    vocabulary: uniq(buttons.filter(t => t.split(' ').length <= 5)).slice(0, 8),
    avoidPhrases: ['revolutionary', 'game-changing', 'unlock the power of'],
    colors: colors.length ? colors : ['#6D5EF8', '#17171B', '#F4F2FF'],
    logoAssets: ogImage ? [ogImage] : [],
    evidence: {
      title,
      metaDescription,
      headings,
      ctas: buttons,
      textSample: text.slice(0, 2800)
    },
    learnedPreferences: []
  };
}

function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::' || normalized === '0.0.0.0' || normalized === '127.0.0.1') return true;
  if (normalized.startsWith('::ffff:')) return isPrivateIp(normalized.slice(7));
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) return true;
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

async function assertSafeUrl(input) {
  const raw = input instanceof URL ? input.href : String(input || '');
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) URLs are supported');
  if (url.username || url.password) throw new Error('Credential-bearing URLs are not allowed');
  const h = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!h || ['localhost', 'metadata.google.internal'].includes(h) || h.endsWith('.local')) throw new Error('Local/private hosts are not allowed');
  const addresses = await dns.lookup(h, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error('Private network addresses are not allowed');
  return url;
}

function resolveRedirectUrl(currentUrl, location) {
  if (!location) throw new Error('Redirect response did not include a Location header');
  return new URL(location, currentUrl);
}

async function readTextLimited(response, maxBytes = MAX_HTML) {
  if (!response.body) return '';
  let total = 0;
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) throw new Error(`Website HTML exceeded ${Math.round(maxBytes / 1_000_000)} MB limit`);
    text += decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();
  return text;
}

async function fetchSafeHtml(input, signal, redirects = 0) {
  const url = await assertSafeUrl(input);
  const response = await fetch(url, {
    redirect: 'manual',
    signal,
    headers: {
      'User-Agent': 'SignalForgeBot/1.1 (+marketing product scanner)',
      'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'
    }
  });

  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) throw new Error('Website redirected too many times');
    const next = resolveRedirectUrl(url, response.headers.get('location'));
    return fetchSafeHtml(next, signal, redirects + 1);
  }

  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('text/html') && !type.toLowerCase().includes('application/xhtml+xml')) {
    throw new Error('URL did not return an HTML page');
  }
  return { html: await readTextLimited(response), finalUrl: url.href };
}

async function scanUrl(input) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const { html, finalUrl } = await fetchSafeHtml(input, controller.signal);
    return extract(html, finalUrl);
  } finally {
    clearTimeout(timer);
  }
}

function selectPalette(memory = {}) {
  const colors = Array.isArray(memory.colors) ? memory.colors : [];
  return {
    primary: colors[0] || '#6D5EF8',
    ink: colors[1] || '#17171B',
    soft: colors[2] || '#F4F2FF'
  };
}

function normalizeFormat(format) {
  return VALID_FORMATS.has(format) ? format : 'square';
}

function localGenerate(memory, prompt = '', format = 'square') {
  const name = memory.productName || 'Your product';
  const ask = String(prompt || '').trim().slice(0, 4000) || 'Create a launch graphic';
  const firstFeature = memory.features?.[0] || memory.positioning || 'A clearer way to get results';
  const audience = memory.audience?.[0] || 'modern teams';
  const palette = selectPalette(memory);
  const action = /launch/i.test(ask) ? 'Meet' : /sale|offer|discount/i.test(ask) ? 'Try' : 'Discover';
  const headline = /short|punch/i.test(ask)
    ? `${name}, without the busywork.`
    : `${action} ${name}`;
  const subheadline = `${firstFeature}. Built for ${audience.toLowerCase()}.`;
  const postCopy = `${headline}\n\n${subheadline}\n\nBuilt from your product context—not a generic template.`;
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    kind: 'social-card',
    format: normalizeFormat(format),
    headline,
    subheadline,
    cta: /launch/i.test(ask) ? 'Explore the launch' : 'Learn more',
    postCopy,
    palette,
    badge: 'PRODUCT-LED MARKETING',
    suggestions: ['Make the headline punchier', 'Use a darker visual direction', 'Create a vertical version'],
    rationale: `Uses ${name}'s positioning, first feature, audience and extracted brand palette.`
  };
}

function localRefine(memory = {}, asset = {}, instruction = '') {
  const ask = String(instruction || '').trim().slice(0, 4000);
  if (!ask) throw new Error('A refinement instruction is required.');
  const lower = ask.toLowerCase();
  const name = memory.productName || 'Your product';
  const next = {
    ...asset,
    id: crypto.randomUUID(),
    parentId: asset.id || null,
    createdAt: new Date().toISOString(),
    palette: { ...(asset.palette || selectPalette(memory)) }
  };
  const changed = [];

  if (/short|punch|tighter|concise/.test(lower)) {
    next.headline = `${name}, without the busywork.`;
    changed.push('headline');
  }
  if (/dark|night|black/.test(lower)) {
    next.palette.ink = '#090A0F';
    next.palette.soft = '#171923';
    changed.push('palette');
  }
  if (/vertical|story|9:16/.test(lower)) {
    next.format = 'story';
    changed.push('format');
  } else if (/portrait|4:5/.test(lower)) {
    next.format = 'portrait';
    changed.push('format');
  } else if (/landscape|16:9/.test(lower)) {
    next.format = 'landscape';
    changed.push('format');
  } else if (/square|1:1/.test(lower)) {
    next.format = 'square';
    changed.push('format');
  }
  if (/minimal|simpl/.test(lower)) {
    next.badge = '';
    next.subheadline = String(next.subheadline || '').split('. ').slice(0, 1).join('. ');
    changed.push('badge', 'subheadline');
  }
  if (/cta|call.to.action/.test(lower) && /start|try/.test(lower)) {
    next.cta = /start/.test(lower) ? 'Start now' : 'Try it now';
    changed.push('cta');
  }

  if (!changed.length) {
    next.subheadline = `${asset.subheadline || memory.positioning || ''} ${ask}`.trim().slice(0, 220);
    changed.push('subheadline');
  }

  next.postCopy = `${next.headline || ''}\n\n${next.subheadline || ''}\n\n${next.cta || ''}`.trim();
  next.suggestions = ['Make the headline punchier', 'Use a darker visual direction', next.format === 'story' ? 'Create a square version' : 'Create a vertical version'];
  next.rationale = `Selective edit applied to ${[...new Set(changed)].join(', ')}; unchanged creative fields were preserved.`;
  return next;
}

function parseJsonText(text) {
  return JSON.parse(String(text || '').replace(/^```json\s*|```$/g, '').trim());
}

async function callResponses(requestText) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.AI_MODEL || 'gpt-5.6';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${base}/responses`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: requestText })
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    const text = data.output_text || data.output?.flatMap?.(o => o.content || []).find?.(c => c.type === 'output_text')?.text;
    if (!text) throw new Error('AI provider returned no text output');
    return { model, parsed: parseJsonText(text) };
  } finally {
    clearTimeout(timer);
  }
}

async function llmGenerate(memory, prompt, format) {
  const result = await callResponses(`Return ONLY JSON with keys headline, subheadline, cta, postCopy, badge, suggestions (exactly 3 strings), rationale.\nProduct memory: ${JSON.stringify(memory)}\nUser request: ${String(prompt || '').slice(0, 4000)}\nFormat: ${normalizeFormat(format)}`);
  if (!result) return null;
  return {
    ...localGenerate(memory, prompt, format),
    ...result.parsed,
    format: normalizeFormat(format),
    palette: selectPalette(memory),
    provider: result.model
  };
}

async function llmRefine(memory, asset, instruction) {
  const allowed = ['headline','subheadline','cta','postCopy','badge','suggestions','rationale','format'];
  const result = await callResponses(`Return ONLY a JSON patch for an existing structured marketing asset. Only include fields that need to change. Allowed fields: ${allowed.join(', ')}. Keep all other fields untouched. suggestions must be exactly 3 strings when supplied.\nProduct memory: ${JSON.stringify(memory)}\nCurrent asset: ${JSON.stringify(asset)}\nRefinement: ${String(instruction || '').slice(0, 4000)}`);
  if (!result) return null;
  const base = localRefine(memory, asset, instruction);
  const patch = {};
  for (const key of allowed) {
    if (Object.hasOwn(result.parsed, key)) patch[key] = result.parsed[key];
  }
  return {
    ...base,
    ...patch,
    format: normalizeFormat(patch.format || base.format),
    palette: base.palette,
    provider: result.model,
    rationale: patch.rationale || `Selective AI edit applied while preserving untouched structured fields.`
  };
}

async function generate(memory, prompt, format) {
  if (process.env.OPENAI_API_KEY) {
    try { return await llmGenerate(memory, prompt, format); }
    catch (error) {
      const fallback = localGenerate(memory, prompt, format);
      fallback.providerWarning = `AI provider unavailable; deterministic fallback used (${error.message}).`;
      return fallback;
    }
  }
  return localGenerate(memory, prompt, format);
}

async function refine(memory, asset, instruction) {
  if (process.env.OPENAI_API_KEY) {
    try { return await llmRefine(memory, asset, instruction); }
    catch (error) {
      const fallback = localRefine(memory, asset, instruction);
      fallback.providerWarning = `AI provider unavailable; deterministic selective edit used (${error.message}).`;
      return fallback;
    }
  }
  return localRefine(memory, asset, instruction);
}

async function api(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { ok: true, service: 'signalforge', time: new Date().toISOString() });
  if (req.method === 'POST' && pathname === '/api/scan') {
    try {
      const { url } = await readJson(req);
      if (!url || typeof url !== 'string') return send(res, 400, { error: 'A URL is required.' });
      return send(res, 200, { memory: await scanUrl(url) });
    } catch (error) {
      return send(res, 422, { error: error.name === 'AbortError' ? 'Website scan timed out.' : error.message });
    }
  }
  if (req.method === 'POST' && pathname === '/api/generate') {
    try {
      const { memory, prompt = '', format = 'square' } = await readJson(req);
      if (!memory || typeof memory !== 'object') return send(res, 400, { error: 'Product Memory is required.' });
      return send(res, 200, { asset: await generate(memory, prompt, normalizeFormat(format)) });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }
  if (req.method === 'POST' && pathname === '/api/refine') {
    try {
      const { memory, asset, instruction = '' } = await readJson(req);
      if (!memory || typeof memory !== 'object') return send(res, 400, { error: 'Product Memory is required.' });
      if (!asset || typeof asset !== 'object') return send(res, 400, { error: 'Current asset is required.' });
      if (!instruction || typeof instruction !== 'string') return send(res, 400, { error: 'A refinement instruction is required.' });
      return send(res, 200, { asset: await refine(memory, asset, instruction) });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }
  if (pathname.startsWith('/api/') && !['GET','POST'].includes(req.method || '')) return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  return send(res, 404, { error: 'Not found' });
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!fullPath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  try {
    const data = await fs.readFile(fullPath);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(fullPath)] || 'application/octet-stream',
      'Cache-Control': path.extname(fullPath) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    res.end(data);
  } catch {
    if (!path.extname(pathname)) return serveStatic(req, res, '/index.html');
    return send(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return api(req, res, url.pathname);
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  return serveStatic(req, res, url.pathname);
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => console.log(`SignalForge running at http://localhost:${PORT}`));
}

export { extract, localGenerate, localRefine, isPrivateIp, selectPalette, normalizeFormat, resolveRedirectUrl };

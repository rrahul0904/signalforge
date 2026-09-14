import fs from 'node:fs';

function read(file){ return fs.readFileSync(file,'utf8'); }
function write(file, value){ fs.writeFileSync(file,value); }
function replaceRequired(text, from, to, label){
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Could not find ${label}`);
  return text.replace(from,to);
}
function replaceAllRequired(text, from, to, label){
  if (!text.includes(from)) {
    if (text.includes(to)) return text;
    throw new Error(`Could not find ${label}`);
  }
  return text.split(from).join(to);
}

{
  const file='server.mjs';
  let s=read(file);
  s=replaceAllRequired(s,"version: '1.2.0'","version: '1.3.0'",'server version');
  s=replaceRequired(s,'SignalForgeBot/1.1 (+marketing product scanner)','SignalForgeBot/1.3 (+marketing product scanner)','scanner user-agent');
  const audienceOld=`  const audience = /developer|api|sdk|code/i.test(text) ? ['Developers', 'Technical founders'] :\n                   /saas|founder|startup/i.test(text) ? ['SaaS founders', 'Growth teams'] :\n                   ['Product teams', 'Modern businesses'];\n\n  return {`;
  const audienceNew=`  const audience = /developer|api|sdk|code/i.test(text) ? ['Developers', 'Technical founders'] :\n                   /saas|founder|startup/i.test(text) ? ['SaaS founders', 'Growth teams'] :\n                   ['Product teams', 'Modern businesses'];\n  const audienceSignal = /developer|api|sdk|code|saas|founder|startup|team|business/i.test(text);\n  const confidence = {\n    productName: title ? 96 : 68,\n    oneLiner: metaDescription ? 94 : headings[0] ? 76 : 42,\n    positioning: headings[0] ? 92 : metaDescription ? 82 : 45,\n    audience: audienceSignal ? 72 : 48,\n    features: featureCandidates.length >= 3 ? 90 : featureCandidates.length ? 75 : headings.length ? 60 : 35,\n    tone: text.length >= 800 ? 66 : text.length >= 250 ? 58 : 45\n  };\n  confidence.overall = Math.round((confidence.productName + confidence.oneLiner + confidence.positioning + confidence.audience + confidence.features + confidence.tone) / 6);\n  const provenance = {\n    productName: title ? 'page title' : 'domain name',\n    oneLiner: metaDescription ? 'meta description' : headings[0] ? 'primary heading' : 'fallback synthesis',\n    positioning: headings[0] ? 'primary heading' : metaDescription ? 'meta description' : 'fallback synthesis',\n    audience: audienceSignal ? 'visible page language' : 'low-evidence heuristic',\n    features: featureCandidates.length ? 'visible H1-H3 headings' : headings.length ? 'visible headings' : 'insufficient visible evidence',\n    tone: text.length >= 250 ? 'visible page copy' : 'limited page copy'\n  };\n\n  return {`;
  s=replaceRequired(s,audienceOld,audienceNew,'confidence block');
  s=replaceRequired(s,'    sourceUrl: url,\n    scannedAt:',"    sourceUrl: url,\n    sourcePath: new URL(url).pathname || '/',\n    scannedAt:",'source path');
  s=replaceRequired(s,'    logoAssets: ogImage ? [ogImage] : [],\n    evidence: {','    logoAssets: ogImage ? [ogImage] : [],\n    confidence,\n    provenance,\n    evidence: {','confidence return fields');
  s=replaceRequired(s,'      ctas: buttons,\n      textSample:', '      ctas: buttons,\n      stats: { headings: headings.length, ctas: buttons.length, colors: colors.length, textCharacters: text.length },\n      textSample:', 'evidence stats');
  write(file,s);
}

{
  const file='package.json'; let s=read(file);
  s=replaceRequired(s,'"version": "1.2.0"','"version": "1.3.0"','package version');
  write(file,s);
}

{
  const file='public/app.js'; let s=read(file);
  const demoOld="return {id:crypto.randomUUID(),sourceUrl:'https://example.com',scannedAt:new Date().toISOString(),productName:'SignalForge',oneLiner:'Product-aware marketing that remembers what you built.',positioning:'Turn a product URL into persistent, evidence-backed marketing intelligence.',audience:['SaaS founders','Growth teams'],features:['Editable Product Memory','On-brand creative generation','Evidence-backed positioning','Preference learning'],benefits:['Stop repeating product context','Create faster without generic prompts'],tone:'Clear, premium, product-led',vocabulary:['Product Memory','Evidence-backed','Create'],avoidPhrases:['revolutionary','game-changing'],colors:['#7C67FF','#17171B','#F4F2FF'],logoAssets:[],evidence:{title:'SignalForge — Product-aware marketing workspace',metaDescription:'Product-aware marketing that remembers what you built.',headings:['Persistent product intelligence','Create through chat'],ctas:['Scan product','Generate']},learnedPreferences:[]};";
  const demoNew="return {id:crypto.randomUUID(),sourceUrl:'https://example.com',sourcePath:'/',scannedAt:new Date().toISOString(),productName:'SignalForge',oneLiner:'Product-aware marketing that remembers what you built.',positioning:'Turn a product URL into persistent, evidence-backed marketing intelligence.',audience:['SaaS founders','Growth teams'],features:['Editable Product Memory','On-brand creative generation','Evidence-backed positioning','Preference learning'],benefits:['Stop repeating product context','Create faster without generic prompts'],tone:'Clear, premium, product-led',vocabulary:['Product Memory','Evidence-backed','Create'],avoidPhrases:['revolutionary','game-changing'],colors:['#7C67FF','#17171B','#F4F2FF'],logoAssets:[],confidence:{overall:91,productName:96,oneLiner:94,positioning:92,audience:72,features:90,tone:66},provenance:{productName:'page title',oneLiner:'meta description',positioning:'primary heading',audience:'visible page language',features:'visible H1-H3 headings',tone:'visible page copy'},evidence:{title:'SignalForge — Product-aware marketing workspace',metaDescription:'Product-aware marketing that remembers what you built.',headings:['Persistent product intelligence','Create through chat'],ctas:['Scan product','Generate'],stats:{headings:2,ctas:2,colors:3,textCharacters:2400}},learnedPreferences:[]};";
  s=replaceRequired(s,demoOld,demoNew,'demo confidence');
  const memOld="  $('#memName').value=m.productName||''; $('#memOneLiner').value=m.oneLiner||''; $('#memPositioning').value=m.positioning||''; $('#memTone').value=m.tone||''; $('#memUrl').value=m.sourceUrl||'';\n  $('#audienceTags')";
  const memNew="  $('#memName').value=m.productName||''; $('#memOneLiner').value=m.oneLiner||''; $('#memPositioning').value=m.positioning||''; $('#memTone').value=m.tone||''; $('#memUrl').value=m.sourceUrl||'';\n  const overall=Number(m.confidence?.overall||0); const confidenceEl=$('#memoryConfidence'); confidenceEl.textContent=overall?`${overall}% confidence`:'Confidence unavailable'; confidenceEl.dataset.level=overall>=85?'high':overall>=65?'medium':'low';\n  $('#audienceTags')";
  s=replaceRequired(s,memOld,memNew,'memory confidence pill');
  const evidenceOld="  const ev=m.evidence||{}; $('#evidencePanel').innerHTML=`<div class=\"evidence-item\"><b>PAGE TITLE</b><p>${escapeHtml(ev.title||'Not found')}</p></div><div class=\"evidence-item\"><b>META DESCRIPTION</b><p>${escapeHtml(ev.metaDescription||'Not found')}</p></div><div class=\"evidence-item\"><b>VISIBLE HEADINGS</b><p>${escapeHtml((ev.headings||[]).slice(0,7).join(' · ')||'None extracted')}</p></div><div class=\"evidence-item\"><b>VISIBLE CTAS</b><p>${escapeHtml((ev.ctas||[]).slice(0,8).join(' · ')||'None extracted')}</p></div>`;";
  const evidenceNew="  const ev=m.evidence||{}, conf=m.confidence||{}, prov=m.provenance||{}, stats=ev.stats||{}; $('#evidencePanel').innerHTML=`<div class=\"evidence-item evidence-quality\"><b>SCAN QUALITY</b><p><strong>${escapeHtml(conf.overall?`${conf.overall}% overall confidence`:'Confidence unavailable')}</strong><br>${stats.headings||0} headings · ${stats.ctas||0} CTAs · ${stats.colors||0} colors · ${stats.textCharacters||0} text chars</p></div><div class=\"evidence-item\"><b>POSITIONING PROVENANCE</b><p>${escapeHtml(prov.positioning||'Unknown source')} · ${conf.positioning||0}%</p></div><div class=\"evidence-item\"><b>PAGE TITLE</b><p>${escapeHtml(ev.title||'Not found')}</p></div><div class=\"evidence-item\"><b>META DESCRIPTION</b><p>${escapeHtml(ev.metaDescription||'Not found')}</p></div><div class=\"evidence-item\"><b>VISIBLE HEADINGS</b><p>${escapeHtml((ev.headings||[]).slice(0,7).join(' · ')||'None extracted')}</p></div><div class=\"evidence-item\"><b>VISIBLE CTAS</b><p>${escapeHtml((ev.ctas||[]).slice(0,8).join(' · ')||'None extracted')}</p></div>`;";
  s=replaceRequired(s,evidenceOld,evidenceNew,'evidence quality');
  s=replaceRequired(s,"<b>EVIDENCE QUALITY</b><p>${obj?.evidence?.headings?.length||0} visible headings · ${obj?.evidence?.ctas?.length||0} CTAs captured</p>","<b>EVIDENCE QUALITY</b><p>${obj?.confidence?.overall||0}% confidence · ${obj?.evidence?.headings?.length||0} visible headings · ${obj?.evidence?.ctas?.length||0} CTAs captured</p>",'competitor confidence');
  write(file,s);
}

{
  const file='public/index.html'; let s=read(file);
  const old='<div class="page-head"><div><div class="section-kicker">SOURCE OF TRUTH</div><h2>Product Memory</h2><p>Every generation starts here. Edit anything. Every change is versioned locally.</p></div><div class="head-actions"><span id="memorySaved" class="saved-state">✓ Saved</span><button id="saveMemory" class="btn btn-primary">Save changes</button></div></div>';
  const neu='<div class="page-head"><div><div class="section-kicker">SOURCE OF TRUTH</div><h2>Product Memory</h2><p>Every generation starts here. Edit anything. Every change is versioned locally.</p></div><div class="head-actions"><span id="memoryConfidence" class="confidence-pill" data-level="medium">Confidence unavailable</span><span id="memorySaved" class="saved-state">✓ Saved</span><button id="saveMemory" class="btn btn-primary">Save changes</button></div></div>';
  s=replaceRequired(s,old,neu,'memory confidence markup');
  write(file,s);
}

{
  const file='public/styles.css'; let s=read(file);
  const css='.confidence-pill{font-size:9px;font-weight:750;letter-spacing:.04em;padding:6px 8px;border-radius:999px;border:1px solid #3a3744;background:#15141a;color:#aaa6b4}.confidence-pill[data-level=high]{color:#8fd7ad;border-color:#28513b;background:#0f1d16}.confidence-pill[data-level=medium]{color:#d6bc7b;border-color:#5a4826;background:#211b10}.confidence-pill[data-level=low]{color:#e29a93;border-color:#5a302d;background:#211312}.evidence-quality strong{color:#d8d3e6;font-size:11px}';
  if(!s.includes(css)) s=s.replace(/\s*$/,'\n'+css+'\n');
  write(file,s);
}

{
  const file='tests/core.test.mjs'; let s=read(file);
  const anchor="  assert.equal(m.logoAssets[0],'https://acme.com/og.png');";
  const addition=`${anchor}\n  assert.ok(m.confidence.overall >= 65);\n  assert.ok(m.confidence.overall <= 95);\n  assert.equal(m.provenance.oneLiner,'meta description');\n  assert.equal(m.evidence.stats.headings,2);`;
  s=replaceRequired(s,anchor,addition,'confidence assertions');
  s=replaceRequired(s,"assert.equal(snapshot.version,'1.2.0');","assert.equal(snapshot.version,'1.3.0');",'snapshot version');
  write(file,s);
}

{
  const file='README.md'; let s=read(file);
  const anchor='- Persistent editable Product Memory in the browser with revision history UI and one-click restore.';
  const addition=`${anchor}\n- Evidence-derived confidence scores and provenance for positioning, audience, features and source quality—no decorative hard-coded confidence in the actual workspace.`;
  s=replaceRequired(s,anchor,addition,'README confidence bullet');
  write(file,s);
}
{
  const file='docs/PRODUCTION.md'; let s=read(file);
  s=replaceRequired(s,'- User-editable evidence-backed Product Memory.','- User-editable evidence-backed Product Memory with deterministic confidence/provenance metadata.','production confidence docs');
  write(file,s);
}

console.log('SignalForge v1.3 confidence/provenance upgrade applied.');

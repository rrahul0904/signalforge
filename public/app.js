const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const store = {
  get(key, fallback=null){ try { const v=localStorage.getItem(`sf:${key}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, value){ localStorage.setItem(`sf:${key}`, JSON.stringify(value)); },
  del(key){ localStorage.removeItem(`sf:${key}`); }
};

let state = {
  memory: store.get('memory'),
  revisions: store.get('revisions', []),
  assets: store.get('assets', []),
  usage: store.get('usage', {date:'', count:0}),
  plan: store.get('plan', 'free'),
  competitor: store.get('competitor'),
  currentAsset: null
};
state.currentAsset = state.assets[0] || null;
state.savedMemory = state.memory ? structuredClone(state.memory) : null;

function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200); }
function today(){ return new Date().toISOString().slice(0,10); }
function syncUsage(){ if(state.usage.date!==today()) state.usage={date:today(),count:0}; store.set('usage',state.usage); const max=state.plan==='pro'?150:20; $('#usagePill').textContent=`${state.usage.count} / ${max} today`; $('#upgradeBtn').textContent=state.plan==='pro'?'Pro plan':'Free plan'; }
function consumeUse(){ syncUsage(); const max=state.plan==='pro'?150:20; if(state.usage.count>=max){ toast('Daily generation limit reached.'); return false; } state.usage.count++; store.set('usage',state.usage); syncUsage(); return true; }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function showView(name){ $$('.view').forEach(v=>v.classList.remove('active')); $(`#view-${name}`)?.classList.add('active'); $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name)); if(name==='memory') renderMemory(); if(name==='studio') renderStudio(); if(name==='intel') renderIntel(); history.replaceState(null,'',`#${name}`); }
$$('[data-view]').forEach(el=>el.addEventListener('click',e=>{ e.preventDefault(); showView(el.dataset.view); }));

async function api(path, body){ const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error||`Request failed (${r.status})`); return data; }

function seedDemoMemory(){
  return {id:crypto.randomUUID(),sourceUrl:'https://example.com',sourcePath:'/',scannedAt:new Date().toISOString(),productName:'SignalForge',oneLiner:'Product-aware marketing that remembers what you built.',positioning:'Turn a product URL into persistent, evidence-backed marketing intelligence.',audience:['SaaS founders','Growth teams'],features:['Editable Product Memory','On-brand creative generation','Evidence-backed positioning','Preference learning'],benefits:['Stop repeating product context','Create faster without generic prompts'],tone:'Clear, premium, product-led',vocabulary:['Product Memory','Evidence-backed','Create'],avoidPhrases:['revolutionary','game-changing'],colors:['#7C67FF','#17171B','#F4F2FF'],logoAssets:[],confidence:{overall:91,productName:96,oneLiner:94,positioning:92,audience:72,features:90,tone:66},provenance:{productName:'page title',oneLiner:'meta description',positioning:'primary heading',audience:'visible page language',features:'visible H1-H3 headings',tone:'visible page copy'},evidence:{title:'SignalForge — Product-aware marketing workspace',metaDescription:'Product-aware marketing that remembers what you built.',headings:['Persistent product intelligence','Create through chat'],ctas:['Scan product','Generate'],stats:{headings:2,ctas:2,colors:3,textCharacters:2400}},learnedPreferences:[]};
}

async function scanProduct(url, button){
  if(!url.trim()) return toast('Enter a product URL.');
  if(button){ button.disabled=true; button.classList.add('loading'); }
  try{
    const {memory}=await api('/api/scan',{url});
    if(state.memory) addRevision('Before website rescan',state.memory);
    const learned=state.memory?.learnedPreferences||[];
    if(learned.length) memory.learnedPreferences=structuredClone(learned);
    state.memory=memory; state.savedMemory=structuredClone(memory); store.set('memory',memory);
    toast(`Product Memory built for ${memory.productName}.`); renderAll(); showView('memory');
  }catch(err){
    toast(err.message);
  }finally{ if(button){button.disabled=false;button.classList.remove('loading');} }
}

$('#scanForm').addEventListener('submit',e=>{e.preventDefault();scanProduct($('#scanUrl').value,$('#scanForm button'));});
$('#newProductBtn')?.addEventListener('click',()=>showView('home'));
$('#rescanBtn')?.addEventListener('click',()=>{ if(state.memory?.sourceUrl) scanProduct(state.memory.sourceUrl,$('#rescanBtn')); else showView('home'); });

function addRevision(reason,memory=state.memory){ if(!memory) return; state.revisions.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),reason,memory:structuredClone(memory)}); state.revisions=state.revisions.slice(0,20); store.set('revisions',state.revisions); }

function renderMemory(){
  const m=state.memory; $('#noMemory').classList.toggle('hidden',!!m); $('#memoryEditor').classList.toggle('hidden',!m); if(!m)return;
  $('#memName').value=m.productName||''; $('#memOneLiner').value=m.oneLiner||''; $('#memPositioning').value=m.positioning||''; $('#memTone').value=m.tone||''; $('#memUrl').value=m.sourceUrl||'';
  const overall=Number(m.confidence?.overall||0); const confidenceEl=$('#memoryConfidence'); confidenceEl.textContent=overall?`${overall}% confidence`:'Confidence unavailable'; confidenceEl.dataset.level=overall>=85?'high':overall>=65?'medium':'low';
  $('#audienceTags').innerHTML=(m.audience||[]).map((a,i)=>`<span class="tag">${escapeHtml(a)}<button data-remove-audience="${i}">×</button></span>`).join('');
  $('#featureList').innerHTML=(m.features||[]).map((f,i)=>`<div class="list-row"><span>${String(i+1).padStart(2,'0')}</span><span>${escapeHtml(f)}</span><button data-remove-feature="${i}">×</button></div>`).join('');
  $('#colorEditor').innerHTML=(m.colors||[]).map((c,i)=>`<div class="color-token"><input type="color" data-color="${i}" value="${/^#[0-9A-F]{6}$/i.test(c)?c:'#7C67FF'}"><small>${escapeHtml(c)}</small></div>`).join('');
  $('#preferenceList').innerHTML=(m.learnedPreferences||[]).length?(m.learnedPreferences||[]).map((p,i)=>`<div class="preference-row"><span>${escapeHtml(typeof p==='string'?p:p.rule)}</span><button data-remove-preference="${i}">×</button></div>`).join(''):'<p class="muted tiny">No learned preferences yet. Add one manually or use a refinement in Studio.</p>';
  const ev=m.evidence||{}, conf=m.confidence||{}, prov=m.provenance||{}, stats=ev.stats||{}; $('#evidencePanel').innerHTML=`<div class="evidence-item evidence-quality"><b>SCAN QUALITY</b><p><strong>${escapeHtml(conf.overall?`${conf.overall}% overall confidence`:'Confidence unavailable')}</strong><br>${stats.headings||0} headings · ${stats.ctas||0} CTAs · ${stats.colors||0} colors · ${stats.textCharacters||0} text chars</p></div><div class="evidence-item"><b>POSITIONING PROVENANCE</b><p>${escapeHtml(prov.positioning||'Unknown source')} · ${conf.positioning||0}%</p></div><div class="evidence-item"><b>PAGE TITLE</b><p>${escapeHtml(ev.title||'Not found')}</p></div><div class="evidence-item"><b>META DESCRIPTION</b><p>${escapeHtml(ev.metaDescription||'Not found')}</p></div><div class="evidence-item"><b>VISIBLE HEADINGS</b><p>${escapeHtml((ev.headings||[]).slice(0,7).join(' · ')||'None extracted')}</p></div><div class="evidence-item"><b>VISIBLE CTAS</b><p>${escapeHtml((ev.ctas||[]).slice(0,8).join(' · ')||'None extracted')}</p></div>`;
  $('#revisionHistory').innerHTML=state.revisions.length?state.revisions.slice(0,6).map((r,i)=>`<div class="revision-row"><div><b>${escapeHtml(r.reason)}</b><small>${new Date(r.at).toLocaleString()}</small></div><button data-restore-revision="${i}" class="btn btn-ghost btn-sm">Restore</button></div>`).join(''):'<p class="muted tiny">No prior saved versions yet.</p>';
  bindMemoryDynamic();
}
function bindMemoryDynamic(){
  $$('[data-remove-audience]').forEach(b=>b.onclick=()=>{state.memory.audience.splice(+b.dataset.removeAudience,1);renderMemory();markUnsaved();});
  $$('[data-remove-feature]').forEach(b=>b.onclick=()=>{state.memory.features.splice(+b.dataset.removeFeature,1);renderMemory();markUnsaved();});
  $$('[data-remove-preference]').forEach(b=>b.onclick=()=>{state.memory.learnedPreferences.splice(+b.dataset.removePreference,1);renderMemory();markUnsaved();});
  $$('[data-color]').forEach(i=>i.oninput=()=>{state.memory.colors[+i.dataset.color]=i.value.toUpperCase();renderMemory();markUnsaved();});
  $$('[data-restore-revision]').forEach(b=>b.onclick=()=>{const revision=state.revisions[+b.dataset.restoreRevision];if(!revision)return;addRevision('Before revision restore',state.memory);state.memory=structuredClone(revision.memory);state.savedMemory=structuredClone(state.memory);store.set('memory',state.memory);renderMemory();renderStudio();toast('Product Memory version restored.');});
}
function markUnsaved(){ $('#memorySaved').textContent='Unsaved changes'; $('#memorySaved').style.color='#c99572'; }
['memName','memOneLiner','memPositioning','memTone'].forEach(id=>$('#'+id).addEventListener('input',markUnsaved));
$$('[data-add]').forEach(btn=>btn.addEventListener('click',()=>{ if(!state.memory)return; const type=btn.dataset.add; const input=type==='audience'?$('#newAudience'):type==='feature'?$('#newFeature'):$('#newPreference'); const val=input.value.trim(); if(!val)return; if(type==='audience')state.memory.audience.push(val); if(type==='feature')state.memory.features.push(val); if(type==='preference')state.memory.learnedPreferences.push({rule:val,source:'manual',createdAt:new Date().toISOString()}); input.value='';markUnsaved();renderMemory(); }));
$('#saveMemory').addEventListener('click',()=>{ if(!state.memory)return; if(state.savedMemory)addRevision('Before manual edit',state.savedMemory); Object.assign(state.memory,{productName:$('#memName').value.trim(),oneLiner:$('#memOneLiner').value.trim(),positioning:$('#memPositioning').value.trim(),tone:$('#memTone').value.trim()}); store.set('memory',state.memory);state.savedMemory=structuredClone(state.memory);$('#memorySaved').textContent='✓ Saved';$('#memorySaved').style.color='';toast('Product Memory saved.');renderMemory();renderStudio(); });

function renderStudio(){
  $('#agentContext').textContent=state.memory?`Grounded in ${state.memory.productName}`:'Waiting for Product Memory';
  if(!state.memory){ $('#chatInput').placeholder='Scan a product first…'; }
  $('#recentList').innerHTML=state.assets.length?state.assets.slice(0,5).map(a=>`<button class="recent-chip" data-asset-id="${escapeHtml(a.id)}">${escapeHtml(a.headline)}</button>`).join(''):'<p class="muted tiny">No generations yet.</p>';
  $$('[data-asset-id]').forEach(b=>b.onclick=()=>{const asset=state.assets.find(a=>a.id===b.dataset.assetId);if(asset){state.currentAsset=asset;paintAsset(asset);renderSuggestions(asset.suggestions||[]);}});
  if(state.currentAsset) paintAsset(state.currentAsset);
}
function addChat(role,text){ const node=document.createElement('div'); node.className=role==='user'?'user-message':'agent-message'; node.innerHTML=role==='user'?`<div>${escapeHtml(text)}</div>`:`<span class="agent-icon">✦</span><div><p>${escapeHtml(text)}</p></div>`; $('#chatFeed').appendChild(node); $('#chatFeed').scrollTop=$('#chatFeed').scrollHeight; }
function learnFromPrompt(prompt){ if(!state.memory)return; const lower=prompt.toLowerCase(); let rule=''; if(/dark/.test(lower))rule='Prefer dark visual directions'; else if(/short|punch/.test(lower))rule='Prefer shorter, punchier headlines'; else if(/minimal/.test(lower))rule='Prefer minimal visual composition'; if(rule && !(state.memory.learnedPreferences||[]).some(p=>(typeof p==='string'?p:p.rule)===rule)){state.memory.learnedPreferences.push({rule,source:'chat_feedback',createdAt:new Date().toISOString()});store.set('memory',state.memory);} }
async function generate(prompt){
  if(!state.memory){toast('Scan a product first.');showView('home');return;}
  if(!consumeUse())return;
  addChat('user',prompt); learnFromPrompt(prompt); $('#chatInput').value='';
  const send=$('.send-btn'); send.disabled=true; send.classList.add('loading');
  try{
    const {asset}=await api('/api/generate',{memory:state.memory,prompt,format:$('#formatSelect').value});
    state.currentAsset=asset; state.assets.unshift(asset); state.assets=state.assets.slice(0,30); store.set('assets',state.assets); paintAsset(asset); addChat('agent',`Created “${asset.headline}”. I kept it grounded in your Product Memory. Use a suggestion below or tell me exactly what to change.`); renderSuggestions(asset.suggestions||[]); renderStudio();
    if(asset.providerWarning)toast('AI provider fallback used; app remained functional.');
  }catch(err){ toast(err.message); addChat('agent',`Generation failed: ${err.message}`); }
  finally{send.disabled=false;send.classList.remove('loading');}
}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const p=$('#chatInput').value.trim();if(p)generate(p);});
$('#clearChat').addEventListener('click',()=>{$('#chatFeed').innerHTML='<div class="agent-message welcome-msg"><span class="agent-icon">✦</span><div><b>Fresh thread.</b><p>Your Product Memory is still intact.</p></div></div>';$('#suggestions').innerHTML='';});
async function refineAsset(instruction){
  if(!state.memory || !state.currentAsset) return generate(instruction);
  if(!consumeUse()) return;
  addChat('user',instruction); learnFromPrompt(instruction);
  const buttons=$$('.suggestion'); buttons.forEach(b=>b.disabled=true);
  try{
    const {asset}=await api('/api/refine',{memory:state.memory,asset:state.currentAsset,instruction});
    state.currentAsset=asset; state.assets.unshift(asset); state.assets=state.assets.slice(0,30); store.set('assets',state.assets);
    paintAsset(asset); addChat('agent',`Applied a selective edit to “${asset.headline}”. Untouched fields stayed intact.`); renderSuggestions(asset.suggestions||[]); renderStudio();
    if(asset.providerWarning) toast('AI provider fallback used; selective edit remained functional.');
  }catch(err){ toast(err.message); addChat('agent',`Refinement failed: ${err.message}`); }
  finally{ buttons.forEach(b=>b.disabled=false); }
}
function renderSuggestions(items){ $('#suggestions').innerHTML=items.map(s=>`<button class="suggestion">${escapeHtml(s)}</button>`).join(''); $$('.suggestion').forEach(b=>b.onclick=()=>refineAsset(b.textContent)); }
function paintAsset(asset){ $('#emptyCanvas').classList.add('hidden'); const c=$('#creative'); c.classList.remove('hidden','square','portrait','story','landscape');c.classList.add(asset.format||'square'); c.style.setProperty('--asset-primary',asset.palette?.primary||'#7c67ff');c.style.setProperty('--asset-ink',asset.palette?.ink||'#17171b');$('#creativeBadge').textContent=asset.badge||'PRODUCT UPDATE';$('#creativeBrand').textContent=state.memory?.productName||'SignalForge';$('#creativeHeadline').textContent=asset.headline;$('#creativeSub').textContent=asset.subheadline;$('#creativeCta').textContent=`${asset.cta} ↗`;$('#assetStatus').textContent=`${(asset.format||'square').toUpperCase()} • ready`;$('#rationale').classList.remove('hidden');$('#rationale p').textContent=asset.rationale||''; }
$('#copyBtn').addEventListener('click',async()=>{if(!state.currentAsset)return toast('Generate an asset first.');await navigator.clipboard.writeText(state.currentAsset.postCopy||'');toast('Marketing copy copied.');});
$('#exportBtn').addEventListener('click',()=>{if(!state.currentAsset)return toast('Generate an asset first.');exportCreative();});
function exportCreative(){ const a=state.currentAsset,m=state.memory; const size=a.format==='story'?[1080,1920]:a.format==='portrait'?[1080,1350]:a.format==='landscape'?[1600,900]:[1080,1080]; const [w,h]=size; const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const x=canvas.getContext('2d');const p=a.palette||{};x.fillStyle=p.ink||'#17171B';x.fillRect(0,0,w,h);const g=x.createRadialGradient(w*.84,h*.12,20,w*.84,h*.12,w*.65);g.addColorStop(0,p.primary||'#7C67FF');g.addColorStop(1,'rgba(0,0,0,0)');x.globalAlpha=.5;x.fillStyle=g;x.fillRect(0,0,w,h);x.globalAlpha=1;x.fillStyle='rgba(255,255,255,.72)';x.font=`700 ${Math.round(w*.022)}px system-ui`;x.fillText((a.badge||'PRODUCT UPDATE').toUpperCase(),w*.08,h*.11);x.textAlign='right';x.fillText(m?.productName||'SignalForge',w*.92,h*.11);x.textAlign='left';x.fillStyle='white';x.font=`750 ${Math.round(w*.078)}px system-ui`;wrapText(x,a.headline,w*.08,h*.45,w*.78,Math.round(w*.09));x.fillStyle='rgba(255,255,255,.66)';x.font=`400 ${Math.round(w*.027)}px system-ui`;wrapText(x,a.subheadline,w*.08,h*.69,w*.7,Math.round(w*.04));x.fillStyle=p.primary||'#7C67FF';x.fillRect(w*.08,h*.79,w*.22,h*.07);x.fillStyle='white';x.font=`700 ${Math.round(w*.021)}px system-ui`;x.fillText(a.cta,w*.105,h*.835);const link=document.createElement('a');link.download=`${(m?.productName||'signalforge').toLowerCase().replace(/\W+/g,'-')}-creative.png`;link.href=canvas.toDataURL('image/png');link.click();toast('PNG exported.'); }
function wrapText(ctx,text,x,y,maxWidth,lineHeight){const words=text.split(' ');let line='';for(let n=0;n<words.length;n++){const test=line+words[n]+' ';if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line,x,y);line=words[n]+' ';y+=lineHeight;}else line=test;}ctx.fillText(line,x,y);}

$('#competitorForm').addEventListener('submit',async e=>{e.preventDefault();const url=$('#competitorUrl').value.trim();if(!url)return toast('Enter a competitor URL.');const btn=$('#competitorForm button');btn.disabled=true;btn.classList.add('loading');try{const {memory}=await api('/api/scan',{url});state.competitor=memory;store.set('competitor',memory);renderIntel();toast(`Scanned ${memory.productName}.`);}catch(err){toast(err.message);}finally{btn.disabled=false;btn.classList.remove('loading');}});
function renderIntel(){const c=state.competitor,m=state.memory;$('#intelEmpty').classList.toggle('hidden',!!c);$('#intelGrid').classList.toggle('hidden',!c);if(!c)return;const column=(obj,label)=>`<section class="card intel-column"><div class="intel-name"><h3>${escapeHtml(obj?.productName||'Your product')}</h3><span>${label}</span></div><div class="intel-section"><b>POSITIONING</b><p>${escapeHtml(obj?.positioning||'Not available')}</p></div><div class="intel-section"><b>AUDIENCE</b><p>${escapeHtml((obj?.audience||[]).join(' · '))}</p></div><div class="intel-section"><b>VISIBLE THEMES</b><ul>${(obj?.features||[]).slice(0,6).map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul></div><div class="intel-section"><b>EVIDENCE QUALITY</b><p>${obj?.confidence?.overall||0}% confidence · ${obj?.evidence?.headings?.length||0} visible headings · ${obj?.evidence?.ctas?.length||0} CTAs captured</p></div></section>`;$('#intelGrid').innerHTML=column(m,'YOUR PRODUCT')+column(c,'COMPETITOR');}

$('#upgradeBtn').addEventListener('click',()=>$('#upgradeModal').classList.remove('hidden'));
$('.modal-close').addEventListener('click',()=>$('#upgradeModal').classList.add('hidden'));
$('#upgradeModal').addEventListener('click',e=>{if(e.target.id==='upgradeModal')e.currentTarget.classList.add('hidden');});
$('#demoUpgrade').addEventListener('click',()=>{state.plan='pro';store.set('plan','pro');syncUsage();$('#upgradeModal').classList.add('hidden');toast('Pro demo activated locally.');});
$('#profileBtn').addEventListener('click',()=>toast('Local demo profile. Add auth provider in production.'));

function renderAll(){syncUsage();renderMemory();renderStudio();renderIntel();}
if(!state.memory && location.search.includes('demo=1')){state.memory=seedDemoMemory();store.set('memory',state.memory);}
renderAll();
const initial=location.hash.replace('#',''); if(['studio','memory','intel'].includes(initial))showView(initial);

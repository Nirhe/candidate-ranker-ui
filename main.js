// --- Keyword groups & default weights ---
const GROUPS = [
  { key:"dotnet", label:".NET stack (.NET, C#, ASP.NET)", patterns:[".net","c#","asp.net","aspnet","entity framework","ef core"], weight:8 },
  { key:"java", label:"Java stack (Java, Spring)", patterns:[" java ","spring","spring boot"], weight:2 },
  { key:"micro", label:"Microservices", patterns:["microservice","micro-services","micro services"], weight:3 },
  { key:"db", label:"Databases (SQL/NoSQL)", patterns:[" sql ","database","postgres","mysql","mssql","nosql","mongodb","cosmos","dynamodb"], weight:2 },
  { key:"fe", label:"Front-end (React/Angular/Vue)", patterns:["react","angular","vue"], weight:2 },
  { key:"devops", label:"CI/CD & Tools (Bitbucket/Jenkins/Pipelines)", patterns:["bitbucket","jenkins","pipeline","ci/cd","cicd","github actions","azure devops"], weight:2 },
  { key:"cloud", label:"Cloud & Messaging (AWS/Azure/RabbitMQ/Couchbase)", patterns:["aws","azure","gcp","cloud","rabbitmq","couchbase","sqs","sns","kafka"], weight:2 },
  { key:"support", label:"Support & Debugging", patterns:["support","tier-3","tier3","debug","troubleshoot","incident"], weight:2 },
  { key:"edu", label:"Education (Bachelor/CS)", patterns:["bachelor","b.sc","bsc","computer science","b.tech","btech"], weight:2 },
];

const el = id => document.getElementById(id);
const fileEl = el('file');
const rankBtn = el('rankBtn');
const previewBtn = el('previewBtn');
const exportBtn = el('exportBtn');
const statusEl = el('status');
const tableWrap = el('tableWrap');
const resultCount = el('resultCount');

const colName = el('colName');
const colLinkedIn = el('colLinkedIn');
const colATS = el('colATS');
const colScan = el('colScan');

let rows = [];         // raw records
let headers = [];      // csv headers
let ranked = [];       // ranked rows with score & reason

// Build weights UI
const weightsWrap = el('weights');
function renderWeightSliders(){
  weightsWrap.innerHTML = '';
  GROUPS.forEach(g=>{
    const id = 'w_'+g.key;
    const block = document.createElement('div');
    block.className = 'slider card section';
    block.innerHTML = `
        <div style="font-weight:600">${g.label}</div>
        <input type="range" id="${id}" min="0" max="12" step="1" value="${g.weight}">
        <div class="small">Weight: <span class="badge" id="${id}_v">${g.weight}</span></div>
      `;
    weightsWrap.appendChild(block);
    const slider = block.querySelector('#'+id);
    const out = block.querySelector('#'+id+'_v');
    slider.addEventListener('input',()=>{ out.textContent = slider.value; g.weight = Number(slider.value); });
  });
}
renderWeightSliders();

// Presets
el('presetNet').addEventListener('click',()=>{
  GROUPS.find(g=>g.key==='dotnet').weight = 10;
  GROUPS.find(g=>g.key==='java').weight = 2;
  GROUPS.find(g=>g.key==='micro').weight = 3;
  GROUPS.find(g=>g.key==='db').weight = 3;
  GROUPS.find(g=>g.key==='fe').weight = 2;
  GROUPS.find(g=>g.key==='devops').weight = 2;
  GROUPS.find(g=>g.key==='cloud').weight = 3;
  GROUPS.find(g=>g.key==='support').weight = 3;
  GROUPS.find(g=>g.key==='edu').weight = 2;
  renderWeightSliders();
});
el('presetBalanced').addEventListener('click',()=>{
  GROUPS.forEach(g=> g.weight = {dotnet:8, java:3, micro:3, db:2, fe:2, devops:2, cloud:2, support:2, edu:2}[g.key] || 2);
  renderWeightSliders();
});

function guessMapping() {
  const opts = headers.map(h=>`<option>${h}</option>`).join('');
  [colName, colLinkedIn, colATS, colScan].forEach(sel=> sel.innerHTML = opts);

  function selectIfContains(selectEl, substrings){
    substrings = substrings.map(s=>s.toLowerCase());
    const idx = headers.findIndex(h=> substrings.some(s=> h.toLowerCase().includes(s)));
    if(idx>=0) selectEl.selectedIndex = idx;
  }

  selectIfContains(colName,["name"]);
  selectIfContains(colLinkedIn,["linkedin"]);
  selectIfContains(colATS,["candidate url","ats","comeet","url"]);

  // Multi select defaults for scanning
  const scanLikely = ["skills","current position","past position","education","degree","languages"];
  Array.from(colScan.options).forEach(opt=>{
    if (scanLikely.some(s=> opt.value.toLowerCase().includes(s))) opt.selected = true;
  });
}

fileEl.addEventListener('change', (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  statusEl.textContent = 'Parsing…';
  Papa.parse(f, {
    header:true,
    skipEmptyLines:true,
    complete: (res)=>{
      rows = res.data;
      headers = res.meta.fields || Object.keys(rows[0]||{});
      guessMapping();
      tableWrap.style.display='none';
      exportBtn.disabled = true;
      statusEl.textContent = `Loaded ${rows.length} rows · ${headers.length} columns`;
    },
    error: (err)=>{
      statusEl.textContent = 'Parse error: '+err;
    }
  })
});

function getSelectedScanColumns(){
  return Array.from(colScan.selectedOptions).map(o=>o.value);
}

function makeTextBlob(r){
  const scanCols = getSelectedScanColumns();
  const parts = scanCols.map(c=> String(r[c]||''));
  return (' '+parts.join(' ')+' ').toLowerCase(); // padded for exact-ish word checks
}

function scoreRow(r){
  const text = makeTextBlob(r);
  let score = 0; const hits=[];
  GROUPS.forEach(g=>{
    const matched = g.patterns.some(p=> text.includes(p));
    if(matched){ score += g.weight; hits.push(g.label); }
  });
  return { score, reason: hits.join(' · ') };
}

function rank(topOnly=false){
  if(!rows.length){ statusEl.textContent = 'Please upload a CSV first.'; return; }
  const nameCol = colName.value; const liCol = colLinkedIn.value; const atsCol = colATS.value;

  ranked = rows.map(r=>{
    const {score, reason} = scoreRow(r);
    return { ...r, __score:score, __reason:reason, __name:r[nameCol]||'', __li:r[liCol]||'', __ats:r[atsCol]||'' };
  }).sort((a,b)=> b.__score - a.__score);

  const topN = Math.max(1, Number(el('topN').value||30));
  const view = topOnly ? ranked.slice(0,10) : ranked.slice(0, topN);
  renderTable(view);

  resultCount.textContent = `${view.length} shown (Top ${topOnly?10:topN}) of ${rows.length}`;
  tableWrap.style.display='block';
  exportBtn.disabled = false;
}

function renderTable(view){
  const tbl = el('tbl');
  const cols = ["__score","__name","__li","__ats","__reason"]; // always show these
  // plus add a couple of helpful columns if they exist
  const extras = ["Skills","Current position","Past position","Education level","Degree"].filter(h=> headers.includes(h));
  const all = [...cols, ...extras];

  const labels = {
    "__score":"Score", "__name":"Name", "__li":"LinkedIn", "__ats":"Candidate URL", "__reason":"Why (matched keywords)"
  };

  // header
  tbl.querySelector('thead').innerHTML = `<tr>${all.map(h=>`<th>${labels[h]||h}</th>`).join('')}</tr>`;

  // body
  tbl.querySelector('tbody').innerHTML = view.map(r=>{
    return `<tr>
        ${all.map(h=>{
          let val = r[h] ?? '';
          if(h==='__score') val = `<span class="score">${val}</span>`;
          if(h==='__li' && val) val = `<a href="${val}" target="_blank">LinkedIn</a>`;
          if(h==='__ats' && val) val = `<a href="${val}" target="_blank">Open in ATS</a>`;
          if(h==='__reason') val = `<span class="small">${val}</span>`;
          return `<td>${val}</td>`
        }).join('')}
      </tr>`
  }).join('');
}

function exportCSV(){
  if(!ranked.length) return;
  const topN = Math.max(1, Number(el('topN').value||30));
  const out = ranked.slice(0, topN).map(r=>({
    Score:r.__score,
    Name:r.__name,
    LinkedIn:r.__li,
    CandidateURL:r.__ats,
    Why:r.__reason,
    Skills:r['Skills']||'',
    CurrentPosition:r['Current position']||'',
    PastPosition:r['Past position']||'',
    EducationLevel:r['Education level']||'',
    Degree:r['Degree']||''
  }));
  const csv = Papa.unparse(out);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `ranked_candidates_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

rankBtn.addEventListener('click', ()=> rank(false));
previewBtn.addEventListener('click', ()=> rank(true));
exportBtn.addEventListener('click', exportCSV);

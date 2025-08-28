const {DEFAULT_GROUPS, groups, loadGroups, saveGroups, scoreRow} = window.app;

function App(){
  const [headers, setHeaders] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [ranked, setRanked] = React.useState([]);
  const [topN, setTopN] = React.useState(30);
  const [status, setStatus] = React.useState('');
  const [filter, setFilter] = React.useState('');
  const [mapping, setMapping] = React.useState({name:'', li:'', ats:'', scan:[]});
  const [groupState, setGroupState] = React.useState([]);

  React.useEffect(()=>{
    loadGroups();
    if(!groups.length){
      groups.push(...DEFAULT_GROUPS);
      saveGroups();
    }
    setGroupState(groups.map(g=>({...g})));
  }, []);

  function updateGroup(idx, field, value){
    const newGroups = groupState.slice();
    if(field === 'patterns'){
      newGroups[idx][field] = value;
      groups[idx][field] = value.split(',').map(p=>p.trim().toLowerCase()).filter(Boolean);
    }else if(field === 'weight'){
      newGroups[idx][field] = Number(value);
      groups[idx][field] = Number(value);
    }else{
      newGroups[idx][field] = value;
      groups[idx][field] = value;
    }
    setGroupState(newGroups);
    saveGroups();
  }

  function removeGroup(idx){
    const ng = groupState.filter((_,i)=>i!==idx);
    setGroupState(ng);
    groups.splice(idx,1);
    saveGroups();
  }

  function addGroup(){
    const g={label:'',patterns:[],weight:0};
    setGroupState([...groupState,g]);
    groups.push(g);
    saveGroups();
  }

  function presetNet(){
    ['dotnet','java','micro','db','fe','devops','cloud','support','edu'].forEach(k=>{
      const weight = {dotnet:10,java:2,micro:3,db:3,fe:2,devops:2,cloud:3,support:3,edu:2}[k];
      const idx = groups.findIndex(g=>g.key===k);
      if(idx>-1){ groups[idx].weight = weight; }
    });
    setGroupState(groups.map(g=>({...g})));
    saveGroups();
  }

  function presetBalanced(){
    groups.forEach(g=> g.weight = {dotnet:8, java:3, micro:3, db:2, fe:2, devops:2, cloud:2, support:2, edu:2}[g.key] || 2);
    setGroupState(groups.map(g=>({...g})));
    saveGroups();
  }

  function handleFile(e){
    const file = e.target.files[0];
    if(!file) return;
    Papa.parse(file, {
      header:true,
      skipEmptyLines:true,
      complete:(res)=>{
        setRows(res.data);
        setHeaders(res.meta.fields || []);
        setStatus(`Loaded ${res.data.length} rows · ${res.meta.fields.length} columns`);
        setMapping(m=>({ ...m }));
      },
      error:(err)=> setStatus('Parse error: '+err)
    });
  }

  function makeTextBlob(r){
    const parts = mapping.scan.map(c=> String(r[c]||''));
    return (' '+parts.join(' ')+' ').toLowerCase();
  }

  function rank(topOnly=false){
    if(!rows.length){ setStatus('Please upload a CSV first.'); return; }
    const rankedRows = rows.map(r=>{
      const {score, reason} = scoreRow(null, makeTextBlob(r));
      return { ...r, __score:score, __reason:reason, __name:r[mapping.name]||'', __li:r[mapping.li]||'', __ats:r[mapping.ats]||'' };
    }).sort((a,b)=> b.__score - a.__score);
    const top = topOnly ? rankedRows.slice(0,10) : rankedRows.slice(0, Math.max(1, topN));
    setRanked(top);
  }

  function exportCSV(){
    if(!ranked.length) return;
    const out = ranked.map(r=>({
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

  const filtered = ranked.filter(r=>{
    if(!filter) return true;
    const q = filter.toLowerCase();
    const name = String(r.__name||'').toLowerCase();
    const text = makeTextBlob(r);
    return name.includes(q) || text.includes(q);
  });

  return (
    <div className="wrap">
      <h1>Candidate Ranker <span className="badge">React</span></h1>
      <div className="sub">Upload a candidate CSV, set weights, and export a ranked Top N. Runs 100% in your browser.</div>

      <div className="card">
        <div className="section row">
          <div>
            <label>Upload CSV</label>
            <input type="file" accept=".csv" onChange={handleFile} />
            <div className="small" style={{marginTop:8}}>Detected columns will appear below so you can map them.</div>
          </div>
          <div>
            <label>Top N to keep</label>
            <input type="number" min="1" value={topN} onChange={e=>setTopN(Number(e.target.value))} />
            <div className="small">Default is 30</div>
          </div>
        </div>

        <div className="section">
          <div className="grid">
            <div>
              <label>Column: <b>Name</b></label>
              <select value={mapping.name} onChange={e=>setMapping({...mapping, name:e.target.value})}>
                <option value=""></option>
                {headers.map(h=> <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label>Column: <b>LinkedIn URL</b></label>
              <select value={mapping.li} onChange={e=>setMapping({...mapping, li:e.target.value})}>
                <option value=""></option>
                {headers.map(h=> <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label>Column: <b>ATS Candidate URL</b></label>
              <select value={mapping.ats} onChange={e=>setMapping({...mapping, ats:e.target.value})}>
                <option value=""></option>
                {headers.map(h=> <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label>Column(s) scanned for keywords</label>
              <select multiple size="6" value={mapping.scan} onChange={e=>{
                const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
                setMapping({...mapping, scan: opts});
              }}>
                {headers.map(h=> <option key={h}>{h}</option>)}
              </select>
              <div className="small">Tip: include Skills, Current position, Past position, Education level, Degree.</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:10}}>
            <span className="pill">Preset: <button className="btn alt" onClick={presetNet}>Favor .NET</button> <button className="btn alt" onClick={presetBalanced}>Balanced</button></span>
            <span className="small">Adjust sliders to change scoring weights.</span>
          </div>
          <div className="weights">
            {groupState.map((g,i)=> (
              <div className="group-card card section" key={i}>
                <input type="text" className="grp-label" placeholder="Label" value={g.label} onChange={e=>updateGroup(i,'label',e.target.value)} />
                <input type="text" className="grp-patterns" placeholder="pattern1, pattern2" value={g.patterns.join(', ')} onChange={e=>updateGroup(i,'patterns',e.target.value)} />
                <input type="range" className="grp-weight" min="0" max="12" step="1" value={g.weight} onChange={e=>updateGroup(i,'weight',e.target.value)} />
                <div className="small">Weight: <span className="badge">{g.weight}</span></div>
                <button className="btn warn" onClick={()=>removeGroup(i)}>Remove</button>
              </div>
            ))}
          </div>
          <button className="btn alt" style={{marginTop:10}} onClick={addGroup}>Add Group</button>
        </div>

        <div className="section" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          <button className="btn" onClick={()=>rank(false)}>Rank Candidates</button>
          <button className="btn alt" onClick={()=>rank(true)}>Preview 10</button>
          <button className="btn warn" onClick={exportCSV} disabled={!ranked.length}>Export Ranked CSV</button>
          <span className="small">{status}</span>
        </div>

        {ranked.length > 0 && (
          <div className="section" style={{display:'block'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <div className="pill"><span>Results</span> <span>{filtered.length} shown (Top {ranked.length}) of {rows.length}</span></div>
              <div className="small">Sorted by <b>Score</b> desc.</div>
            </div>
            <input type="text" value={filter} placeholder="Filter results" onChange={e=>setFilter(e.target.value)} style={{marginBottom:10, width:'100%'}} />
            <div style={{overflow:'auto', maxHeight:'60vh'}}>
              <table id="tbl">
                <thead>
                  <tr>
                    <th>Score</th><th>Name</th><th>LinkedIn</th><th>Candidate URL</th><th>Why (matched keywords)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r,idx)=> (
                    <tr key={idx}>
                      <td><span className="score">{r.__score}</span></td>
                      <td>{r.__name}</td>
                      <td>{r.__li && <a href={r.__li} target="_blank">LinkedIn</a>}</td>
                      <td>{r.__ats && <a href={r.__ats} target="_blank">Open in ATS</a>}</td>
                      <td><span className="small">{r.__reason}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

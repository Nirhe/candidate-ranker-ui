const { useState, useEffect } = React;

function GroupCard({ group, index, onChange, onRemove }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = value;
    if (name === 'patterns') {
      updated = value.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
    }
    if (name === 'weight') {
      updated = Number(value);
    }
    onChange(index, { ...group, [name]: updated });
  };

  return (
    <div className="group-card card section">
      <input type="text" name="label" placeholder="Label" value={group.label} onChange={handleChange} />
      <input type="text" name="patterns" placeholder="pattern1, pattern2" value={group.patterns.join(', ')} onChange={handleChange} />
      <input type="range" name="weight" min="0" max="12" step="1" value={group.weight} onChange={handleChange} />
      <div className="small">Weight: <span className="badge">{group.weight}</span></div>
      <button className="btn warn remove" onClick={() => onRemove(index)}>Remove</button>
    </div>
  );
}

function App() {
  const [groups, setGroups] = useState(window.main.groups);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [ranked, setRanked] = useState([]);
  const [status, setStatus] = useState('');
  const [topN, setTopN] = useState(30);
  const [colName, setColName] = useState('');
  const [colLinkedIn, setColLinkedIn] = useState('');
  const [colATS, setColATS] = useState('');
  const [colScan, setColScan] = useState([]);

  useEffect(() => {
    window.main.groups = groups;
    window.main.saveGroups();
  }, [groups]);

  const updateGroup = (i, g) => setGroups(gs => gs.map((grp, idx) => idx === i ? g : grp));
  const removeGroup = (i) => setGroups(gs => gs.filter((_, idx) => idx !== i));
  const addGroup = () => setGroups(gs => [...gs, { label: '', patterns: [], weight: 0 }]);

  const handleFile = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setStatus('Parsing…');
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        setRows(res.data);
        const hdr = res.meta.fields || Object.keys(res.data[0] || {});
        setHeaders(hdr);
        guessMapping(hdr);
        setStatus(`Loaded ${res.data.length} rows · ${hdr.length} columns`);
      },
      error: err => setStatus('Parse error: ' + err)
    });
  };

  const guessMapping = hdr => {
    const find = subs => hdr.find(h => subs.some(s => h.toLowerCase().includes(s))) || hdr[0] || '';
    setColName(find(['name']));
    setColLinkedIn(find(['linkedin']));
    setColATS(find(['candidate url', 'ats', 'comeet', 'url']));
    const scanLikely = ["skills", "current position", "past position", "education", "degree", "languages"];
    setColScan(hdr.filter(h => scanLikely.some(s => h.toLowerCase().includes(s))));
  };

  const makeTextBlob = r => {
    const parts = colScan.map(c => String(r[c] || ''));
    return (' ' + parts.join(' ') + ' ').toLowerCase();
  };

  const rank = topOnly => {
    if (!rows.length) { setStatus('Please upload a CSV first.'); return; }
    const rankedRows = rows.map(r => {
      const { score, reason } = window.main.scoreRow(null, makeTextBlob(r));
      return { ...r, __score: score, __reason: reason, __name: r[colName] || '', __li: r[colLinkedIn] || '', __ats: r[colATS] || '' };
    }).sort((a, b) => b.__score - a.__score);
    const out = topOnly ? rankedRows.slice(0, 10) : rankedRows.slice(0, Math.max(1, Number(topN)));
    setRanked(out);
    setStatus(`${out.length} shown (Top ${topOnly ? 10 : topN}) of ${rows.length}`);
  };

  const exportCSV = () => {
    if (!ranked.length) return;
    const out = ranked.map(r => ({
      Score: r.__score,
      Name: r.__name,
      LinkedIn: r.__li,
      CandidateURL: r.__ats,
      Why: r.__reason
    }));
    const csv = Papa.unparse(out);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ranked_candidates_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const presetNet = () => {
    const weights = { dotnet: 10, java: 2, micro: 3, db: 3, fe: 2, devops: 2, cloud: 3, support: 3, edu: 2 };
    setGroups(gs => gs.map(g => ({ ...g, weight: weights[g.key] ?? g.weight })));
  };

  const presetBalanced = () => {
    const weights = { dotnet: 8, java: 3, micro: 3, db: 2, fe: 2, devops: 2, cloud: 2, support: 2, edu: 2 };
    setGroups(gs => gs.map(g => ({ ...g, weight: weights[g.key] ?? g.weight })));
  };

  return (
    <div className="wrap">
      <h1>Candidate Ranker <span className="badge">HR Friendly</span></h1>
      <div className="sub">Upload a candidate CSV, set weights, and export a ranked Top N. Runs 100% in your browser (no server).</div>
      <div className="card">
        <div className="section row">
          <div>
            <label>Upload CSV (export from Comeet / ATS)</label>
            <input type="file" accept=".csv" onChange={handleFile} />
            <div className="small" style={{ marginTop: '8px' }}>Detected columns will appear below so you can map them.</div>
          </div>
          <div>
            <label>Top N to keep</label>
            <input type="number" min="1" value={topN} onChange={e => setTopN(e.target.value)} />
            <div className="small">Default is 30</div>
          </div>
        </div>

        <div className="section">
          <div className="grid">
            <div>
              <label>Column: <b>Name</b></label>
              <select value={colName} onChange={e => setColName(e.target.value)}>{headers.map(h => <option key={h}>{h}</option>)}</select>
            </div>
            <div>
              <label>Column: <b>LinkedIn URL</b></label>
              <select value={colLinkedIn} onChange={e => setColLinkedIn(e.target.value)}>{headers.map(h => <option key={h}>{h}</option>)}</select>
            </div>
            <div>
              <label>Column: <b>ATS Candidate URL</b></label>
              <select value={colATS} onChange={e => setColATS(e.target.value)}>{headers.map(h => <option key={h}>{h}</option>)}</select>
            </div>
            <div>
              <label>Column(s) scanned for keywords (hold <span className="kbd">Ctrl</span> to select multiple)</label>
              <select multiple size="6" value={colScan} onChange={e => setColScan(Array.from(e.target.selectedOptions).map(o => o.value))}>
                {headers.map(h => <option key={h}>{h}</option>)}
              </select>
              <div className="small">Tip: include <i>Skills</i>, <i>Current position</i>, <i>Past position</i>, <i>Education level</i>, <i>Degree</i>.</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span className="pill">Preset: <button className="btn alt" onClick={presetNet}>Favor .NET</button> <button className="btn alt" onClick={presetBalanced}>Balanced</button></span>
            <span className="small">Adjust sliders to change scoring weights. Total score is the sum of matched keyword groups.</span>
          </div>
          <div className="weights">
            {groups.map((g, i) => <GroupCard key={i} group={g} index={i} onChange={updateGroup} onRemove={removeGroup} />)}
          </div>
          <button className="btn alt" id="addGroup" style={{ marginTop: '10px' }} onClick={addGroup}>Add Group</button>
        </div>

        <div className="section" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => rank(false)}>Rank Candidates</button>
          <button className="btn alt" onClick={() => rank(true)}>Preview 10</button>
          <button className="btn warn" onClick={exportCSV} disabled={!ranked.length}>Export Ranked CSV</button>
          <span className="small">{status}</span>
        </div>

        {ranked.length > 0 && (
          <div className="section" id="tableWrap" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className="pill"><span>Results</span> <span id="resultCount">{ranked.length} shown</span></div>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
              <table id="tbl">
                <thead><tr><th>Score</th><th>Name</th><th>LinkedIn</th><th>Candidate URL</th><th>Why (matched keywords)</th></tr></thead>
                <tbody>
                  {ranked.map((r, i) => (
                    <tr key={i}>
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
      <p className="small muted" style={{ marginTop: '14px' }}>CSV never leaves your machine. Scoring is keyword-based and explainable. Edit weights to match your criteria.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);


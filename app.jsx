const { useState, useEffect, useMemo } = React;

function GroupCard({ group, onChange, onRemove }) {
  const update = (updates) => onChange({ ...group, ...updates });
  return (
    <div className="group-card card section">
      <input
        type="text"
        className="grp-label"
        placeholder="Label"
        value={group.label}
        onChange={(e) => update({ label: e.target.value })}
      />
      <input
        type="text"
        className="grp-patterns"
        placeholder="pattern1, pattern2"
        value={group.patterns.join(', ')}
        onChange={(e) =>
          update({
            patterns: e.target.value
              .split(',')
              .map((p) => p.trim().toLowerCase())
              .filter(Boolean),
          })
        }
      />
      <input
        type="range"
        className="grp-weight"
        min="0"
        max="12"
        step="1"
        value={group.weight}
        onChange={(e) => update({ weight: Number(e.target.value) })}
      />
      <div className="small">
        Weight: <span className="badge">{group.weight}</span>
      </div>
      <button className="btn warn remove" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function App() {
  const [groups, setGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('groups')) || window.DEFAULT_GROUPS;
    } catch {
      return window.DEFAULT_GROUPS;
    }
  });

  useEffect(() => {
    localStorage.setItem('groups', JSON.stringify(groups));
  }, [groups]);

  const addGroup = () =>
    setGroups([...groups, { label: '', patterns: [], weight: 0 }]);

  const updateGroup = (idx, g) =>
    setGroups((arr) => arr.map((grp, i) => (i === idx ? g : grp)));

  const removeGroup = (idx) =>
    setGroups((arr) => arr.filter((_, i) => i !== idx));

  const presetNet = () => {
    const weights = { dotnet: 10, java: 2, micro: 3, db: 3, fe: 2, devops: 2, cloud: 3, support: 3, edu: 2 };
    setGroups((gs) => gs.map((g) => ({ ...g, weight: weights[g.key] ?? g.weight })));
  };

  const presetBalanced = () => {
    const weights = { dotnet: 8, java: 3, micro: 3, db: 2, fe: 2, devops: 2, cloud: 2, support: 2, edu: 2 };
    setGroups((gs) => gs.map((g) => ({ ...g, weight: weights[g.key] ?? g.weight })));
  };

  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [ranked, setRanked] = useState([]);
  const [view, setView] = useState([]);
  const [status, setStatus] = useState('');
  const [topN, setTopN] = useState(30);
  const [mapping, setMapping] = useState({ name: '', linkedin: '', ats: '', scan: [] });
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!headers.length) return;
    const guess = (subs) => headers.find((h) => subs.some((s) => h.toLowerCase().includes(s))) || '';
    setMapping((m) => ({
      ...m,
      name: guess(['name']),
      linkedin: guess(['linkedin']),
      ats: guess(['candidate url', 'ats', 'comeet', 'url']),
      scan: headers.filter((h) =>
        ['skills', 'current position', 'past position', 'education', 'degree', 'languages'].some((s) =>
          h.toLowerCase().includes(s)
        )
      ),
    }));
  }, [headers]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setStatus('Parsing…');
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data);
        const cols = res.meta.fields || Object.keys(res.data[0] || {});
        setHeaders(cols);
        setStatus(`Loaded ${res.data.length} rows · ${cols.length} columns`);
      },
      error: (err) => setStatus('Parse error: ' + err),
    });
  };

  const getSelectedScanColumns = () => mapping.scan;

  const makeTextBlob = (r) => {
    const parts = getSelectedScanColumns().map((c) => String(r[c] || ''));
    return (' ' + parts.join(' ') + ' ').toLowerCase();
  };

  const scoreRow = (r, textOverride) => {
    const text = textOverride ?? makeTextBlob(r);
    let score = 0;
    const hits = [];
    groups.forEach((g) => {
      const matched = g.patterns.some((p) => text.includes(p));
      if (matched) {
        score += g.weight;
        hits.push(g.label);
      }
    });
    return { score, reason: hits.join(' · ') };
  };

  const rank = (topOnly = false) => {
    if (!rows.length) {
      setStatus('Please upload a CSV first.');
      return;
    }
    const nameCol = mapping.name;
    const liCol = mapping.linkedin;
    const atsCol = mapping.ats;
    const rankedRows = rows
      .map((r) => {
        const { score, reason } = scoreRow(r);
        return { ...r, __score: score, __reason: reason, __name: r[nameCol] || '', __li: r[liCol] || '', __ats: r[atsCol] || '' };
      })
      .sort((a, b) => b.__score - a.__score);
    setRanked(rankedRows);
    const top = Math.max(1, Number(topN));
    const v = topOnly ? rankedRows.slice(0, 10) : rankedRows.slice(0, top);
    setView(v);
    setFilter('');
  };

  const filtered = useMemo(() => {
    if (!filter) return view;
    const q = filter.toLowerCase();
    return view.filter((r) => {
      const name = String(r.__name || '').toLowerCase();
      const text = makeTextBlob(r);
      return name.includes(q) || text.includes(q);
    });
  }, [filter, view, mapping.scan]);

  const exportCSV = () => {
    if (!ranked.length) return;
    const top = Math.max(1, Number(topN));
    const out = ranked.slice(0, top).map((r) => ({
      Score: r.__score,
      Name: r.__name,
      LinkedIn: r.__li,
      CandidateURL: r.__ats,
      Why: r.__reason,
      Skills: r['Skills'] || '',
      CurrentPosition: r['Current position'] || '',
      PastPosition: r['Past position'] || '',
      EducationLevel: r['Education level'] || '',
      Degree: r['Degree'] || '',
    }));
    const csv = Papa.unparse(out);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranked_candidates_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(() => {
    const extras = ['Skills', 'Current position', 'Past position', 'Education level', 'Degree'].filter((h) =>
      headers.includes(h)
    );
    return ['__score', '__name', '__li', '__ats', '__reason', ...extras];
  }, [headers]);

  return (
    <div className="wrap">
      <h1>
        Candidate Ranker <span className="badge">HR Friendly</span>
      </h1>
      <div className="sub">
        Upload a candidate CSV, set weights, and export a ranked Top N. Runs 100% in your browser (no server).
      </div>

      <div className="card">
        <div className="section row">
          <div>
            <label>Upload CSV (export from Comeet / ATS)</label>
            <input type="file" accept=".csv" onChange={handleFile} />
            <div className="small" style={{ marginTop: 8 }}>
              Detected columns will appear below so you can map them.
            </div>
          </div>
          <div>
            <label>Top N to keep</label>
            <input type="number" min="1" value={topN} onChange={(e) => setTopN(e.target.value)} />
            <div className="small">Default is 30</div>
          </div>
        </div>

        <div className="section">
          <div className="grid">
            <div>
              <label>
                Column: <b>Name</b>
              </label>
              <select value={mapping.name} onChange={(e) => setMapping({ ...mapping, name: e.target.value })}>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label>
                Column: <b>LinkedIn URL</b>
              </label>
              <select value={mapping.linkedin} onChange={(e) => setMapping({ ...mapping, linkedin: e.target.value })}>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label>
                Column: <b>ATS Candidate URL</b>
              </label>
              <select value={mapping.ats} onChange={(e) => setMapping({ ...mapping, ats: e.target.value })}>
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label>
                Column(s) scanned for keywords (hold <span className="kbd">Ctrl</span> to select multiple)
              </label>
              <select
                multiple
                size="6"
                value={mapping.scan}
                onChange={(e) =>
                  setMapping({
                    ...mapping,
                    scan: Array.from(e.target.selectedOptions).map((o) => o.value),
                  })
                }
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <div className="small">
                Tip: include <i>Skills</i>, <i>Current position</i>, <i>Past position</i>, <i>Education level</i>, <i>Degree</i>.
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <label>Job Description</label>
          <textarea placeholder="Paste job description here" rows="6" />
        </div>

        <div className="section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="pill">
              Preset: <button className="btn alt" onClick={presetNet}>Favor .NET</button>{' '}
              <button className="btn alt" onClick={presetBalanced}>Balanced</button>
            </span>
            <span className="small">
              Adjust sliders to change scoring weights. Total score is the sum of matched keyword groups.
            </span>
          </div>
          <div className="weights" id="weights">
            {groups.map((g, i) => (
              <GroupCard key={i} group={g} onChange={(ng) => updateGroup(i, ng)} onRemove={() => removeGroup(i)} />
            ))}
          </div>
          <button className="btn alt" style={{ marginTop: 10 }} onClick={addGroup}>
            Add Group
          </button>
        </div>

        <div className="section" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => rank(false)}>
            Rank Candidates
          </button>
          <button className="btn alt" onClick={() => rank(true)}>
            Preview 10
          </button>
          <button className="btn warn" disabled={!ranked.length} onClick={exportCSV}>
            Export Ranked CSV
          </button>
          <span className="small">{status}</span>
        </div>

        {view.length > 0 && (
          <div className="section" id="tableWrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="pill">
                <span>Results</span> <span id="resultCount">{filtered.length} shown</span>
              </div>
              <div className="small">Sorted by <b>Score</b> desc. Click column headers to sort locally.</div>
            </div>
            <input
              type="text"
              placeholder="Filter results"
              style={{ marginBottom: 10, width: '100%' }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
              <table id="tbl">
                <thead>
                  <tr>
                    {columns.map((h) => (
                      <th key={h}>{
                        { __score: 'Score', __name: 'Name', __li: 'LinkedIn', __ats: 'Candidate URL', __reason: 'Why (matched keywords)' }[
                          h
                        ] || h
                      }</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={idx}>
                      {columns.map((h) => {
                        let val = r[h] ?? '';
                        if (h === '__score') val = <span className="score">{val}</span>;
                        if (h === '__li' && val) val = (
                          <a href={val} target="_blank" rel="noreferrer">
                            LinkedIn
                          </a>
                        );
                        if (h === '__ats' && val)
                          val = (
                            <a href={val} target="_blank" rel="noreferrer">
                              Open in ATS
                            </a>
                          );
                        if (h === '__reason') val = <span className="small">{val}</span>;
                        return <td key={h}>{val}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <p className="small muted" style={{ marginTop: 14 }}>
        CSV never leaves your machine. Scoring is keyword-based and explainable. Edit weights to match your criteria.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

const { groups, loadGroups, saveGroups, DEFAULT_GROUPS } = window.core;

function App(){
  const [list, setList] = React.useState(()=>{
    loadGroups();
    if(!groups.length){
      groups.push(...JSON.parse(JSON.stringify(DEFAULT_GROUPS)));
      saveGroups();
    }
    return [...groups];
  });

  const sync = ()=>{
    setList([...groups]);
    saveGroups();
  };

  const handleChange = (i, field, value)=>{
    groups[i][field] = value;
    sync();
  };

  const addGroup = ()=>{
    groups.push({ label:'', patterns:[], weight:0 });
    sync();
  };

  const removeGroup = (i)=>{
    groups.splice(i,1);
    sync();
  };

  return (
    <div className="wrap">
      <h1>Candidate Ranker <span className="badge">HR Friendly</span></h1>
      <div className="card">
        <div className="section">
          <div id="groupsArea">
            <div className="weights">
              {list.map((g,i)=>(
                <div key={i} className="group-card card section">
                  <input type="text" className="grp-label" placeholder="Label" value={g.label}
                         onChange={e=>handleChange(i,'label', e.target.value)} />
                  <input type="text" className="grp-patterns" placeholder="pattern1, pattern2" value={g.patterns.join(', ')}
                         onChange={e=>handleChange(i,'patterns', e.target.value.split(',').map(p=>p.trim().toLowerCase()).filter(Boolean))} />
                  <input type="range" className="grp-weight" min="0" max="12" step="1" value={g.weight}
                         onChange={e=>handleChange(i,'weight', Number(e.target.value))} />
                  <div className="small">Weight: <span className="badge">{g.weight}</span></div>
                  <button className="btn warn" onClick={()=>removeGroup(i)}>Remove</button>
                </div>
              ))}
            </div>
            <button className="btn alt" onClick={addGroup} style={{marginTop:'10px'}}>Add Group</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(<App />);

// React-based Candidate Ranker

if (typeof window === 'undefined') {
  globalThis.window = {};
}

window.DEFAULT_GROUPS = [
  { key: "dotnet", label: ".NET stack (.NET, C#, ASP.NET)", patterns: [".net", "c#", "asp.net", "aspnet", "entity framework", "ef core"], weight: 8 },
  { key: "java", label: "Java stack (Java, Spring)", patterns: [" java ", "spring", "spring boot"], weight: 2 },
  { key: "micro", label: "Microservices", patterns: ["microservice", "micro-services", "micro services"], weight: 3 },
  { key: "db", label: "Databases (SQL/NoSQL)", patterns: [" sql ", "database", "postgres", "mysql", "mssql", "nosql", "mongodb", "cosmos", "dynamodb"], weight: 2 },
  { key: "fe", label: "Front-end (React/Angular/Vue)", patterns: ["react", "angular", "vue"], weight: 2 },
  { key: "devops", label: "CI/CD & Tools (Bitbucket/Jenkins/Pipelines)", patterns: ["bitbucket", "jenkins", "pipeline", "ci/cd", "cicd", "github actions", "azure devops"], weight: 2 },
  { key: "cloud", label: "Cloud & Messaging (AWS/Azure/RabbitMQ/Couchbase)", patterns: ["aws", "azure", "gcp", "cloud", "rabbitmq", "couchbase", "sqs", "sns", "kafka"], weight: 2 },
  { key: "support", label: "Support & Debugging", patterns: ["support", "tier-3", "tier3", "debug", "troubleshoot", "incident"], weight: 2 },
  { key: "edu", label: "Education (Bachelor/CS)", patterns: ["bachelor", "b.sc", "bsc", "computer science", "b.tech", "btech"], weight: 2 },
];

let groups = [];

function loadGroups() {
  try {
    groups = JSON.parse(localStorage.getItem('groups') || '[]');
  } catch (e) {
    groups = [];
  }
  if (!groups.length) {
    groups = JSON.parse(JSON.stringify(window.DEFAULT_GROUPS));
    saveGroups();
  }
}

function saveGroups() {
  localStorage.setItem('groups', JSON.stringify(groups));
}

function makeTextBlob(r, scanCols) {
  const parts = scanCols.map((c) => String(r[c] || ''));
  return (' ' + parts.join(' ') + ' ').toLowerCase();
}

function scoreRow(r, textOverride, scanCols = []) {
  const text = textOverride ?? makeTextBlob(r, scanCols);
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
}

if (typeof window !== 'undefined' && window.React && window.ReactDOM) {
  const { useState, useEffect } = window.React;

  function GroupCard({ group, onChange, onRemove }) {
    return window.React.createElement(
      'div',
      { className: 'group-card card section' },
      [
        window.React.createElement('input', {
          key: 'label',
          type: 'text',
          className: 'grp-label',
          placeholder: 'Label',
          value: group.label,
          onInput: (e) => onChange({ ...group, label: e.target.value }),
        }),
        window.React.createElement('input', {
          key: 'patterns',
          type: 'text',
          className: 'grp-patterns',
          placeholder: 'pattern1, pattern2',
          value: group.patterns.join(', '),
          onInput: (e) =>
            onChange({
              ...group,
              patterns: e.target.value
                .split(',')
                .map((p) => p.trim().toLowerCase())
                .filter(Boolean),
            }),
        }),
        window.React.createElement('input', {
          key: 'weight',
          type: 'range',
          className: 'grp-weight',
          min: 0,
          max: 12,
          step: 1,
          value: group.weight,
          onInput: (e) => onChange({ ...group, weight: Number(e.target.value) }),
        }),
        window.React.createElement(
          'div',
          { key: 'out', className: 'small' },
          'Weight: ',
          window.React.createElement('span', { className: 'badge' }, group.weight)
        ),
        window.React.createElement(
          'button',
          { key: 'remove', className: 'btn warn remove', onClick: onRemove },
          'Remove'
        ),
      ]
    );
  }

  function App() {
    const [groupState, setGroupState] = useState([]);

    useEffect(() => {
      loadGroups();
      setGroupState([...groups]);
    }, []);

    useEffect(() => {
      groups = groupState;
      saveGroups();
    }, [groupState]);

    const addGroup = () =>
      setGroupState([...groupState, { label: '', patterns: [], weight: 0 }]);

    return window.React.createElement(
      'div',
      { className: 'wrap' },
      [
        window.React.createElement(
          'h1',
          { key: 'h1' },
          'Candidate Ranker ',
          window.React.createElement('span', { className: 'badge' }, 'HR Friendly')
        ),
        window.React.createElement(
          'div',
          { key: 'groups', className: 'section' },
          [
            window.React.createElement(
              'div',
              { key: 'groupsArea', id: 'groupsArea' },
              [
                window.React.createElement(
                  'div',
                  { key: 'weights', className: 'weights' },
                  groupState.map((g, i) =>
                    window.React.createElement(GroupCard, {
                      key: i,
                      group: g,
                      onChange: (ng) => {
                        const arr = [...groupState];
                        arr[i] = ng;
                        setGroupState(arr);
                      },
                      onRemove: () => {
                        const arr = [...groupState];
                        arr.splice(i, 1);
                        setGroupState(arr);
                      },
                    })
                  )
                ),
                window.React.createElement(
                  'button',
                  { className: 'btn alt', onClick: addGroup, style: { marginTop: '10px' } },
                  'Add Group'
                ),
              ]
            ),
          ]
        ),
      ]
    );
  }

  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) {
      window.ReactDOM.createRoot(root).render(window.React.createElement(App));
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = { groups, saveGroups, scoreRow, DEFAULT_GROUPS: window.DEFAULT_GROUPS };
}

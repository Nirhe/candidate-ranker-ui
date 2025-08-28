// Core scoring logic used by the React UI and tests
// Keyword groups & default weights
const DEFAULT_GROUPS = [
  { key: 'dotnet', label: '.NET stack (.NET, C#, ASP.NET)', patterns: ['.net','c#','asp.net','aspnet','entity framework','ef core'], weight: 8 },
  { key: 'java', label: 'Java stack (Java, Spring)', patterns: [' java ','spring','spring boot'], weight: 2 },
  { key: 'micro', label: 'Microservices', patterns: ['microservice','micro-services','micro services'], weight: 3 },
  { key: 'db', label: 'Databases (SQL/NoSQL)', patterns: [' sql ','database','postgres','mysql','mssql','nosql','mongodb','cosmos','dynamodb'], weight: 2 },
  { key: 'fe', label: 'Front-end (React/Angular/Vue)', patterns: ['react','angular','vue'], weight: 2 },
  { key: 'devops', label: 'CI/CD & Tools (Bitbucket/Jenkins/Pipelines)', patterns: ['bitbucket','jenkins','pipeline','ci/cd','cicd','github actions','azure devops'], weight: 2 },
  { key: 'cloud', label: 'Cloud & Messaging (AWS/Azure/RabbitMQ/Couchbase)', patterns: ['aws','azure','gcp','cloud','rabbitmq','couchbase','sqs','sns','kafka'], weight: 2 },
  { key: 'support', label: 'Support & Debugging', patterns: ['support','tier-3','tier3','debug','troubleshoot','incident'], weight: 2 },
  { key: 'edu', label: 'Education (Bachelor/CS)', patterns: ['bachelor','b.sc','bsc','computer science','b.tech','btech'], weight: 2 },
];

// Mutable groups array; persisted via localStorage in the browser
let groups = [];

function loadGroups(){
  try {
    groups = JSON.parse(localStorage.getItem('groups') || '[]');
  } catch (e) {
    groups = [];
  }
}

function saveGroups(){
  localStorage.setItem('groups', JSON.stringify(groups));
}

// Score a row of candidate data based on the current groups
function scoreRow(_row, textOverride){
  const text = (textOverride || '').toLowerCase();
  let score = 0; const hits = [];
  groups.forEach(g => {
    const matched = g.patterns.some(p => text.includes(p));
    if(matched){ score += g.weight; hits.push(g.label); }
  });
  return { score, reason: hits.join(' · ') };
}

const api = { DEFAULT_GROUPS, groups, loadGroups, saveGroups, scoreRow };
if(typeof module !== 'undefined') module.exports = api;
if(typeof window !== 'undefined') window.app = api;

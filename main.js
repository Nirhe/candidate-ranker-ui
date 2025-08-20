// Core scoring logic and persistence for keyword groups.
// This file deliberately avoids DOM access so it can run in both
// browser and Node test environments.

// Default keyword groups and weights
const DEFAULT_GROUPS = [
  { key: "dotnet", label: ".NET stack (.NET, C#, ASP.NET)", patterns: [".net", "c#", "asp.net", "aspnet", "entity framework", "ef core"], weight: 8 },
  { key: "java", label: "Java stack (Java, Spring)", patterns: [" java ", "spring", "spring boot"], weight: 2 },
  { key: "micro", label: "Microservices", patterns: ["microservice", "micro-services", "micro services"], weight: 3 },
  { key: "db", label: "Databases (SQL/NoSQL)", patterns: [" sql ", "database", "postgres", "mysql", "mssql", "nosql", "mongodb", "cosmos", "dynamodb"], weight: 2 },
  { key: "fe", label: "Front-end (React/Angular/Vue)", patterns: ["react", "angular", "vue"], weight: 2 },
  { key: "devops", label: "CI/CD & Tools (Bitbucket/Jenkins/Pipelines)", patterns: ["bitbucket", "jenkins", "pipeline", "ci/cd", "cicd", "github actions", "azure devops"], weight: 2 },
  { key: "cloud", label: "Cloud & Messaging (AWS/Azure/RabbitMQ/Couchbase)", patterns: ["aws", "azure", "gcp", "cloud", "rabbitmq", "couchbase", "sqs", "sns", "kafka"], weight: 2 },
  { key: "support", label: "Support & Debugging", patterns: ["support", "tier-3", "tier3", "debug", "troubleshoot", "incident"], weight: 2 },
  { key: "edu", label: "Education (Bachelor/CS)", patterns: ["bachelor", "b.sc", "bsc", "computer science", "b.tech", "btech"], weight: 2 }
];

// Load existing groups from localStorage if possible
let groups = [];
try {
  groups = JSON.parse(localStorage.getItem('groups') || '[]');
} catch (e) {
  groups = [];
}

function saveGroups() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('groups', JSON.stringify(groups));
  }
}

if (!groups.length) {
  groups = JSON.parse(JSON.stringify(DEFAULT_GROUPS));
  saveGroups();
}

// Score a text blob against current groups
function scoreRow(_row, textOverride = '') {
  const text = (textOverride || '').toLowerCase();
  let score = 0; const hits = [];
  groups.forEach(g => {
    const matched = g.patterns.some(p => text.includes(p));
    if (matched) {
      score += g.weight;
      hits.push(g.label);
    }
  });
  return { score, reason: hits.join(' · ') };
}

// Expose for Node tests and browser usage
if (typeof module !== 'undefined') {
  module.exports = { groups, saveGroups, scoreRow };
}

if (typeof window !== 'undefined') {
  window.main = { groups, saveGroups, scoreRow };
}


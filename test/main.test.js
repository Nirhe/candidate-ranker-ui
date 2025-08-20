const test = require('node:test');
const assert = require('node:assert');

function setup(){
  global.localStorage = {
    data:{},
    setItem(k,v){ this.data[k]=v; },
    getItem(k){ return this.data[k]; },
    removeItem(k){ delete this.data[k]; }
  };
  delete require.cache[require.resolve('../app.bundle.js')];
  return require('../app.bundle.js');
}

test('scoreRow uses current groups', () => {
  const main = setup();
  main.groups.length = 0;
  main.groups.push({ label:'Foo', patterns:['foo'], weight:5 });
  const res1 = main.scoreRow(null, 'foo is here');
  assert.strictEqual(res1.score, 5);
  assert.strictEqual(res1.reason, 'Foo');

  main.groups[0].patterns = ['bar'];
  main.groups[0].weight = 2;
  const res2 = main.scoreRow(null, 'bar appears');
  assert.strictEqual(res2.score, 2);
  assert.strictEqual(res2.reason, 'Foo');
});

test('saveGroups persists changes', () => {
  const main = setup();
  const initial = main.groups.length;
  main.groups.push({ label:'', patterns:[], weight:0 });
  main.saveGroups();
  const stored = JSON.parse(global.localStorage.getItem('groups'));
  assert.strictEqual(stored.length, initial + 1);
});

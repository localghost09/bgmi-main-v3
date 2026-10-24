/* Producer control regression: run with node --test tests/stream-timer-ui.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('minutes:seconds control loads saved duration, validates and applies without URL editing', async () => {
  const nodes = {};
  function node(id) {
    return nodes[id] ||= {value: '', disabled: false, style: {}, clientWidth: 960,
      listeners: {}, attrs: {}, addEventListener(event, fn) {this.listeners[event] = fn;},
      setAttribute(k,v) {this.attrs[k] = v;}, removeAttribute(k) {delete this.attrs[k];}, focus() {}};
  }
  node('pmgcApplyTimer').disabled = true;
  const calls = [];
  const script = fs.readFileSync('public/js/overlays.js', 'utf8');
  const producer = script.slice(script.lastIndexOf('(function () {', script.indexOf('var PMGC_THEMES')));
  const context = vm.createContext({
    document: {readyState: 'complete', getElementById: node},
    window: {BROADCAST_THEMES: [{id: 'bmps-2024', name: 'BMPS 2024'}], addEventListener() {}},
    location: {origin: 'https://broadcast.example'}, navigator: {},
    BC: {api: async () => ({s: 200, d: {ok: true, streamStartSeconds: 330}}),
      post: async (url, body) => {calls.push({url, ...body}); return {s: 200, d: {ok: true}};}, toast() {}}
  });
  vm.runInContext(producer, context);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  assert.equal(node('pmgcStartDuration').value, '5:30');
  assert.equal(node('pmgcApplyTimer').disabled, false);
  for (const value of ['', '5:60', '5.30', '0:00', '1000:00', '5:3']) {
    node('pmgcStartDuration').value = value;
    node('pmgcApplyTimer').listeners.click();
    assert.equal(calls.length, 0);
    assert.equal(node('pmgcStartDuration').attrs['aria-invalid'], 'true');
  }
  node('pmgcStartDuration').value = '05:30';
  node('pmgcApplyTimer').listeners.click();
  await flush();
  assert.equal(calls[0].url, '/api/admin/overlay-settings');
  assert.equal(calls[0].streamStartDuration, '05:30');
  assert.equal(node('pmgcStartDuration').value, '5:30');
  assert.match(node('pmgcTimerStatus').textContent, /Saved 5:30/);
  assert.equal(node('pmgcStartDuration').attrs['aria-invalid'], undefined);
  assert.ok(!node('pmgcUrl').value.includes('start='));
  node('pmgcStartDuration').value = '0:45';
  let prevented = false;
  node('pmgcStartDuration').listeners.keydown({key: 'Enter', preventDefault() {prevented = true;}});
  await flush();
  assert.equal(prevented, true);
  assert.equal(calls[1].streamStartDuration, '0:45');
});

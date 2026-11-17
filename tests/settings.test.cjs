const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers.cjs');
const Plugin = loadSource('src/main.ts', { Plugin: class {}, PluginSettingTab: class {} }).default;

test('invalid persisted dimensions and opacity use safe defaults', async () => {
    const plugin = new Plugin();
    plugin.loadData = async () => ({ defaultWidth: Infinity, defaultHeight: -1, defaultOpacity: 5, notePositions: null });
    await plugin.loadSettings();
    assert.equal(plugin.settings.defaultWidth, 400);
    assert.equal(plugin.settings.defaultHeight, 600);
    assert.equal(plugin.settings.defaultOpacity, 1);
    assert.equal(Object.keys(plugin.settings.notePositions).length, 0);
});

const { parseSettings } = loadSource('src/types.ts');

test('valid Unicode paths and negative monitor coordinates survive loading', () => {
    const result = parseSettings({ notePositions: { 'Заметки/日本語.md': { x: -1920, y: 30, width: 400, height: 600 } } });
    assert.equal(result.notePositions['Заметки/日本語.md'].x, -1920);
});

test('malformed geometry is removed and unknown fields are not persisted', () => {
    const result = parseSettings({ notePositions: { bad: { x: 0, y: NaN, width: 400, height: 600 } }, windowBounds: {}, defaultPosition: 'invalid' });
    assert.equal(Object.keys(result.notePositions).length, 0);
    assert.equal(result.defaultPosition, 'top-right');
    assert.equal('windowBounds' in result, false);
});

test('default position dictionaries are independent', () => {
    const first = parseSettings(null);
    first.notePositions['test.md'] = { x: 0, y: 0, width: 400, height: 600 };
    assert.equal(Object.keys(parseSettings(null).notePositions).length, 0);
});

test('writes are serialized and each write retains its own snapshot', async () => {
    const plugin = new Plugin();
    const writes = [];
    let complete;
    plugin.saveData = async data => {
        writes.push(data.defaultWidth);
        if (writes.length === 1) await new Promise(resolve => { complete = resolve; });
    };
    const first = plugin.saveSettings();
    plugin.settings.defaultWidth = 500;
    const second = plugin.saveSettings();
    await Promise.resolve();
    assert.deepEqual(writes, [400]);
    complete();
    await Promise.all([first, second]);
    assert.deepEqual(writes, [400, 500]);
});

test('failed writes reject without blocking later saves', async () => {
    const plugin = new Plugin();
    let calls = 0;
    plugin.saveData = async () => { if (++calls === 1) throw new Error('Disk full'); };
    await assert.rejects(plugin.saveSettings(), /Disk full/);
    await plugin.saveSettings();
    assert.equal(calls, 2);
});

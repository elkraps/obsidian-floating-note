const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers.cjs');
const { EventEmitter } = require('node:events');
class TFile { constructor(path) { this.path = path; this.extension = 'md'; } }
class FileView { constructor(file) { this.file = file; } }
const notices = [];
const Plugin = loadSource('src/main.ts', {
    Plugin: class {}, PluginSettingTab: class {}, TFile, FileView,
    Notice: class { constructor(message) { notices.push(message); } },
}).default;

function fixture() {
    const plugin = new Plugin();
    const area = { x: -1600, y: 30, width: 1600, height: 970 };
    const native = new EventEmitter();
    let bounds = { x: -1500, y: 100, width: 900, height: 700 };
    native.getBounds = () => ({ ...bounds });
    native.setBounds = value => { bounds = { ...value }; };
    native.setAlwaysOnTop = value => { native.alwaysOnTop = value; };
    native.setOpacity = value => { native.opacity = value; };
    native.isDestroyed = () => false;
    const domEvents = new Map();
    const win = {
        electronWindow: native,
        require: () => ({ screen: { getDisplayMatching: () => ({ workArea: area }) } }),
        addEventListener: (name, listener) => domEvents.set(name, listener),
        removeEventListener: name => domEvents.delete(name),
    };
    const file = new TFile('Заметка.md');
    const leaf = {
        view: new FileView(file), getContainer: () => ({ win }),
        openFile: async () => {}, detach: () => { leaf.detached = true; },
    };
    const events = new Map();
    plugin.app = {
        workspace: { activeLeaf: leaf, openPopoutLeaf: () => leaf, on: (name, callback) => { events.set(name, callback); } },
        vault: { on: (name, callback) => { events.set(name, callback); }, getMarkdownFiles: () => [file] },
    };
    plugin.saveData = async () => {};
    plugin.loadData = async () => null;
    plugin.registerEvent = () => {};
    plugin.addCommand = () => {};
    plugin.addRibbonIcon = () => {};
    plugin.addSettingTab = () => {};
    return { plugin, native, win, leaf, file, events, domEvents };
}

test('explicit position overrides saved coordinates while retaining saved size', async () => {
    const { plugin, native, file } = fixture();
    plugin.settings.notePositions[file.path] = { x: -1200, y: 80, width: 600, height: 700 };
    await plugin.openFloatingNote(file, 'bottom-right');
    assert.deepEqual(native.getBounds(), { x: -600, y: 300, width: 600, height: 700 });
    plugin.onunload();
});

test('normal opening restores saved geometry', async () => {
    const { plugin, native, file } = fixture();
    const saved = { x: -1200, y: 80, width: 600, height: 700 };
    plugin.settings.notePositions[file.path] = saved;
    await plugin.openFloatingNote(file);
    assert.deepEqual(native.getBounds(), saved);
    plugin.onunload();
});

test('move events persist bounds before window closure', async () => {
    const { plugin, native, file } = fixture();
    await plugin.openFloatingNote(file);
    native.setBounds({ x: -1000, y: 150, width: 500, height: 650 });
    native.emit('move');
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(plugin.settings.notePositions[file.path].x, -1000);
    plugin.onunload();
});

test('window-close removes tracked leaves and native listeners', async () => {
    const { plugin, native, win, file, events, domEvents } = fixture();
    await plugin.onload();
    await plugin.openFloatingNote(file);
    events.get('window-close')({}, win);
    assert.equal(plugin.floatingLeaves.size, 0);
    assert.equal(native.listenerCount('move'), 0);
    assert.equal(native.listenerCount('resize'), 0);
    assert.equal(domEvents.size, 0);
});

test('remember position disabled does not persist geometry', async () => {
    const { plugin, file } = fixture();
    plugin.settings.rememberPosition = false;
    await plugin.openFloatingNote(file);
    plugin.onunload();
    assert.equal(Object.keys(plugin.settings.notePositions).length, 0);
});

test('unloading snapshots, detaches windows, and removes listeners', async () => {
    const { plugin, file, native, leaf } = fixture();
    await plugin.openFloatingNote(file);
    native.setBounds({ x: -800, y: 300, width: 400, height: 600 });
    plugin.onunload();
    assert.equal(plugin.settings.notePositions[file.path].x, -800);
    assert.equal(leaf.detached, true);
    assert.equal(native.listenerCount('resize'), 0);
    assert.equal(plugin.floatingLeaves.size, 0);
});

test('renaming a note migrates geometry and deletion removes it', async () => {
    const { plugin, file, events } = fixture();
    await plugin.onload();
    await plugin.openFloatingNote(file);
    const oldPath = file.path;
    file.path = 'Новое имя.md';
    events.get('rename')(file, oldPath);
    assert.equal(plugin.settings.notePositions[oldPath], undefined);
    assert.ok(plugin.settings.notePositions[file.path]);
    events.get('delete')(file);
    assert.equal(plugin.settings.notePositions[file.path], undefined);
    plugin.onunload();
});

test('appearance settings are applied to new windows', async () => {
    const { plugin, file, native } = fixture();
    plugin.settings.alwaysOnTop = false;
    plugin.settings.defaultOpacity = 0.5;
    await plugin.openFloatingNote(file);
    assert.equal(native.alwaysOnTop, false);
    assert.equal(native.opacity, 0.5);
    plugin.onunload();
});

test('saved bounds remain usable after the originating Electron context is released', async () => {
    const { plugin, file, native } = fixture();
    const getBounds = native.getBounds;
    let released = false;
    native.getBounds = () => {
        const values = getBounds();
        return Object.defineProperties({}, Object.fromEntries(Object.keys(values).map(key => [key, {
                enumerable: true,
                get: () => { if (released) throw new Error('IPC method called after context was released'); return values[key]; },
            }])));
    };
    await plugin.openFloatingNote(file);
    const saved = plugin.settings.notePositions[file.path];
    plugin.onunload();
    released = true;
    assert.equal(saved.width, 400);
    assert.equal(saved.height, 600);
});

test('missing Electron controls produce a notice without leaving a partial window', async () => {
    const { plugin, file, leaf, win } = fixture();
    plugin.app.workspace.activeLeaf = { getContainer: () => ({ win }) };
    leaf.getContainer = () => ({ win: {} });
    const count = notices.length;
    // The expected error is reported to the user and console by the plugin.
    await plugin.openFloatingNote(file);
    assert.equal(plugin.floatingLeaves.size, 0);
    assert.equal(notices.length, count + 1);
    assert.equal(leaf.detached, true);
});

test('cleanup awaits persistence and preserves geometry for existing notes', async () => {
    const { plugin, file } = fixture();
    plugin.settings.notePositions[file.path] = { x: 0, y: 34, width: 400, height: 600 };
    plugin.settings.notePositions['deleted.md'] = { x: 0, y: 34, width: 400, height: 600 };
    let saved;
    plugin.saveData = async data => { saved = data; };
    assert.equal(await plugin.cleanupStalePositions(), 1);
    assert.equal(saved.notePositions['deleted.md'], undefined);
    assert.ok(saved.notePositions[file.path]);
});

test('saved geometry is passed at window creation before opening the file', async () => {
    const { plugin, file, leaf, native } = fixture();
    const saved = { x: -1200, y: 80, width: 600, height: 700 };
    plugin.settings.notePositions[file.path] = saved;
    let creation;
    let boundsWhenOpeningFile;
    plugin.app.workspace.openPopoutLeaf = options => {
        creation = options;
        if (options) native.setBounds({ x: options.x, y: options.y, ...options.size });
        return leaf;
    };
    leaf.openFile = async () => { boundsWhenOpeningFile = native.getBounds(); };
    await plugin.openFloatingNote(file);
    assert.ok(creation, 'Window must receive its geometry at creation');
    assert.deepEqual(boundsWhenOpeningFile, saved);
    plugin.onunload();
});

test('explicit position is used at window creation even when saved coordinates exist', async () => {
    const { plugin, file, leaf } = fixture();
    plugin.settings.notePositions[file.path] = { x: -1200, y: 80, width: 600, height: 700 };
    let creation;
    plugin.app.workspace.openPopoutLeaf = options => { creation = options; return leaf; };
    await plugin.openFloatingNote(file, 'bottom-right');
    assert.ok(creation, 'Window must receive its geometry at creation');
    assert.equal(creation.x, -600);
    assert.equal(creation.y, 300);
    assert.equal(creation.size.width, 600);
    assert.equal(creation.size.height, 700);
    plugin.onunload();
});

test('Obsidian minimum initial size is corrected before asynchronous file loading', async () => {
    const { plugin, file, leaf, native } = fixture();
    const saved = { x: -400, y: 100, width: 400, height: 300 };
    plugin.settings.notePositions[file.path] = saved;
    plugin.settings.alwaysOnTop = true;
    plugin.settings.defaultOpacity = 0.6;
    plugin.app.workspace.openPopoutLeaf = options => {
        // Obsidian 1.15.1 expands the suggested dimensions to at least 600.
        native.setBounds({ x: options.x, y: options.y,
            width: Math.max(options.size.width, 600), height: Math.max(options.size.height, 600) });
        return leaf;
    };
    let finishLoading;
    let stateWhenLoadingStarts;
    leaf.openFile = () => {
        stateWhenLoadingStarts = {
            bounds: native.getBounds(), alwaysOnTop: native.alwaysOnTop, opacity: native.opacity,
        };
        return new Promise(resolve => { finishLoading = resolve; });
    };
    const opening = plugin.openFloatingNote(file);
    try {
        assert.deepEqual(stateWhenLoadingStarts, { bounds: saved, alwaysOnTop: true, opacity: 0.6 });
    } finally {
        finishLoading();
        await opening;
        plugin.onunload();
    }
});

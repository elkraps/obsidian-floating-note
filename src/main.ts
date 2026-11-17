import { FileView, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { FloatingNoteSettings, POSITIONS, Position, parseSettings } from './types';
import { FloatingNoteSettingTab } from './settings';
import { fitToWorkArea, positionInWorkArea } from './geometry';
import { getWindowAdapter, readWindowBounds } from './window-adapter';

interface FloatingWindow {
    win: Window;
    snapshot: () => void;
    dispose: () => void;
}

export default class FloatingNotePlugin extends Plugin {
    settings: FloatingNoteSettings = parseSettings(null);
    private floatingLeaves = new Map<WorkspaceLeaf, FloatingWindow>();
    private saveQueue: Promise<void> = Promise.resolve();
    private unloading = false;

    async onload() {
        await this.loadSettings();
        for (const position of POSITIONS) {
            this.addCommand({
                id: `open-floating-note-${position}`,
                name: `Open in floating window (${position})`,
                checkCallback: checking => {
                    const file = this.app.workspace.getActiveFile();
                    if (!(file instanceof TFile) || file.extension !== 'md') return false;
                    if (!checking) void this.openFloatingNote(file, position);
                    return true;
                },
            });
        }
        this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
            if (file instanceof TFile && file.extension === 'md') {
                menu.addItem(item => item.setTitle('Open in floating window').setIcon('popup-open')
                    .onClick(() => { void this.openFloatingNote(file); }));
            }
        }));
        this.registerEvent(this.app.workspace.on('window-close', (_container, win) => {
            for (const [leaf, floating] of this.floatingLeaves) {
                if (floating.win === win) {
                    floating.dispose();
                    this.floatingLeaves.delete(leaf);
                }
            }
        }));
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            const bounds = this.settings.notePositions[oldPath];
            if (bounds) {
                this.settings.notePositions[file.path] = bounds;
                delete this.settings.notePositions[oldPath];
                this.persistSettings();
            }
        }));
        this.registerEvent(this.app.vault.on('delete', file => {
            if (Object.prototype.hasOwnProperty.call(this.settings.notePositions, file.path)) {
                delete this.settings.notePositions[file.path];
                this.persistSettings();
            }
        }));
        this.addRibbonIcon('popup-open', 'Open floating note', () => {
            const file = this.app.workspace.getActiveFile();
            if (file instanceof TFile && file.extension === 'md') void this.openFloatingNote(file);
        });
        this.addSettingTab(new FloatingNoteSettingTab(this.app, this));
    }

    async openFloatingNote(file: TFile, position?: Position) {
        let leaf: WorkspaceLeaf | undefined;
        try {
            const sourceWindow = this.app.workspace.activeLeaf?.getContainer().win ?? window;
            const source = getWindowAdapter(sourceWindow);
            const sourceBounds = readWindowBounds(source.native);
            const saved = this.settings.rememberPosition ? this.settings.notePositions[file.path] : undefined;
            // Explicit position commands override saved coordinates, but retain saved size.
            const area = source.screen.getDisplayMatching(saved && !position ? saved : sourceBounds).workArea;
            const width = saved?.width ?? this.settings.defaultWidth;
            const height = saved?.height ?? this.settings.defaultHeight;
            const bounds = saved && !position ? fitToWorkArea(saved, area)
                : positionInWorkArea(area, position ?? this.settings.defaultPosition, width, height);
            // Supply geometry before the native window is shown or the file is loaded.
            leaf = this.app.workspace.openPopoutLeaf({
                x: bounds.x,
                y: bounds.y,
                size: { width: bounds.width, height: bounds.height },
            });
            const win = leaf.getContainer().win;
            const { native } = getWindowAdapter(win);
            // Obsidian expands suggested sizes below 600 pixels. Correct the native
            // bounds synchronously, before it can show the window during file loading.
            native.setBounds(bounds);
            native.setAlwaysOnTop(this.settings.alwaysOnTop, 'floating');
            native.setOpacity(this.settings.defaultOpacity);
            await leaf.openFile(file);
            if (this.unloading) {
                leaf.detach();
                return;
            }

            const openedLeaf = leaf;
            let timer: ReturnType<typeof setTimeout> | undefined;
            const snapshot = () => {
                if (!this.settings.rememberPosition || native.isDestroyed()) return;
                const currentFile = openedLeaf.view instanceof FileView ? openedLeaf.view.file : null;
                if (!currentFile || currentFile.extension !== 'md') return;
                this.settings.notePositions[currentFile.path] = readWindowBounds(native);
                this.persistSettings();
            };
            const changed = () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    try { snapshot(); }
                    catch (error) { this.reportError('Could not save floating window position.', error); }
                }, 250);
            };
            const beforeUnload = () => {
                clearTimeout(timer);
                try { snapshot(); }
                catch (error) { this.reportError('Could not save floating window position.', error); }
            };
            native.on('move', changed);
            native.on('resize', changed);
            win.addEventListener('beforeunload', beforeUnload);
            this.floatingLeaves.set(leaf, {
                win, snapshot,
                dispose: () => {
                    clearTimeout(timer);
                    native.removeListener('move', changed);
                    native.removeListener('resize', changed);
                    win.removeEventListener('beforeunload', beforeUnload);
                },
            });
            snapshot();
        } catch (error) {
            if (leaf) {
                this.floatingLeaves.get(leaf)?.dispose();
                this.floatingLeaves.delete(leaf);
                leaf.detach();
            }
            this.reportError('Could not open floating note. See the developer console for details.', error);
        }
    }

    onunload() {
        this.unloading = true;
        this.closeAllFloatingWindows();
    }

    closeAllFloatingWindows() {
        for (const [leaf, floating] of this.floatingLeaves) {
            try { floating.snapshot(); }
            catch (error) { this.reportError('Could not save floating window position.', error); }
            floating.dispose();
            leaf.detach();
        }
        this.floatingLeaves.clear();
    }

    async loadSettings() {
        this.settings = parseSettings(await this.loadData());
    }

    saveSettings(): Promise<void> {
        const snapshot = JSON.parse(JSON.stringify(this.settings)) as FloatingNoteSettings;
        const write = this.saveQueue.then(() => this.saveData(snapshot));
        // A failed write must not prevent later writes; the caller still receives the rejection.
        this.saveQueue = write.catch(() => {});
        return write;
    }

    private persistSettings() {
        void this.saveSettings().catch(error => this.reportError('Could not save Floating Note settings.', error));
    }

    private reportError(message: string, error: unknown) {
        console.error(message, error);
        new Notice(message);
    }

    async cleanupStalePositions(): Promise<number> {
        const validPaths = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
        let count = 0;
        for (const path of Object.keys(this.settings.notePositions)) {
            if (!validPaths.has(path)) {
                delete this.settings.notePositions[path];
                count++;
            }
        }
        await this.saveSettings();
        return count;
    }
}

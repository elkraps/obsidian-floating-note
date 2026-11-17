import { NoteGeometry } from './types';

export interface ElectronWindow {
    getBounds(): NoteGeometry;
    setBounds(bounds: NoteGeometry): void;
    setAlwaysOnTop(value: boolean, level?: string): void;
    setOpacity(value: number): void;
    isDestroyed(): boolean;
    on(event: 'move' | 'resize', listener: () => void): void;
    removeListener(event: 'move' | 'resize', listener: () => void): void;
}

interface Screen {
    getDisplayMatching(bounds: NoteGeometry): { workArea: NoteGeometry };
}

// Obsidian exposes these Electron objects at runtime, outside its public API.
// Keep this compatibility boundary isolated and fail visibly if it changes.
export function getWindowAdapter(win: Window): { native: ElectronWindow; screen: Screen } {
    const runtime = win as Window & {
        electronWindow?: ElectronWindow;
        require?: (name: string) => { screen?: Screen };
    };
    const native = runtime.electronWindow;
    if (!native || typeof native.getBounds !== 'function' || typeof runtime.require !== 'function') {
        throw new Error('Obsidian Electron window controls are unavailable.');
    }
    const screen = runtime.require('@electron/remote').screen;
    if (!screen || typeof screen.getDisplayMatching !== 'function') {
        throw new Error('Electron display information is unavailable.');
    }
    return { native, screen };
}

export function readWindowBounds(native: ElectronWindow): NoteGeometry {
    // @electron/remote can return accessor-backed proxies tied to the renderer.
    // Persist only primitive values so closing that renderer cannot invalidate them.
    const { x, y, width, height } = native.getBounds();
    return { x, y, width, height };
}

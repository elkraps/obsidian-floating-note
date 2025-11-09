export interface NoteGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FloatingNoteSettings {
    defaultWidth: number;
    defaultHeight: number;
    rememberPosition: boolean;
    defaultPosition: 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    notePositions: Record<string, NoteGeometry>;
    alwaysOnTop: boolean;
    defaultOpacity: number;
}

export const DEFAULT_SETTINGS: FloatingNoteSettings = {
    defaultWidth: 400,
    defaultHeight: 600,
    rememberPosition: true,
    defaultPosition: 'top-right',
    notePositions: {},
    alwaysOnTop: true,
    defaultOpacity: 1.0,
};
export const POSITIONS = ['center', 'top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
export type Position = typeof POSITIONS[number];

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
    defaultPosition: Position;
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
    defaultOpacity: 1,
};

export function isPosition(value: unknown): value is Position {
    return POSITIONS.some(position => position === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDimension(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 200;
}

export function parseSettings(value: unknown): FloatingNoteSettings {
    const settings: FloatingNoteSettings = { ...DEFAULT_SETTINGS, notePositions: {} };
    if (!isRecord(value)) return settings;
    if (isDimension(value.defaultWidth)) settings.defaultWidth = Math.round(value.defaultWidth);
    if (isDimension(value.defaultHeight)) settings.defaultHeight = Math.round(value.defaultHeight);
    if (typeof value.rememberPosition === 'boolean') settings.rememberPosition = value.rememberPosition;
    if (typeof value.alwaysOnTop === 'boolean') settings.alwaysOnTop = value.alwaysOnTop;
    if (isPosition(value.defaultPosition)) settings.defaultPosition = value.defaultPosition;
    if (typeof value.defaultOpacity === 'number' && Number.isFinite(value.defaultOpacity)
        && value.defaultOpacity >= 0.3 && value.defaultOpacity <= 1) {
        settings.defaultOpacity = value.defaultOpacity;
    }
    if (isRecord(value.notePositions)) {
        for (const [path, bounds] of Object.entries(value.notePositions)) {
            if (isRecord(bounds) && typeof bounds.x === 'number' && Number.isFinite(bounds.x)
                && typeof bounds.y === 'number' && Number.isFinite(bounds.y)
                && typeof bounds.width === 'number' && Number.isFinite(bounds.width) && bounds.width > 0
                && typeof bounds.height === 'number' && Number.isFinite(bounds.height) && bounds.height > 0) {
                Object.defineProperty(settings.notePositions, path, {
                    value: { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.max(1, Math.round(bounds.width)), height: Math.max(1, Math.round(bounds.height)) },
                    enumerable: true, configurable: true, writable: true,
                });
            }
        }
    }
    return settings;
}

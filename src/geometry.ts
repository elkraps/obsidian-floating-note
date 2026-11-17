import { NoteGeometry, Position } from './types';

export function fitToWorkArea(bounds: NoteGeometry, area: NoteGeometry): NoteGeometry {
    const width = Math.min(Math.round(bounds.width), area.width);
    const height = Math.min(Math.round(bounds.height), area.height);
    return {
        width,
        height,
        x: Math.max(area.x, Math.min(Math.round(bounds.x), area.x + area.width - width)),
        y: Math.max(area.y, Math.min(Math.round(bounds.y), area.y + area.height - height)),
    };
}

export function positionInWorkArea(area: NoteGeometry, position: Position, width: number, height: number): NoteGeometry {
    width = Math.min(Math.round(width), area.width);
    height = Math.min(Math.round(height), area.height);
    const x = position === 'center' ? area.x + (area.width - width) / 2
        : position.endsWith('right') ? area.x + area.width - width : area.x;
    const y = position === 'center' ? area.y + (area.height - height) / 2
        : position.startsWith('bottom') ? area.y + area.height - height : area.y;
    return fitToWorkArea({ x, y, width, height }, area);
}

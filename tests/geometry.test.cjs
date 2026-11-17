const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers.cjs');
const { positionInWorkArea, fitToWorkArea } = loadSource('src/geometry.ts');

test('positions include work area origin and menu bar offset', () => {
    const area = { x: -1920, y: 30, width: 1920, height: 1050 };
    const expected = {
        center: [-1160, 255], 'top-left': [-1920, 30], 'top-right': [-400, 30],
        'bottom-left': [-1920, 480], 'bottom-right': [-400, 480],
    };
    for (const [position, [x, y]] of Object.entries(expected)) {
        const result = positionInWorkArea(area, position, 400, 600);
        assert.equal(result.x, x, position);
        assert.equal(result.y, y, position);
    }
});

test('off-screen saved bounds fit an available work area after monitor removal', () => {
    const result = fitToWorkArea({ x: 3000, y: -500, width: 400, height: 600 }, { x: 0, y: 24, width: 1440, height: 876 });
    assert.equal(result.x, 1040);
    assert.equal(result.y, 24);
});

test('oversized windows shrink to fit a smaller screen', () => {
    const result = positionInWorkArea({ x: 20, y: 40, width: 800, height: 500 }, 'bottom-right', 1200, 900);
    assert.equal(result.width, 800);
    assert.equal(result.height, 500);
    assert.equal(result.x, 20);
    assert.equal(result.y, 40);
});

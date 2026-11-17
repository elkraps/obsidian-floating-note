const { buildSync } = require('esbuild');
const vm = require('node:vm');

function loadSource(path, obsidian = {}) {
    const result = buildSync({ entryPoints: [path], bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false });
    const module = { exports: {} };
    vm.runInNewContext(result.outputFiles[0].text, {
        module, exports: module.exports,
        require: name => name === 'obsidian' ? obsidian : require(name),
        console, setTimeout, clearTimeout,
    });
    return module.exports;
}
module.exports = { loadSource };

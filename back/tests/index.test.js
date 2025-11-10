const utils = require('../utils');

describe('utils/index.js re-exports', () => {
  test('exports selected helpers from submodules', () => {
    expect(typeof utils.readMap).toBe('function');
    expect(typeof utils.writeMap).toBe('function');
    expect(typeof utils.findIndexByCode).toBe('function');
    expect(typeof utils.validateNodeShape).toBe('function');
    expect(typeof utils.normalizeEdgeOrThrow).toBe('function');
  });
});

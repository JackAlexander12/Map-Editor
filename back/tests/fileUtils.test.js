jest.mock('fs', () => {
  let file = '';
  return {
    readFileSync: jest.fn(() => file),
    writeFileSync: jest.fn((_p, data) => { file = String(data); })
  };
});

const path = require('path');
jest.mock('path', () => ({
  join: jest.fn(() => '/fake/path/map.json'),
  ...jest.requireActual('path')
}));

const { readMap, writeMap } = require('../utils/fileUtils');

describe('fileUtils normalization', () => {
  test('readMap fills missing map/nodes/edges/maxNeighborDistance', () => {
    const fs = require('fs');
    fs.readFileSync.mockReturnValueOnce(JSON.stringify({})); 

    const a = readMap();
    expect(a.map).toBeTruthy();
    expect(Array.isArray(a.map.nodes)).toBe(true);
    expect(Array.isArray(a.map.edges)).toBe(true);
    expect(a.map.maxNeighborDistance).toBe(1500);

    fs.readFileSync.mockReturnValueOnce(JSON.stringify({ map: { maxNeighborDistance: 'nope' } }));
    const b = readMap();
    expect(b.map.maxNeighborDistance).toBe(1500);
    expect(Array.isArray(b.map.nodes)).toBe(true);
    expect(Array.isArray(b.map.edges)).toBe(true);
  });

  test('writeMap normalizes fields on write', () => {
    const input = { map: { /* nodes/edges/cap omitted */ } };
    writeMap(input);
    const out = readMap();
    expect(Array.isArray(out.map.nodes)).toBe(true);
    expect(Array.isArray(out.map.edges)).toBe(true);
    expect(out.map.maxNeighborDistance).toBe(1500);
  });
});

const {
  validateNodeShape,
  validateDirectionsList,
  validateWholeMapShape
} = require('../utils/validateUtils');

test('validateDirectionsList', () => {
  expect(validateDirectionsList(['North','South'])).toBe(true);
  expect(validateDirectionsList(['North','Nope'])).toBe(false);
  expect(validateDirectionsList('North')).toBe(false);
});

test('validateNodeShape ok', () => {
  expect(validateNodeShape({ x: 0, y: 0, code: 1 })).toBeNull();
  expect(validateNodeShape({ x: 0, y: 0, code: 1, name: 'A' })).toBeNull();
  expect(validateNodeShape({ x: 0, y: 0, code: 1, directions: ['North','West'] })).toBeNull();
});

test('validateNodeShape errors', () => {
  expect(validateNodeShape({ x: 1.5, y: 0, code: 1 })).toMatch(/integer x/);
  expect(validateNodeShape({ x: 0, y: 0, code: 1, name: '' })).toMatch(/non-empty string/);
  expect(validateNodeShape({ x: 0, y: 0, code: 1, directions: ['Nope'] })).toMatch(/North\/South\/East\/West/);
  expect(validateNodeShape({ x: 0, y: 0, code: 1, charger: { direction: 'Nope' } })).toMatch(/charger\.direction/);
});

test('validateWholeMapShape structure and duplicates', () => {
  const good = {
    map: {
      maxNeighborDistance: 1000,
      nodes: [{ x: 0, y: 0, code: 1 }, { x: 0, y: 10, code: 2 }],
      edges: []
    }
  };
  expect(validateWholeMapShape(good)).toBeNull();

  const dup = {
    map: {
      nodes: [{ x: 0, y: 0, code: 1 }, { x: 10, y: 0, code: 1 }]
    }
  };
  expect(validateWholeMapShape(dup)).toMatch(/Duplicate code/);

  const badMax = { map: { maxNeighborDistance: -5, nodes: [] } };
  expect(validateWholeMapShape(badMax)).toMatch(/positive integer/);
});

test('validateWholeMapShape catches structural problems', () => {
  expect(validateWholeMapShape(null)).toMatch(/Body must be/i);
  expect(validateWholeMapShape({})).toMatch(/Body must be/i);
  expect(validateWholeMapShape({ map: { nodes: 'nope' } })).toMatch(/nodes/i);
  expect(validateWholeMapShape({ map: { nodes: [], edges: 'nope' } })).toMatch(/edges must be an array/i);
});

describe('validateNodeShape charger/chute variations', () => {
  test('valid charger/chute objects', () => {
    expect(
      validateNodeShape({ x: 0, y: 0, code: 1, charger: { direction: 'North' } })
    ).toBeNull();
    expect(
      validateNodeShape({ x: 0, y: 0, code: 2, chute: { direction: 'West' } })
    ).toBeNull();
  });

  test('missing .direction in charger/chute -> error', () => {
    expect(
      validateNodeShape({ x: 0, y: 0, code: 3, charger: {} })
    ).toMatch(/charger\.direction/i);
    expect(
      validateNodeShape({ x: 0, y: 0, code: 4, chute: {} })
    ).toMatch(/chute\.direction/i);
  });

  test('non-object charger/chute -> error', () => {
    expect(
      validateNodeShape({ x: 0, y: 0, code: 5, charger: 'North' })
    ).toMatch(/charger\.direction/i);

    expect(
      validateNodeShape({ x: 0, y: 0, code: 6, chute: 'West' })
    ).toMatch(/chute\.direction/i);
  });
});


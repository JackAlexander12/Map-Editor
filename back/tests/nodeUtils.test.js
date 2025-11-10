const { DIRS, asKey, isInt, findIndexByCode } = require('../utils/nodeUtils');

test('DIRS contains the four compass directions', () => {
  expect(DIRS.has('North')).toBe(true);
  expect(DIRS.has('South')).toBe(true);
  expect(DIRS.has('East')).toBe(true);
  expect(DIRS.has('West')).toBe(true);
});

test('asKey and isInt', () => {
  expect(asKey(5)).toBe('5');
  expect(isInt(3)).toBe(true);
  expect(isInt(3.14)).toBe(false);
});

test('findIndexByCode', () => {
  const data = { map: { nodes: [{ code: 1 }, { code: 'A' }] } };
  expect(findIndexByCode(data, 1)).toBe(0);
  expect(findIndexByCode(data, 'A')).toBe(1);
  expect(findIndexByCode(data, 'missing')).toBe(-1);
});

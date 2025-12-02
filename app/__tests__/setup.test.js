// Basic setup test to verify Jest and fast-check are working

const fc = require('fast-check');

describe('Test Environment Setup', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is available', () => {
    expect(fc).toBeDefined();
    expect(typeof fc.assert).toBe('function');
    expect(typeof fc.property).toBe('function');
  });

  test('fast-check can run a simple property test', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });
});

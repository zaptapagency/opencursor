import { test } from 'node:test';
import assert from 'node:assert';
import { add, subtract } from './math.js';

test('add', () => {
  assert.strictEqual(add(2, 3), 5);
});

test('subtract', () => {
  assert.strictEqual(subtract(5, 2), 3);
});

// Agent-mode task idea:
//   "Add a multiply function to math.js and a passing test for it, then run npm test."

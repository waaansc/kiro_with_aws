import { test } from '@fast-check/vitest';
import { fc } from '@fast-check/vitest';
import { expect } from 'vitest';

test.prop([fc.integer(), fc.integer()])('addition is commutative', (a, b) => {
  expect(a + b).toBe(b + a);
});

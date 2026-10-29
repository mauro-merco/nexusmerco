import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTaskClosure } from './task-closure.ts';

test('closure requires a supported effort and a meaningful summary', () => {
  assert.ok(validateTaskClosure({}));
  assert.ok(validateTaskClosure({ closure_effort: 'unknown', closure_summary: 'Terminado' }));
  assert.ok(validateTaskClosure({ closure_effort: 'low', closure_summary: '   ' }));
  assert.ok(validateTaskClosure({ closure_effort: 'low', closure_summary: 'x'.repeat(10001) }));
  for (const closure_effort of ['low', 'medium', 'high', 'very_high']) {
    assert.equal(validateTaskClosure({ closure_effort, closure_summary: 'Entregado y revisado', actual_minutes: null }), null);
  }
});

test('actual time is optional but must be positive whole minutes when supplied', () => {
  const valid = { closure_effort: 'medium', closure_summary: 'Se entregaron los archivos finales' };
  assert.equal(validateTaskClosure(valid), null);
  assert.equal(validateTaskClosure({ ...valid, actual_minutes: 90 }), null);
  for (const actual_minutes of [0, -1, 1.5, '90', Infinity, NaN]) assert.ok(validateTaskClosure({ ...valid, actual_minutes }));
});

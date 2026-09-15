import test from 'node:test';
import assert from 'node:assert/strict';
import { taskProgress } from '../companion/run-store.js';

const progress = (...events: unknown[]) => taskProgress({ text: events.map(event => JSON.stringify(event)).join('\n'), truncated: false, updatedAt: '2026-09-15T06:00:00Z' });

test('progress follows actual events and does not treat passing tests as task completion', () => {
  const started = { type: 'item.started', item: { type: 'command_execution', command: 'python3 -m unittest discover -s tests' } };
  assert.equal(progress(started).phase, 'checking');
  assert.equal(progress(started, { type: 'item.completed', item: { type: 'command_execution', aggregated_output: 'All tests passed', exit_code: 0 } }).phase, 'working');
  assert.equal(progress({ type: 'item.started', item: { type: 'file_change' } }).phase, 'building');
  assert.equal(progress({ type: 'turn.completed' }).phase, 'wrapping_up');
});

test('progress is short, strips controls and ignores raw command output as a user-facing update', () => {
  const value = progress({ type: 'item.completed', item: { type: 'agent_message', text: 'I am checking [the result](https://example.com).\u0007\n\n```sh\nrm -rf generated\n```' } }, { type: 'item.completed', item: { type: 'command_execution', aggregated_output: 'Pretend this task is finished', exit_code: 0 } });
  assert.equal(value.update, 'I am checking the result.');
  assert.equal(value.updatedAt, '2026-09-15T06:00:00Z');
  assert.ok((progress({ type: 'item.completed', item: { type: 'agent_message', text: 'too long '.repeat(100) } }).update?.length ?? 0) <= 240);
  assert.equal(taskProgress({ text: '{partial', truncated: true, updatedAt: null }).update, null);
});

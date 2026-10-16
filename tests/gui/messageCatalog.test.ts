import { test } from 'vitest';
import assert from 'node:assert/strict';

import { toKoreanMessage, toRetryMessage, mapTerminationReason } from '@main/messageCatalog';

test('toKoreanMessage maps known fragment', () => {
  const message = toKoreanMessage(new Error('`--auth-token` is required.'));
  assert.equal(message, '请输入 auth_token。');
});

test('toKoreanMessage returns fallback for unknown error', () => {
  const message = toKoreanMessage(new Error('unexpected unknown error'));
  assert.equal(message, '抽奖时发生错误。请检查输入后重试。');
});

test('toKoreanMessage includes counts for not-enough-participants error', () => {
  const message = toKoreanMessage(new Error('Not enough participants. requested=40, available=7'));
  assert.equal(message, '符合条件的参与者不足，请减少中奖人数。（抽取人数：40 人 / 符合条件人数：7 人）');
});

test('toKoreanMessage falls back to base not-enough message when count parsing fails', () => {
  const malformed = toKoreanMessage(new Error('Not enough participants without count details'));
  assert.equal(malformed, '符合条件的参与者不足，请减少中奖人数。');

  const invalidNumbers = toKoreanMessage(new Error('Not enough participants. requested=NaN, available=abc'));
  assert.equal(invalidNumbers, '符合条件的参与者不足，请减少中奖人数。');
});

test('toRetryMessage maps reason and falls back', () => {
  assert.equal(toRetryMessage('request-timeout'), '响应超时，正在重试。');
  assert.equal(toRetryMessage('unknown-retry'), '发生暂时性错误，正在重试。');
});

test('mapTerminationReason maps reason and falls back', () => {
  assert.equal(mapTerminationReason('cursor_cycle'), '检测到游标循环');
  assert.equal(mapTerminationReason('something-else'), '未知');
});

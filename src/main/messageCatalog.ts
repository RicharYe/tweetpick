const DEFAULT_ERROR_MESSAGE = '抽奖时发生错误。请检查输入后重试。';
const DEFAULT_RETRY_MESSAGE = '发生暂时性错误，正在重试。';
const DEFAULT_TERMINATION_REASON = '未知';

const ERROR_MESSAGE_RULES: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ['`--auth-token` is required.', '请输入 auth_token。'],
  ['`--ct0` is required.', '请输入 ct0。'],
  ['`--tweet-url` is required.', '请输入推文链接。'],
  ['`--tweet-url` must be a valid URL.', '推文链接格式不正确。'],
  ['`--tweet-url` must point to x.com or twitter.com.', '推文链接必须来自 x.com 或 twitter.com。'],
  ['Could not find `/status/{tweetId}`', '无法从推文链接中找到 status ID。'],
  ['Extracted tweetId is invalid', '推文链接中的 status ID 无效。'],
  ['Could not infer tweet author', '无法从链接中识别推文作者。'],
  ['At least one source must be selected.', '请至少选择一种参与类型。'],
  ['winners must be a positive integer', '中奖人数必须是大于或等于 1 的整数。'],
  ['minFollowers must be a non-negative integer', '最低粉丝数必须是大于或等于 0 的整数。'],
  ['Authentication failed', '身份验证失败，请检查 auth_token 和 ct0 是否有效。'],
  ['Rate limited', '已达到请求限制，请稍后重试。'],
  ['Request failed with status 404.', '找不到 X API 路径，operation id 可能已过期。'],
  ['Network error', '网络错误，请检查网络连接。'],
  ['timed out', '请求超时，请稍后重试。'],
  ['Server error', 'X 服务器出错，请稍后重试。'],
  ['GraphQL returned errors', 'X GraphQL 响应出错，请稍后重试。'],
  ['Not enough participants', '符合条件的参与者不足，请减少中奖人数。'],
  [
    'Missing required Twitter configuration',
    '缺少 Twitter 配置。请在 .env 文件中设置 TWITTER_BEARER、TWITTER_RETWEETERS_OP_ID、TWITTER_FAVORITERS_OP_ID、TWITTER_SEARCH_TIMELINE_OP_ID 和 TWITTER_TWEET_DETAIL_OP_ID。',
  ],
  ['requestTimeoutMs must be a positive integer', '内部请求配置无效。'],
]);

const RETRY_REASON_MESSAGES = Object.freeze({
  'rate-limit': '请求受限，稍候后重试。',
  timeout: '响应超时，正在重试。',
  'request-timeout': '响应超时，正在重试。',
  server: '服务器出错，正在重试。',
  'graphql-error': 'GraphQL 暂时出错，正在重试。',
  'invalid-json': '响应解析失败，正在重试。',
});

const TERMINATION_REASON_MESSAGES = Object.freeze({
  end_of_timeline: '列表末尾',
  max_pages: '已达到最大页数',
  cursor_cycle: '检测到游标循环',
  repeated_page: '检测到重复页面',
  no_growth: '收集数量未增加',
  invalid_or_empty_payload: '响应为空或数据格式不匹配',
});

type RetryReason = keyof typeof RETRY_REASON_MESSAGES;
type TerminationReason = keyof typeof TERMINATION_REASON_MESSAGES;

function hasOwnKey<T extends object>(target: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function resolveMappedMessage<T extends Record<string, string>>(map: T, key: string, fallback: string): string {
  const mapped = hasOwnKey(map, key) ? map[key] : undefined;
  return mapped ?? fallback;
}

function toNotEnoughParticipantsMessage(rawMessage: unknown): string {
  const baseMessage = '符合条件的参与者不足，请减少中奖人数。';
  const matched = String(rawMessage || '').match(/requested=(\d+)\s*,\s*available=(\d+)/i);
  if (!matched) {
    return baseMessage;
  }

  const requested = Number(matched[1]);
  const available = Number(matched[2]);
  if (!Number.isFinite(requested) || !Number.isFinite(available)) {
    return baseMessage;
  }

  return `${baseMessage}（抽取人数：${requested} 人 / 符合条件人数：${available} 人）`;
}

function toKoreanMessage(error: unknown): string {
  const raw = error && typeof error === 'object' && 'message' in error ? String(error.message || '') : '';
  if (raw.includes('Not enough participants')) {
    return toNotEnoughParticipantsMessage(raw);
  }

  const matchedRule = ERROR_MESSAGE_RULES.find(([fragment]) => raw.includes(fragment));
  return matchedRule ? matchedRule[1] : DEFAULT_ERROR_MESSAGE;
}

function toRetryMessage(reason: string): string {
  return resolveMappedMessage(RETRY_REASON_MESSAGES, reason as RetryReason, DEFAULT_RETRY_MESSAGE);
}

function mapTerminationReason(reason: string): string {
  return resolveMappedMessage(TERMINATION_REASON_MESSAGES, reason as TerminationReason, DEFAULT_TERMINATION_REASON);
}

export {
  ERROR_MESSAGE_RULES,
  RETRY_REASON_MESSAGES,
  TERMINATION_REASON_MESSAGES,
  toKoreanMessage,
  toRetryMessage,
  mapTerminationReason,
};

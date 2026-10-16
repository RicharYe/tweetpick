import type {
  DrawProgressEvent,
  DrawRunInput,
  DrawRunResponse,
  RtDrawApi,
  RtDrawResult,
  WindowStatePayload,
} from '@renderer/state/types';
import type { WindowResizeHeightResponse } from '@shared/rtDraw';

type AppElement = HTMLElement & {
  value: string;
  checked: boolean;
  open: boolean;
  disabled: boolean;
};

function requireElement(id: string): AppElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`找不到必需的界面元素：#${id}`);
  }
  return element as AppElement;
}

function requireSelector(selector: string): AppElement {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`找不到必需的界面元素：${selector}`);
  }
  return element as AppElement;
}

const elements = {
  form: requireElement('draw-form'),
  drawButton: requireElement('draw-button'),
  copyButton: requireElement('copy-button'),
  saveImageButton: requireElement('save-image-button'),
  infoButton: requireElement('link-info'),
  githubButton: requireElement('link-github'),
  twitterButton: requireElement('link-twitter'),
  menuOpenInfo: requireElement('menu-open-info'),
  menuOpenLegal: requireElement('menu-open-legal'),
  chromeMenu: requireElement('chrome-menu'),
  windowChrome: requireElement('window-chrome'),
  windowMinimize: requireElement('window-minimize'),
  windowMaximize: requireElement('window-maximize'),
  windowClose: requireElement('window-close'),
  workspace: requireSelector('.workspace'),
  inputPanel: requireSelector('.input-panel'),
  resultTableWrap: requireSelector('.result-table-wrap'),
  logBox: requireElement('log-box'),
  resultPanel: requireElement('result-panel'),
  resultEmpty: requireElement('result-empty'),
  resultContent: requireElement('result-content'),
  toggleStatsButton: requireElement('toggle-stats-button'),
  statsSection: requireElement('stats-section'),
  winnerRows: requireElement('winner-rows'),
  summaryTarget: requireElement('summary-target'),
  summaryWinners: requireElement('summary-winners'),
  summaryUnique: requireElement('summary-unique'),
  sourceStatRt: requireElement('source-stat-rt'),
  sourceStatLike: requireElement('source-stat-like'),
  sourceStatQuote: requireElement('source-stat-quote'),
  sourceStatReply: requireElement('source-stat-reply'),
  filterStatIntersection: requireElement('filter-stat-intersection'),
  filterStatAfterKeyword: requireElement('filter-stat-after-keyword'),
  filterStatAfterProfile: requireElement('filter-stat-after-profile'),
  filterStatExcludedKeyword: requireElement('filter-stat-excluded-keyword'),
  filterStatExcludedProfile: requireElement('filter-stat-excluded-profile'),
  authToken: requireElement('auth-token'),
  ct0: requireElement('ct0'),
  tweetUrl: requireElement('tweet-url'),
  winners: requireElement('winners'),
  sourceRt: requireElement('source-rt'),
  sourceLike: requireElement('source-like'),
  sourceQuote: requireElement('source-quote'),
  sourceReply: requireElement('source-reply'),
  sourceMatchAny: requireElement('source-match-any'),
  sourceMatchAll: requireElement('source-match-all'),
  filterKeyword: requireElement('filter-keyword'),
  filterRequireParticipantFollowsAuth: requireElement('filter-require-participant-follows-auth'),
  filterRequireAuthFollowsParticipant: requireElement('filter-require-auth-follows-participant'),
  filterMinFollowersEnabled: requireElement('filter-min-followers-enabled'),
  filterMinFollowers: requireElement('filter-min-followers'),
  authTokenError: requireElement('error-auth-token'),
  ct0Error: requireElement('error-ct0'),
  tweetUrlError: requireElement('error-tweet-url'),
  winnersError: requireElement('error-winners'),
  formGlobalError: requireElement('error-form-global'),
  toast: requireElement('toast'),
  toastMessage: requireElement('toast-message'),
  toastClose: requireElement('toast-close'),
};

const VALID_TWEET_HOSTS = new Set(['x.com', 'twitter.com']);
const SOCIAL_LINKS = Object.freeze({
  github: 'https://github.com/selentia/tweetpick',
  twitter: 'https://x.com/selentia01',
});
const DEFAULT_WINDOW_HEIGHT = 760;
const RESULT_PANEL_BASE_HEIGHT = 230;
const RESULT_ROW_HEIGHT = 28;
const RESULT_VISIBLE_ROWS_CAP = 10;
const RESULT_STATS_HEIGHT = 118;

const SOURCE_LABELS = Object.freeze({
  rt: '转推',
  quote: '引用',
  reply: '回复',
  like: '喜欢',
});

const UI_TEXT = Object.freeze({
  ready: '已就绪。',
  submit: '已发送抽奖请求。',
  runningButton: '正在抽奖',
  defaultButton: '开始抽奖',
  noResult: '等待抽奖。',
  copyNoResult: '没有可复制的结果。',
  copySuccess: '已复制结果文本。',
  copyFailed: '复制结果失败。',
  saveNoResult: '没有可保存的结果。',
  saveSuccess: '结果图片已保存。',
  saveFailed: '保存结果图片失败。',
  drawFailed: '抽奖失败。',
  drawError: '抽奖时发生错误。',
  invalidForm: '请检查输入内容。',
  missingBridge: '无法连接应用，请重新启动应用。',
  requiredAuthToken: '请输入 auth_token。',
  requiredCt0: '请输入 ct0。',
  requiredTweetUrl: '请输入推文链接。',
  invalidTweetUrl: '推文链接格式不正确。',
  invalidTweetHost: '推文链接必须来自 x.com 或 twitter.com。',
  invalidTweetStatus: '请输入包含 status 的推文链接。',
  invalidWinners: '中奖人数必须是大于或等于 1 的整数。',
  invalidMinFollowers: '最低粉丝数必须是大于或等于 0 的整数。',
  requiredSource: '请至少选择一种参与类型。',
  statsShow: '详细统计',
  statsHide: '收起统计',
  openLinkFailed: (label: string) => `无法打开${label}链接。`,
  done: (count: number) => `抽奖完成：${count} 人`,
  idFallback: '（无用户名）',
});

interface AppState {
  maxLogLines: number;
  latestResult: RtDrawResult | null;
  unsubscribeProgress: (() => void) | null;
  unsubscribeWindowState: (() => void) | null;
  isRunning: boolean;
  isStatsVisible: boolean;
  isWindowMaximized: boolean;
  hasAutoResizedWindow: boolean;
  toastTimer: ReturnType<typeof setTimeout> | null;
}

type Winner = RtDrawResult['drawResult']['winners'][number];
type SourceStat = RtDrawResult['sourceStats'][keyof RtDrawResult['sourceStats']];

const state: AppState = {
  maxLogLines: 220,
  latestResult: null,
  unsubscribeProgress: null,
  unsubscribeWindowState: null,
  isRunning: false,
  isStatsVisible: false,
  isWindowMaximized: false,
  hasAutoResizedWindow: false,
  toastTimer: null,
};

const FIELD_KEYS = Object.freeze(['authToken', 'ct0', 'tweetUrl', 'winners'] as const);
type FieldKey = (typeof FIELD_KEYS)[number];
const FIELD_BINDINGS = Object.freeze({
  authToken: {
    input: elements.authToken,
    error: elements.authTokenError,
  },
  ct0: {
    input: elements.ct0,
    error: elements.ct0Error,
  },
  tweetUrl: {
    input: elements.tweetUrl,
    error: elements.tweetUrlError,
  },
  winners: {
    input: elements.winners,
    error: elements.winnersError,
  },
});

function getRtDrawApi(): RtDrawApi | null {
  return window.rtDraw && typeof window.rtDraw === 'object' ? window.rtDraw : null;
}

function showToast(message: string, type: 'info' | 'error' = 'info') {
  if (!message) {
    return;
  }

  elements.toast.classList.remove('hidden', 'error');
  if (type === 'error') {
    elements.toast.classList.add('error');
  }
  elements.toastMessage.textContent = message;

  if (state.toastTimer !== null) {
    clearTimeout(state.toastTimer);
  }

  state.toastTimer = setTimeout(() => {
    hideToast();
  }, 2600);
}

function hideToast() {
  elements.toast.classList.add('hidden');
  elements.toast.classList.remove('error');
  if (state.toastTimer !== null) {
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }
}

function formatTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '0';
  }
  return parsed.toLocaleString('zh-CN');
}

function formatCount(value: unknown) {
  return `${formatNumber(value)} 人`;
}

function appendLog(message: string, type: 'info' | 'error' | 'retry' = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${formatTime()}] ${message}`;

  elements.logBox.appendChild(line);

  while (elements.logBox.childElementCount > state.maxLogLines) {
    const firstLogLine = elements.logBox.firstElementChild;
    if (!firstLogLine) {
      break;
    }
    elements.logBox.removeChild(firstLogLine);
  }

  elements.logBox.scrollTop = elements.logBox.scrollHeight;
}

function setFieldError(name: FieldKey, message: string) {
  const binding = FIELD_BINDINGS[name];
  if (!binding) {
    return;
  }

  const text = String(message || '').trim();
  const hasError = text.length > 0;
  binding.error.hidden = !hasError;
  binding.error.textContent = hasError ? text : '';
  binding.input.classList.toggle('input-error', hasError);

  if (hasError) {
    binding.input.setAttribute('aria-invalid', 'true');
    binding.input.setAttribute('aria-describedby', binding.error.id);
  } else {
    binding.input.removeAttribute('aria-invalid');
    binding.input.removeAttribute('aria-describedby');
  }
}

function setFormGlobalError(message: string) {
  const text = String(message || '').trim();
  const hasError = text.length > 0;
  elements.formGlobalError.hidden = !hasError;
  elements.formGlobalError.textContent = hasError ? text : '';
}

function clearErrors() {
  for (const key of FIELD_KEYS) {
    setFieldError(key, '');
  }
  setFormGlobalError('');
}

function validateTweetUrlValue(value: string) {
  if (!value) {
    return UI_TEXT.requiredTweetUrl;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return UI_TEXT.invalidTweetUrl;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!VALID_TWEET_HOSTS.has(host)) {
    return UI_TEXT.invalidTweetHost;
  }

  if (!/\/status\/\d+/.test(parsed.pathname)) {
    return UI_TEXT.invalidTweetStatus;
  }

  return '';
}

function parseNonNegativeInt(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isKeywordAvailableForSources(sources: { quote?: boolean; reply?: boolean } | null | undefined): boolean {
  return Boolean(sources && (sources.quote || sources.reply));
}

function syncKeywordInputState() {
  const isEnabled = isKeywordAvailableForSources({
    quote: elements.sourceQuote.checked,
    reply: elements.sourceReply.checked,
  });
  elements.filterKeyword.disabled = !isEnabled;
}

function syncMinFollowersInputState() {
  elements.filterMinFollowers.disabled = !elements.filterMinFollowersEnabled.checked;
}

type FormValidationResult = { ok: false; message: string } | { ok: true; payload: DrawRunInput };

function validateForm({ focusFirst = false }: { focusFirst?: boolean } = {}): FormValidationResult {
  clearErrors();

  const authToken = elements.authToken.value.trim();
  const ct0 = elements.ct0.value.trim();
  const tweetUrl = elements.tweetUrl.value.trim();
  const winners = Number(elements.winners.value);
  const sources = {
    rt: elements.sourceRt.checked,
    like: elements.sourceLike.checked,
    quote: elements.sourceQuote.checked,
    reply: elements.sourceReply.checked,
  };
  const sourceMatchMode = elements.sourceMatchAll.checked ? 'all' : 'any';
  const keywordEnabled = isKeywordAvailableForSources(sources);

  const filters = {
    keyword: keywordEnabled ? elements.filterKeyword.value.trim() : '',
    requireParticipantFollowsAuth: elements.filterRequireParticipantFollowsAuth.checked,
    requireAuthFollowsParticipant: elements.filterRequireAuthFollowsParticipant.checked,
    minFollowersEnabled: elements.filterMinFollowersEnabled.checked,
    minFollowers: parseNonNegativeInt(elements.filterMinFollowers.value),
  };

  const errors: Record<FieldKey, string> = {
    authToken: authToken ? '' : UI_TEXT.requiredAuthToken,
    ct0: ct0 ? '' : UI_TEXT.requiredCt0,
    tweetUrl: validateTweetUrlValue(tweetUrl),
    winners: Number.isInteger(winners) && winners > 0 ? '' : UI_TEXT.invalidWinners,
  };

  const firstErrorKey = FIELD_KEYS.find((key) => errors[key]);
  if (firstErrorKey) {
    setFieldError(firstErrorKey, errors[firstErrorKey]);
    if (focusFirst) {
      FIELD_BINDINGS[firstErrorKey].input.focus();
    }
    return {
      ok: false as const,
      message: errors[firstErrorKey],
    };
  }

  if (!sources.rt && !sources.quote && !sources.reply && !sources.like) {
    setFormGlobalError(UI_TEXT.requiredSource);
    return {
      ok: false as const,
      message: UI_TEXT.requiredSource,
    };
  }

  if (filters.minFollowersEnabled && filters.minFollowers === null) {
    setFormGlobalError(UI_TEXT.invalidMinFollowers);
    elements.filterMinFollowers.focus();
    return {
      ok: false as const,
      message: UI_TEXT.invalidMinFollowers,
    };
  }

  return {
    ok: true as const,
    payload: {
      authToken,
      ct0,
      tweetUrl,
      winners,
      sources,
      sourceMatchMode,
      filters: {
        keyword: filters.keyword,
        requireParticipantFollowsAuth: filters.requireParticipantFollowsAuth,
        requireAuthFollowsParticipant: filters.requireAuthFollowsParticipant,
        minFollowersEnabled: filters.minFollowersEnabled,
        minFollowers: filters.minFollowers === null ? 50 : filters.minFollowers,
      },
    },
  };
}

function bindFieldValidation() {
  for (const key of FIELD_KEYS) {
    const binding = FIELD_BINDINGS[key];
    binding.input.addEventListener('input', () => {
      if (binding.input.classList.contains('input-error')) {
        setFieldError(key, '');
      }
    });
  }

  const clearGlobalError = () => {
    if (!elements.formGlobalError.hidden) {
      setFormGlobalError('');
    }
  };

  elements.sourceRt.addEventListener('change', clearGlobalError);
  elements.sourceLike.addEventListener('change', clearGlobalError);
  elements.sourceQuote.addEventListener('change', () => {
    clearGlobalError();
    syncKeywordInputState();
  });
  elements.sourceReply.addEventListener('change', () => {
    clearGlobalError();
    syncKeywordInputState();
  });
  elements.filterMinFollowers.addEventListener('input', clearGlobalError);
  elements.filterRequireParticipantFollowsAuth.addEventListener('change', clearGlobalError);
  elements.filterRequireAuthFollowsParticipant.addEventListener('change', clearGlobalError);
  elements.filterMinFollowersEnabled.addEventListener('change', () => {
    clearGlobalError();
    syncMinFollowersInputState();
  });
}

function resetSummary() {
  elements.summaryTarget.textContent = '-';
  elements.summaryWinners.textContent = '-';
  elements.summaryUnique.textContent = '-';
}

function resetStats() {
  elements.sourceStatRt.textContent = '转推：-';
  elements.sourceStatLike.textContent = '喜欢：-';
  elements.sourceStatQuote.textContent = '引用：-';
  elements.sourceStatReply.textContent = '回复：-';
  elements.filterStatIntersection.textContent = '来源交集：-';
  elements.filterStatAfterKeyword.textContent = '关键词筛选后：-';
  elements.filterStatAfterProfile.textContent = '条件筛选后：-';
  elements.filterStatExcludedKeyword.textContent = '关键词排除：-';
  elements.filterStatExcludedProfile.textContent = '条件排除：-';
}

function setResultActionsEnabled(enabled: boolean): void {
  elements.copyButton.disabled = !enabled;
  elements.saveImageButton.disabled = !enabled;
}

function setResultPanelExpanded(expanded: boolean): void {
  elements.resultPanel.classList.toggle('result-has-data', expanded === true);
}

function getWinnerCountFromResult(result: RtDrawResult) {
  const winners =
    result && result.drawResult && Array.isArray(result.drawResult.winners) ? result.drawResult.winners : [];
  return winners.length;
}

function estimateResultPanelHeight(winnerCount: number, includeStats: boolean): number {
  const boundedRows = Math.max(1, Math.min(RESULT_VISIBLE_ROWS_CAP, Number(winnerCount) || 0));
  const statsHeight = includeStats ? RESULT_STATS_HEIGHT : 0;
  return RESULT_PANEL_BASE_HEIGHT + boundedRows * RESULT_ROW_HEIGHT + statsHeight;
}

function calculateDesiredWindowHeightForResult(result: RtDrawResult, includeStats: boolean) {
  const workspaceRect = elements.workspace.getBoundingClientRect();
  const inputRect = elements.inputPanel.getBoundingClientRect();
  const currentWorkspaceHeight = Math.ceil(workspaceRect.height);
  const inputPanelHeight = Math.ceil(inputRect.height);
  if (currentWorkspaceHeight <= 0 || inputPanelHeight <= 0) {
    return null;
  }

  const resultPanelHeight = estimateResultPanelHeight(getWinnerCountFromResult(result), includeStats);
  const requiredWorkspaceHeight = inputPanelHeight + 6 + resultPanelHeight;
  const extraHeight = Math.max(0, requiredWorkspaceHeight - currentWorkspaceHeight);
  if (extraHeight <= 0) {
    return null;
  }

  return Math.ceil(window.innerHeight + extraHeight);
}

async function requestWindowHeight(height: number): Promise<WindowResizeHeightResponse | null> {
  const api = getRtDrawApi();
  if (!api || typeof api.resizeWindowHeight !== 'function') {
    return null;
  }

  try {
    return await api.resizeWindowHeight(height);
  } catch {
    return null;
  }
}

function ensureWindowHeightForResult(result: RtDrawResult, includeStats = false) {
  if (state.isWindowMaximized) {
    return;
  }

  const desiredHeight = calculateDesiredWindowHeightForResult(result, includeStats);
  if (desiredHeight === null) {
    return;
  }

  void requestWindowHeight(desiredHeight).then((response) => {
    if (response && response.ok === true && response.changed === true) {
      state.hasAutoResizedWindow = true;
    }
  });
}

function restoreWindowHeightIfNeeded() {
  if (!state.hasAutoResizedWindow || state.isWindowMaximized) {
    return;
  }

  state.hasAutoResizedWindow = false;
  void requestWindowHeight(DEFAULT_WINDOW_HEIGHT);
}

function setStatsVisibility(visible: boolean): void {
  const isVisible = visible === true;
  state.isStatsVisible = isVisible;
  elements.statsSection.classList.toggle('hidden', !isVisible);
  elements.toggleStatsButton.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
  elements.toggleStatsButton.textContent = isVisible ? UI_TEXT.statsHide : UI_TEXT.statsShow;

  if (isVisible && state.latestResult) {
    ensureWindowHeightForResult(state.latestResult, true);
  }
}

function setStatsToggleEnabled(enabled: boolean): void {
  const isEnabled = enabled === true;
  elements.toggleStatsButton.disabled = !isEnabled;
  if (!isEnabled) {
    setStatsVisibility(false);
  }
}

function clearResult() {
  restoreWindowHeightIfNeeded();
  state.latestResult = null;
  elements.resultTableWrap.scrollTop = 0;
  elements.resultTableWrap.scrollLeft = 0;
  setResultPanelExpanded(false);
  setResultActionsEnabled(false);
  setStatsToggleEnabled(false);
  resetSummary();
  resetStats();
  elements.winnerRows.innerHTML = '';
  elements.resultContent.hidden = true;
  elements.resultEmpty.hidden = false;
  elements.resultEmpty.classList.remove('error');
  elements.resultEmpty.textContent = UI_TEXT.noResult;
}

function setRunning(isRunning: boolean): void {
  state.isRunning = isRunning;
  elements.drawButton.disabled = isRunning;

  const labelNode = elements.drawButton.querySelector('span:last-child');
  if (labelNode) {
    labelNode.textContent = isRunning ? UI_TEXT.runningButton : UI_TEXT.defaultButton;
  }
}

function buildWinnerIdNode(winner: Winner | null | undefined): HTMLElement {
  if (!winner || !winner.screenName) {
    const fallback = document.createElement('span');
    fallback.textContent = UI_TEXT.idFallback;
    return fallback;
  }

  const url = `https://x.com/${winner.screenName}`;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.className = 'winner-link';
  anchor.textContent = `@${winner.screenName}`;
  anchor.setAttribute('data-external-url', url);
  return anchor;
}

function renderNoWinnerRow() {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.textContent = '没有中奖者。';
  row.appendChild(cell);
  elements.winnerRows.appendChild(row);
}

function renderSourceStatLine(label: string, sourceStat: SourceStat | null | undefined): string {
  if (!sourceStat || sourceStat.selected !== true) {
    return `${label}：未选择`;
  }

  const termination = sourceStat.terminationReasonKorean || '无原因';
  return `${label}：已收集 ${formatNumber(sourceStat.totalUnique)} / 结束原因：${termination}`;
}

function renderStats(result: RtDrawResult) {
  const sourceStats = result.sourceStats;
  const filterStats = result.filterStats;

  elements.sourceStatRt.textContent = renderSourceStatLine('转推', sourceStats.rt);
  elements.sourceStatLike.textContent = renderSourceStatLine('喜欢', sourceStats.like);
  elements.sourceStatQuote.textContent = renderSourceStatLine('引用', sourceStats.quote);
  elements.sourceStatReply.textContent = renderSourceStatLine('回复', sourceStats.reply);

  elements.filterStatIntersection.textContent = `来源交集：${formatCount(filterStats.intersectionCount || 0)}`;
  elements.filterStatAfterKeyword.textContent = `关键词筛选后：${formatCount(filterStats.afterKeywordCount || 0)}`;
  elements.filterStatAfterProfile.textContent = `条件筛选后：${formatCount(filterStats.afterProfileCount || 0)}`;
  elements.filterStatExcludedKeyword.textContent = `关键词排除：${formatCount(filterStats.excludedByKeyword || 0)}`;
  elements.filterStatExcludedProfile.textContent = `条件排除：${formatCount(filterStats.excludedByProfile || 0)}`;
}

function renderResult(result: RtDrawResult) {
  state.latestResult = result;
  elements.resultTableWrap.scrollTop = 0;
  elements.resultTableWrap.scrollLeft = 0;
  setResultPanelExpanded(true);
  setResultActionsEnabled(true);
  setStatsToggleEnabled(true);
  setStatsVisibility(false);
  elements.resultEmpty.hidden = true;
  elements.resultContent.hidden = false;

  const drawResult = result.drawResult;
  const winners = drawResult.winners;
  const tweetLink = result.author && result.tweetId ? `https://x.com/${result.author}/status/${result.tweetId}` : '-';

  elements.summaryTarget.textContent = tweetLink;
  elements.summaryWinners.textContent = formatCount(result.winnersRequested || winners.length);
  elements.summaryUnique.textContent = formatCount(Number.isFinite(result.eligibleCount) ? result.eligibleCount : 0);

  renderStats(result);
  appendLog(`抽奖种子：${drawResult.seed || '-'}`, 'info');

  elements.winnerRows.innerHTML = '';
  if (winners.length === 0) {
    renderNoWinnerRow();
    ensureWindowHeightForResult(result, false);
    appendLog(UI_TEXT.done(0), 'info');
    return;
  }

  const fragment = document.createDocumentFragment();
  winners.forEach((winner, index) => {
    const row = document.createElement('tr');

    const rankCell = document.createElement('td');
    rankCell.textContent = String(index + 1);

    const idCell = document.createElement('td');
    idCell.appendChild(buildWinnerIdNode(winner));

    const nameCell = document.createElement('td');
    nameCell.textContent = (winner && winner.name) || '-';

    row.appendChild(rankCell);
    row.appendChild(idCell);
    row.appendChild(nameCell);
    fragment.appendChild(row);
  });

  elements.winnerRows.appendChild(fragment);
  ensureWindowHeightForResult(result, false);
  appendLog(UI_TEXT.done(winners.length), 'info');
}

function renderError(message: string) {
  const text = String(message || UI_TEXT.drawFailed);
  state.latestResult = null;
  setResultPanelExpanded(false);
  setResultActionsEnabled(false);
  setStatsToggleEnabled(false);
  elements.resultContent.hidden = true;
  elements.resultEmpty.hidden = false;
  elements.resultEmpty.classList.add('error');
  elements.resultEmpty.textContent = text;
  appendLog(text, 'error');
  showToast(text, 'error');
}

function applyProgress(progress: DrawProgressEvent) {
  if (!progress || typeof progress !== 'object') {
    return;
  }

  if (progress.type === 'status') {
    appendLog(progress.message || '进度已更新。', 'info');
    return;
  }

  if (progress.type === 'retry') {
    const sourceLabel = SOURCE_LABELS[progress.source] || '未知';
    const attempt = Number(progress.attempt) || 1;
    const waitSec = Math.max(1, Math.round((Number(progress.waitMs) || 0) / 1000));
    const message = progress.message || '发生暂时性错误，正在重试。';
    appendLog(`[${sourceLabel}] ${message}（第 ${attempt} 次尝试，等待 ${waitSec} 秒）`, 'retry');
    return;
  }

  if (progress.type === 'collect-source') {
    const sourceLabel = SOURCE_LABELS[progress.source] || '未知';
    const pages = Number(progress.pagesFetched) || 0;
    const total = Number(progress.totalUnique) || 0;
    const added = Number(progress.addedOnPage) || 0;
    appendLog(`[${sourceLabel}] 页数 ${pages} | 去重后 ${formatNumber(total)} | 本次新增 +${formatNumber(added)}`, 'info');
  }
}

function buildCopyText(result: RtDrawResult) {
  const drawResult = result.drawResult;
  const winners = drawResult.winners;
  const tweetLink = result.author && result.tweetId ? `https://x.com/${result.author}/status/${result.tweetId}` : '-';

  const lines = [];
  lines.push('=== 转推抽奖结果 ===');
  lines.push(`目标推文：${tweetLink}`);
  lines.push(`中奖人数：${formatCount(result.winnersRequested || winners.length)}`);
  lines.push(`参与者：${formatCount(Number.isFinite(result.eligibleCount) ? result.eligibleCount : 0)}`);
  lines.push('');
  lines.push('中奖名单');

  if (winners.length === 0) {
    lines.push('- 无');
    return lines.join('\n');
  }

  winners.forEach((winner, index) => {
    const idText = winner && winner.screenName ? `@${winner.screenName}` : UI_TEXT.idFallback;
    const nickname = winner && winner.name ? winner.name : '-';
    lines.push(`${index + 1}. ${idText} | ${nickname}`);
  });

  return lines.join('\n');
}

function copyWithTextareaFallback(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  return success;
}

async function copyResult() {
  if (!state.latestResult) {
    appendLog(UI_TEXT.copyNoResult, 'error');
    showToast(UI_TEXT.copyNoResult, 'error');
    return;
  }

  const text = buildCopyText(state.latestResult);
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
    } else {
      const copied = copyWithTextareaFallback(text);
      if (!copied) {
        throw new Error('复制失败');
      }
    }
    appendLog(UI_TEXT.copySuccess, 'info');
    showToast(UI_TEXT.copySuccess, 'info');
  } catch {
    appendLog(UI_TEXT.copyFailed, 'error');
    showToast(UI_TEXT.copyFailed, 'error');
  }
}

async function saveResultImage() {
  const api = getRtDrawApi();
  if (!api || typeof api.saveResultImage !== 'function') {
    renderError(UI_TEXT.missingBridge);
    return;
  }

  if (!state.latestResult) {
    appendLog(UI_TEXT.saveNoResult, 'error');
    showToast(UI_TEXT.saveNoResult, 'error');
    return;
  }

  try {
    const response = await api.saveResultImage({
      result: state.latestResult,
    });
    if (response && response.ok) {
      appendLog(response.path ? `${UI_TEXT.saveSuccess} (${response.path})` : UI_TEXT.saveSuccess, 'info');
      showToast(UI_TEXT.saveSuccess, 'info');
      return;
    }

    if (response && response.canceled) {
      return;
    }

    const message = (response && response.message) || UI_TEXT.saveFailed;
    appendLog(message, 'error');
    showToast(message, 'error');
  } catch {
    appendLog(UI_TEXT.saveFailed, 'error');
    showToast(UI_TEXT.saveFailed, 'error');
  }
}

async function openExternalUrl(url: string, label: string): Promise<void> {
  const api = getRtDrawApi();
  if (!api || typeof api.openExternal !== 'function') {
    renderError(UI_TEXT.missingBridge);
    return;
  }

  try {
    const ok = await api.openExternal(url);
    if (!ok) {
      const message = UI_TEXT.openLinkFailed(label);
      appendLog(message, 'error');
      showToast(message, 'error');
    }
  } catch {
    const message = UI_TEXT.openLinkFailed(label);
    appendLog(message, 'error');
    showToast(message, 'error');
  }
}

async function openInfoPage() {
  const api = getRtDrawApi();
  if (!api || typeof api.openInfoPage !== 'function') {
    renderError(UI_TEXT.missingBridge);
    return;
  }

  try {
    const ok = await api.openInfoPage();
    if (!ok) {
      appendLog('无法打开说明窗口。', 'error');
      showToast('无法打开说明窗口。', 'error');
    }
  } catch {
    appendLog('无法打开说明窗口。', 'error');
    showToast('无法打开说明窗口。', 'error');
  }
}

async function openLegalPage() {
  const api = getRtDrawApi();
  if (!api || typeof api.openLegalPage !== 'function') {
    renderError(UI_TEXT.missingBridge);
    return;
  }

  try {
    const ok = await api.openLegalPage();
    if (!ok) {
      appendLog('无法打开许可证窗口。', 'error');
      showToast('无法打开许可证窗口。', 'error');
    }
  } catch {
    appendLog('无法打开许可证窗口。', 'error');
    showToast('无法打开许可证窗口。', 'error');
  }
}

async function handleWinnerLinkClick(event: MouseEvent): Promise<void> {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const link = target.closest('a[data-external-url]');
  if (!link) {
    return;
  }

  event.preventDefault();
  const url = link.getAttribute('data-external-url');
  if (!url) {
    return;
  }

  await openExternalUrl(url, 'X');
}

function createWindowControlIcon(type: 'maximize' | 'restore'): string {
  if (type === 'maximize') {
    return [
      '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">',
      '<rect x="3.5" y="3.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4"/>',
      '</svg>',
    ].join('');
  }

  return [
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">',
    '<rect x="5.2" y="3.5" width="7.3" height="7.3" fill="none" stroke="currentColor" stroke-width="1.3"/>',
    '<path d="M3.5 5.3V12.5H10.7" fill="none" stroke="currentColor" stroke-width="1.3"/>',
    '</svg>',
  ].join('');
}

function applyWindowState(payload: WindowStatePayload | null | undefined): void {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const isCustomChrome = payload.isCustomChrome !== false;
  if (!isCustomChrome) {
    elements.windowChrome.classList.add('hidden');
    return;
  }
  elements.windowChrome.classList.remove('hidden');

  const isMaximized = payload.isMaximized === true;
  state.isWindowMaximized = isMaximized;
  elements.windowChrome.classList.toggle('window-chrome-maximized', isMaximized);
  elements.windowMaximize.dataset.tooltip = isMaximized ? '还原' : '最大化';
  elements.windowMaximize.setAttribute('aria-label', isMaximized ? '还原' : '最大化');
  elements.windowMaximize.innerHTML = createWindowControlIcon(isMaximized ? 'restore' : 'maximize');
}

async function syncWindowState() {
  const api = getRtDrawApi();
  if (!api || typeof api.getWindowState !== 'function') {
    elements.windowChrome.classList.add('hidden');
    return;
  }

  try {
    const response = await api.getWindowState();
    if (response && response.ok && response.state) {
      applyWindowState(response.state);
      return;
    }
  } catch {
    return;
  }
}

function bindWindowControlButtons() {
  const api = getRtDrawApi();
  if (!api) {
    elements.windowChrome.classList.add('hidden');
    return;
  }

  elements.windowMinimize.addEventListener('click', async () => {
    if (typeof api.minimizeWindow === 'function') {
      await api.minimizeWindow();
    }
  });

  elements.windowMaximize.addEventListener('click', async () => {
    if (typeof api.toggleMaximizeWindow === 'function') {
      await api.toggleMaximizeWindow();
    }
  });

  elements.windowClose.addEventListener('click', async () => {
    if (typeof api.closeWindow === 'function') {
      await api.closeWindow();
    }
  });

  if (typeof api.onWindowState === 'function') {
    state.unsubscribeWindowState = api.onWindowState((payload) => {
      applyWindowState(payload);
    });
  }
}

function bindChromeMenuDismiss() {
  const closeMenu = () => {
    if (elements.chromeMenu.open) {
      elements.chromeMenu.open = false;
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('.chrome-menu')) {
      return;
    }
    closeMenu();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
  });
}

async function handleSubmit(event: Event) {
  event.preventDefault();

  if (state.isRunning) {
    return;
  }

  const api = getRtDrawApi();
  if (!api || typeof api.runDraw !== 'function') {
    renderError(UI_TEXT.missingBridge);
    return;
  }

  const parsed = validateForm({ focusFirst: true });
  if (parsed.ok === false) {
    appendLog(parsed.message || UI_TEXT.invalidForm, 'error');
    return;
  }

  hideToast();
  setRunning(true);
  clearResult();
  appendLog(UI_TEXT.submit, 'info');

  try {
    const response: DrawRunResponse = await api.runDraw(parsed.payload);
    if (response.ok !== true) {
      const message = response.error?.message || UI_TEXT.drawFailed;
      renderError(message);
      return;
    }
    renderResult(response.result);
  } catch {
    renderError(UI_TEXT.drawError);
  } finally {
    setRunning(false);
  }
}

function wireButtons() {
  elements.form.addEventListener('submit', (event: SubmitEvent) => {
    void handleSubmit(event);
  });

  elements.copyButton.addEventListener('click', () => {
    void copyResult();
  });

  elements.saveImageButton.addEventListener('click', () => {
    void saveResultImage();
  });

  elements.infoButton.addEventListener('click', () => {
    void openInfoPage();
  });

  elements.menuOpenInfo.addEventListener('click', () => {
    elements.chromeMenu.open = false;
    void openInfoPage();
  });

  elements.menuOpenLegal.addEventListener('click', () => {
    elements.chromeMenu.open = false;
    void openLegalPage();
  });

  elements.githubButton.addEventListener('click', () => {
    void openExternalUrl(SOCIAL_LINKS.github, 'GitHub');
  });

  elements.twitterButton.addEventListener('click', () => {
    void openExternalUrl(SOCIAL_LINKS.twitter, 'X');
  });

  elements.winnerRows.addEventListener('click', (event: MouseEvent) => {
    void handleWinnerLinkClick(event);
  });

  elements.toggleStatsButton.addEventListener('click', () => {
    if (elements.toggleStatsButton.disabled) {
      return;
    }
    setStatsVisibility(!state.isStatsVisible);
  });

  elements.toastClose.addEventListener('click', hideToast);
}

function cleanup() {
  if (typeof state.unsubscribeProgress === 'function') {
    state.unsubscribeProgress();
    state.unsubscribeProgress = null;
  }

  if (typeof state.unsubscribeWindowState === 'function') {
    state.unsubscribeWindowState();
    state.unsubscribeWindowState = null;
  }
  hideToast();
}

async function init() {
  clearErrors();
  clearResult();
  appendLog(UI_TEXT.ready, 'info');

  bindFieldValidation();
  syncKeywordInputState();
  syncMinFollowersInputState();
  wireButtons();
  bindChromeMenuDismiss();
  bindWindowControlButtons();
  await syncWindowState();

  const api = getRtDrawApi();
  if (!api || typeof api.onProgress !== 'function') {
    renderError(UI_TEXT.missingBridge);
    return;
  }

  state.unsubscribeProgress = api.onProgress((payload) => {
    applyProgress(payload);
  });

  window.addEventListener('beforeunload', cleanup);
}

void init();

export {};

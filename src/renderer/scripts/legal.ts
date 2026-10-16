import type { RtDrawApi } from '@renderer/state/types';

function getRtDrawApi(): RtDrawApi | null {
  return window.rtDraw && typeof window.rtDraw === 'object' ? window.rtDraw : null;
}

function bindCloseButton() {
  const closeButton = document.getElementById('close-legal');
  if (!(closeButton instanceof HTMLButtonElement)) {
    return;
  }

  closeButton.addEventListener('click', () => {
    const api = getRtDrawApi();
    if (api && typeof api.closeWindow === 'function') {
      void api.closeWindow();
      return;
    }

    window.close();
  });
}

async function syncLegalDocuments() {
  const noticeTarget = document.getElementById('legal-notice');
  const licenseTarget = document.getElementById('legal-license');
  if (!noticeTarget || !licenseTarget) {
    return;
  }

  const setFallback = (message: string) => {
    noticeTarget.textContent = message;
    licenseTarget.textContent = message;
  };

  const api = getRtDrawApi();
  if (!api || typeof api.getLegalDocuments !== 'function') {
    setFallback('无法加载许可证文档。');
    return;
  }

  try {
    const result = await api.getLegalDocuments();
    if (!result || result.ok !== true) {
      setFallback((result && result.message) || '无法加载许可证文档。');
      return;
    }

    noticeTarget.textContent = result.notice || '';
    licenseTarget.textContent = result.license || '';
  } catch {
    setFallback('无法加载许可证文档。');
  }
}

async function initLegalPage() {
  bindCloseButton();
  await syncLegalDocuments();
}

void initLegalPage();

export {};

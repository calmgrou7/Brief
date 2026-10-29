/** claude.ai 미리보기 같은 iframe 안이면 인쇄·파일 저장이 막힌다 */
export const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

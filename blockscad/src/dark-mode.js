// Dark mode functionality
// Extracted from blockscad.js lines ~1083-1129

const B = window.Blockscad;

export function toggleDarkMode() {
  B.isDarkMode = !B.isDarkMode;
  applyDarkMode(B.isDarkMode);
  localStorage.setItem('blockscadDarkMode', B.isDarkMode ? '1' : '0');
}

export function applyDarkMode(enabled) {
  B.isDarkMode = enabled;
  if (enabled) {
    document.body.classList.add('dark-mode');
    if (B.gProcessor && B.gProcessor.viewer) {
      B.gProcessor.viewer.gl.clearColor(0.12, 0.12, 0.12, 1);
      B.gProcessor.viewer.onDraw();
    }
    if (B.gProcessor && B.gProcessor.picviewer) {
      B.gProcessor.picviewer.gl.clearColor(0.12, 0.12, 0.12, 1);
    }
    if (B.gProcessor && B.gProcessor.rpicviewer) {
      B.gProcessor.rpicviewer.gl.clearColor(0.12, 0.12, 0.12, 1);
    }
  } else {
    document.body.classList.remove('dark-mode');
    if (B.gProcessor && B.gProcessor.viewer) {
      B.gProcessor.viewer.gl.clearColor(1, 1, 1, 1);
      B.gProcessor.viewer.onDraw();
    }
    if (B.gProcessor && B.gProcessor.picviewer) {
      B.gProcessor.picviewer.gl.clearColor(1, 1, 1, 1);
    }
    if (B.gProcessor && B.gProcessor.rpicviewer) {
      B.gProcessor.rpicviewer.gl.clearColor(1, 1, 1, 1);
    }
  }
}

export function initDarkMode() {
  var savedPref = localStorage.getItem('blockscadDarkMode');
  if (savedPref === '1') {
    applyDarkMode(true);
  }
}

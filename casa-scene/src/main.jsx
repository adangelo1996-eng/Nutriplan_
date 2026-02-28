/**
 * NutriPlan Casa Scene — mount function for vanilla JS app
 * Build: npm run build → outputs dist/casa-scene.iife.js
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CasaScene } from './CasaScene';

/** Mounts the 3D Casa scene into the given container. Returns unmount function. */
function mountCasaScene(container, options = {}) {
  if (!container) return () => {};
  const root = createRoot(container);
  root.render(
    React.createElement(CasaScene, {
      suggestedMeal: options.suggestedMeal || null,
      suggestedLabel: options.suggestedLabel || 'Riepilogo',
      msg: options.msg || '',
      subMsg: options.subMsg || '',
      userName: options.userName || '',
      onVaiOggi: options.onVaiOggi || (() => {}),
    })
  );
  return () => root.unmount();
}

// Expose to window for the main app
if (typeof window !== 'undefined') {
  window.mountCasaScene = mountCasaScene;
}

export { mountCasaScene };
export default mountCasaScene;

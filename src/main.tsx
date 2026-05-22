import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely suppress benign cross-origin script errors or third-party iframe issues (Clarity, Disqus cookies)
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message).toLowerCase();
    if (
      msg.includes('script error') ||
      msg.includes('disqus') ||
      msg.includes('clarity') ||
      msg.includes('securityerror') ||
      msg.includes('blocked')
    ) {
      console.info('Filtered third-party script/CORS error:', message, source);
      return true; // Suppress from showing in browser overlay/tool alerts
    }
    if (originalOnError) {
      return originalOnError.apply(window, [message, source, lineno, colno, error]);
    }
    return false;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


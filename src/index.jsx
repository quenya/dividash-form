import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css';

// 브라우저 확장 프로그램 및 비동기 에러 완전 억제
const suppressError = (errorMessage) => {
  const suppressPatterns = [
    'message channel closed',
    'listener indicated an asynchronous response',
    'Extension context invalidated',
    'Could not establish connection',
    'chrome-extension://',
    'moz-extension://'
  ];
  
  return suppressPatterns.some(pattern => 
    errorMessage && errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
};

window.addEventListener('error', (event) => {
  if (event.error && event.error.message && suppressError(event.error.message)) {
    console.warn('브라우저 확장 프로그램 에러 억제:', event.error.message);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  if (suppressError(errorMessage)) {
    console.warn('비동기 에러 억제:', errorMessage);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// 콘솔 에러도 필터링
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  if (!suppressError(message)) {
    originalConsoleError.apply(console, args);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

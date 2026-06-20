const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  focusWindow: () => ipcRenderer.send('focus-window'),
  saveSession: (sessionData) => ipcRenderer.send('save-session', sessionData),
  clearSession: () => ipcRenderer.send('clear-session'),
  getSession: () => ipcRenderer.invoke('get-session'),
  showNotification: (title, options) => ipcRenderer.send('show-notification', title, options),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  startUpdate: (downloadUrl) => ipcRenderer.invoke('start-update', downloadUrl),
  updateBadge: (count, dataUrl) => ipcRenderer.send('update-badge', count, dataUrl),
  onWindowFocusChange: (callback) => {
    const subscription = (event, isFocused) => callback(isFocused);
    ipcRenderer.on('window-focus-change', subscription);
    return () => ipcRenderer.removeListener('window-focus-change', subscription);
  },
  onUpdateProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('update-progress', subscription);
    return () => ipcRenderer.removeListener('update-progress', subscription);
  }
});

ipcRenderer.on('navigate-to-url', (event, url) => {
  if (url) {
    if (url.startsWith('/chat')) {
      try {
        const u = new URL(url, window.location.origin);
        const chatId = u.searchParams.get('chatId');
        const chatType = u.searchParams.get('chatType');
        if (chatId) {
          localStorage.setItem('selectedChatIdOnMount', chatId);
        }
        if (chatType) {
          localStorage.setItem('selectedChatTypeOnMount', chatType);
        }
        
        if (window.location.pathname === '/chat') {
          window.dispatchEvent(new Event('chat-notification-click'));
          return;
        }
      } catch (e) {
        console.error('Error parsing navigate-to-url query params:', e);
      }
    }
    window.location.href = url;
  }
});

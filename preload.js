const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  focusWindow: () => ipcRenderer.send('focus-window'),
  saveSession: (sessionData) => ipcRenderer.send('save-session', sessionData),
  clearSession: () => ipcRenderer.send('clear-session'),
  getSession: () => ipcRenderer.invoke('get-session'),
  showNotification: (title, options) => ipcRenderer.send('show-notification', title, options)
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

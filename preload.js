const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  focusWindow: () => ipcRenderer.send('focus-window'),
  saveSession: (sessionData) => ipcRenderer.send('save-session', sessionData),
  clearSession: () => ipcRenderer.send('clear-session'),
  getSession: () => ipcRenderer.invoke('get-session')
});

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  search: (q) => ipcRenderer.invoke('search', q),
  resolveAudio: (id) => ipcRenderer.invoke('resolveAudio', id),
  recommend: (id) => ipcRenderer.invoke('recommend', id)
})
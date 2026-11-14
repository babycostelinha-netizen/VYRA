const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vyra", {
  loadProjects: () => ipcRenderer.invoke("projects:load"),
  saveProjects: (projects) => ipcRenderer.invoke("projects:save", projects),
  importMedia: () => ipcRenderer.invoke("media:import"),
  getMediaUrl: (filePath) => ipcRenderer.invoke("media:url", filePath),
  isDesktop: true
});
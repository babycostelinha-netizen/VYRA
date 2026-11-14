const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vyra", {
  loadProjects: () => ipcRenderer.invoke("projects:load"),
  saveProjects: (projects) => ipcRenderer.invoke("projects:save", projects),
  importMedia: () => ipcRenderer.invoke("media:import"),
  getMediaUrl: (filePath) => ipcRenderer.invoke("media:url", filePath),
  selectWhisperExecutable: () => ipcRenderer.invoke("whisper:select-executable"),
  selectWhisperModel: () => ipcRenderer.invoke("whisper:select-model"),
  transcribeAudio: (inputPath, executablePath, modelPath) => ipcRenderer.invoke("whisper:transcribe", inputPath, executablePath, modelPath),
  isDesktop: true
});
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");

const isDev = !app.isPackaged;
let mainWindow;

function dataFile() {
  return path.join(app.getPath("userData"), "projects.json");
}

async function readProjects() {
  try {
    return JSON.parse(await fs.readFile(dataFile(), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeProjects(projects) {
  await fs.mkdir(path.dirname(dataFile()), { recursive: true });
  const temp = dataFile() + ".tmp";
  await fs.writeFile(temp, JSON.stringify(projects, null, 2), "utf8");
  await fs.rename(temp, dataFile());
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: "#090c09",
    title: "VYRA Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) mainWindow.loadURL("http://127.0.0.1:5173");
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("projects:load", readProjects);
  ipcMain.handle("projects:save", (_event, projects) => writeProjects(projects));
  ipcMain.handle("media:import", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import media",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Media", extensions: ["mp4", "mov", "m4v", "webm", "mp3", "wav", "m4a", "aac", "png", "jpg", "jpeg"] },
        { name: "All files", extensions: ["*"] }
      ]
    });
    if (result.canceled) return [];
    return result.filePaths.map((filePath) => ({
      id: randomUUID(),
      name: path.basename(filePath),
      path: filePath,
      kind: /\.(mp3|wav|m4a|aac)$/i.test(filePath) ? "audio" :
        /\.(png|jpe?g)$/i.test(filePath) ? "image" : "video"
    }));
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
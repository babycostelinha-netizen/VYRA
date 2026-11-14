const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const { spawn } = require("node:child_process");

protocol.registerSchemesAsPrivileged([{
  scheme: "vyra-media",
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
}]);

const isDev = !app.isPackaged;
const mediaUrlTokens = new Map();
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
  protocol.handle("vyra-media", async (request) => {
    const token = new URL(request.url).pathname.slice(1);
    const filePath = mediaUrlTokens.get(token);
    if (!filePath) return new Response("Media not found", { status: 404 });
    try {
      return await net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers });
    } catch {
      return new Response("Unable to read media", { status: 404 });
    }
  });

  ipcMain.handle("projects:load", readProjects);
  ipcMain.handle("projects:save", (_event, projects) => writeProjects(projects));
  ipcMain.handle("media:url", async (_event, filePath) => {
    if (typeof filePath !== "string" || !path.isAbsolute(filePath)) {
      throw new Error("Invalid media path");
    }
    const resolvedPath = path.resolve(filePath);
    const stat = await fs.stat(resolvedPath);
    if (!stat.isFile()) throw new Error("Media path is not a file");
    const token = randomUUID();
    mediaUrlTokens.set(token, resolvedPath);
    return `vyra-media://asset/${token}`;
  });
  ipcMain.handle("whisper:select-executable", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select whisper.cpp executable",
      properties: ["openFile"],
      filters: [{ name: "Whisper executable", extensions: ["exe"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("whisper:select-model", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select a Whisper model",
      properties: ["openFile"],
      filters: [{ name: "Whisper model", extensions: ["bin"] }, { name: "All files", extensions: ["*"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("whisper:transcribe", async (_event, inputPath, executablePath, modelPath) => {
    for (const candidate of [inputPath, executablePath, modelPath]) {
      if (typeof candidate !== "string" || !path.isAbsolute(candidate)) throw new Error("Invalid file path");
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) throw new Error("Selected path is not a file");
    }
    const audioExtension = path.extname(inputPath).toLowerCase();
    if (![".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"].includes(audioExtension)) {
      throw new Error("Unsupported audio format. Use MP3, WAV, M4A, AAC, FLAC or OGG.");
    }
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vyra-whisper-"));
    const outputBase = path.join(tempDir, "captions");
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(executablePath, ["-m", modelPath, "-f", inputPath, "-osrt", "-of", outputBase, "-l", "auto"], { windowsHide: true });
        let stderr = "";
        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) { settled = true; child.kill(); reject(new Error("Whisper timed out after 30 minutes")); }
        }, 30 * 60 * 1000);
        child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
        child.on("error", (error) => {
          if (settled) return;
          settled = true; clearTimeout(timeout);
          reject(new Error("Could not start whisper.cpp: " + error.message));
        });
        child.on("close", (code) => {
          if (settled) return;
          settled = true; clearTimeout(timeout);
          if (code === 0) resolve();
          else reject(new Error(stderr.trim().slice(-1200) || "whisper.cpp exited with code " + code));
        });
      });
      const srt = await fs.readFile(outputBase + ".srt", "utf8");
      return srt;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
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
      kind: [".mp3", ".wav", ".m4a", ".aac"].includes(path.extname(filePath).toLowerCase()) ? "audio" :
        [".png", ".jpg", ".jpeg"].includes(path.extname(filePath).toLowerCase()) ? "image" : "video"
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
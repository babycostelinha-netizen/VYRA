# VYRA Studio

**Create your moment.** A next-generation video editing studio built for football creators.

VYRA is a Windows-first desktop editor with a simple-to-pro workflow: start with a clean project, organize your footage, build a timeline, and grow into advanced editing tools.

## Product direction

- **Platform:** Windows desktop (Electron)
- **Interface:** React + TypeScript + Vite
- **Visual identity:** Void black, graphite panels, neon green
- **Languages:** English and Brazilian Portuguese
- **Audience:** Football editors and short-form video creators

## Current foundation (0.1.0 Alpha)

- [x] Electron desktop shell with context isolation and a minimal preload bridge
- [x] Neon-green dark interface and app navigation
- [x] Create projects and persist project metadata in the local app data directory
- [x] Import local video, audio and image files through the native Windows file picker
- [x] Add imported assets to a starter multi-track timeline
- [x] Select clips and edit their start, duration and track properties
- [x] English / Portuguese interface toggle
- [ ] Non-linear playback engine and frame-accurate timeline
- [ ] Real media trimming, transitions and audio mixing
- [ ] MP4 rendering/export pipeline
- [ ] AI football moment detection and Beat Intelligence

The current timeline is an interactive project-organizing foundation. It is **not yet** a frame-accurate non-linear editor, and the Export button is intentionally marked as a future integration rather than pretending to render a finished video.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- Windows 10/11 for packaged desktop builds

## Run locally

```bash
npm install
npm run dev
```

## Build the renderer

```bash
npm run build
```

## Package for Windows

```bash
npm run dist
```

The installer output is written to `release/`. Windows packaging must be performed on Windows (or a compatible CI runner).

## Security notes

- Renderer Node integration is disabled.
- Context isolation and sandboxing are enabled.
- The renderer can access only the explicit operations exposed by `electron/preload.cjs`.
- Projects are stored in Electron's app-specific user data folder.
- Media is referenced from its original local path; source files are not copied or uploaded.

## Roadmap

1. Stabilize project and media workflows.
2. Implement a playback-aware timeline and trim/split tools.
3. Add reliable audio controls and MP4 export.
4. Build Quick Edit and Pro Studio modes over the same project format.
5. Introduce football-specific AI tools after the core editor is dependable.

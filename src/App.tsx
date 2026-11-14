import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, AudioLines, Bell, Check, ChevronDown,
  Clapperboard, Film, FolderOpen, FolderPlus, Grid2X2, HardDrive, Home,
  Layers3, MoreHorizontal, Music2,
  Play, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Upload,
  Video, WandSparkles, X, Zap
} from "lucide-react";
import type { MediaAsset, TimelineClip, VyraProject } from "./types";
import { analyzeAudioBeats, type BeatAnalysis } from "./lib/beatDetection";

type Page = "home" | "editor" | "assets" | "ai" | "settings";
const copy = {
  en: {
    workspace: "WORKSPACE", home: "Home", projects: "My projects", assets: "Media library",
    create: "Create project", recent: "RECENT PROJECTS", all: "View all", welcome: "Make every frame count.",
    subtitle: "Your football edit starts here. Bring your footage, find the moment, make it yours.",
    newProject: "New project", import: "Import media", quickStart: "QUICK START", startBlank: "Start from scratch",
    startBlankSub: "A clean timeline, ready for your next idea.", open: "Open project", noProjects: "Your next big edit starts here.",
    noProjectsSub: "Create a project to organize footage, music and edits in one place.",
    editor: "Editor", timeline: "TIMELINE", media: "MEDIA", preview: "PREVIEW", properties: "PROPERTIES",
    importFirst: "Import footage to get started", importHint: "Video, audio and image files are supported.",
    play: "Play", pause: "Pause", save: "Saved locally", projectName: "Project name", cancel: "Cancel",
    createNow: "Create project", renameHint: "Give your project a name", assetsTitle: "Your media library",
    assetsSub: "All imported files, ready for your next edit.", search: "Search projects or media...",
    noAssets: "No media imported yet", importFiles: "Import files", aiTitle: "Your creative co-pilot.",
    aiSub: "VYRA AI will help you find the perfect moment, sync your cuts and shape your story.",
    comingSoon: "COMING IN A FUTURE UPDATE", settings: "Settings", general: "GENERAL", language: "Language",
    languageSub: "Choose the interface language.", appearance: "Appearance", appearanceSub: "VYRA dark mode is always on.",
    version: "Version", desktopReady: "DESKTOP WORKSPACE", localStorage: "LOCAL PROJECTS", duration: "Duration",
    tracks: "Tracks", noSelection: "Select a clip to inspect its properties.", selectClip: "Selected clip",
    remove: "Remove clip", addTrack: "Add track", export: "Export", welcomeBack: "Welcome back",
    allProjects: "All projects", minutesAgo: "Just now", emptyTrack: "Drop media here"
  },
  pt: {
    workspace: "ESPAÇO DE TRABALHO", home: "Início", projects: "Meus projetos", assets: "Biblioteca de mídia",
    create: "Criar projeto", recent: "PROJETOS RECENTES", all: "Ver todos", welcome: "Cada frame conta.",
    subtitle: "Sua próxima edit de futebol começa aqui. Traga seus vídeos, encontre o momento e crie.",
    newProject: "Novo projeto", import: "Importar mídia", quickStart: "COMECE AGORA", startBlank: "Começar do zero",
    startBlankSub: "Uma timeline limpa, pronta para sua próxima ideia.", open: "Abrir projeto", noProjects: "Sua próxima grande edit começa aqui.",
    noProjectsSub: "Crie um projeto para organizar vídeos, músicas e edições em um só lugar.",
    editor: "Editor", timeline: "TIMELINE", media: "MÍDIA", preview: "PRÉVIA", properties: "PROPRIEDADES",
    importFirst: "Importe arquivos para começar", importHint: "Aceitamos vídeos, áudios e imagens.",
    play: "Reproduzir", pause: "Pausar", save: "Salvo localmente", projectName: "Nome do projeto", cancel: "Cancelar",
    createNow: "Criar projeto", renameHint: "Dê um nome ao seu projeto", assetsTitle: "Sua biblioteca de mídia",
    assetsSub: "Todos os arquivos importados, prontos para sua próxima edição.", search: "Buscar projetos ou mídia...",
    noAssets: "Nenhuma mídia importada", importFiles: "Importar arquivos", aiTitle: "Seu copiloto criativo.",
    aiSub: "A VYRA AI vai ajudar a encontrar o momento perfeito, sincronizar cortes e construir sua história.",
    comingSoon: "EM UMA PRÓXIMA ATUALIZAÇÃO", settings: "Configurações", general: "GERAL", language: "Idioma",
    languageSub: "Escolha o idioma da interface.", appearance: "Aparência", appearanceSub: "O modo escuro do VYRA está sempre ativo.",
    version: "Versão", desktopReady: "ESPAÇO DESKTOP", localStorage: "PROJETOS LOCAIS", duration: "Duração",
    tracks: "Faixas", noSelection: "Selecione um clipe para ver suas propriedades.", selectClip: "Clipe selecionado",
    remove: "Remover clipe", addTrack: "Adicionar faixa", export: "Exportar", welcomeBack: "Bem-vindo de volta",
    allProjects: "Todos os projetos", minutesAgo: "Agora mesmo", emptyTrack: "Solte a mídia aqui"
  }
};

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const makeProject = (name: string): VyraProject => {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: name.trim() || "Untitled edit", createdAt: now, updatedAt: now, clips: [], assets: [] };
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [language, setLanguage] = useState<"en" | "pt">("en");
  const [projects, setProjects] = useState<VyraProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [beatAnalysis, setBeatAnalysis] = useState<BeatAnalysis | null>(null);
  const [analyzingAudio, setAnalyzingAudio] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const t = copy[language];
  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const allAssets = useMemo(() => projects.flatMap((p) => p.assets), [projects]);
  const activeClip = activeProject?.clips.find((c) => c.id === selectedClip) ?? null;

  useEffect(() => {
    if (!window.vyra) { setProjectsLoaded(true); return; }
    window.vyra.loadProjects().then((saved) => { setProjects(saved); setProjectsLoaded(true); }).catch(() => { setToast("Could not load local projects"); setProjectsLoaded(true); });
  }, []);

  useEffect(() => {
    if (projectsLoaded && window.vyra) window.vyra.saveProjects(projects).catch(() => setToast("Could not save projects"));
  }, [projects, projectsLoaded]);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl("");
    setPlaying(false);
    if (!activeClip || activeClip.kind !== "video" || !window.vyra) return;
    window.vyra.getMediaUrl(activeClip.path)
      .then((url) => { if (!cancelled) setPreviewUrl(url); })
      .catch(() => { if (!cancelled) setToast("Could not open this video file"); });
    return () => { cancelled = true; };
  }, [activeClip?.id, activeClip?.path]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    if (playing) player.play().catch(() => setPlaying(false));
    else player.pause();
  }, [playing, selectedClip, previewUrl]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const updateProject = (projectId: string, updater: (project: VyraProject) => VyraProject) => {
    setProjects((current) => current.map((p) => p.id === projectId ? updater({ ...p }) : p));
  };

  const createProject = () => {
    const project = makeProject(projectName);
    setProjects((current) => [project, ...current]);
    setProjectName("");
    setShowCreate(false);
    setActiveId(project.id);
    setPage("editor");
  };

  const openProject = (id: string) => {
    setActiveId(id);
    setSelectedClip(null);
    setPage("editor");
  };

  const importMedia = async () => {
    if (!activeProject) {
      setToast("Create or open a project before importing media");
      return;
    }
    if (!window.vyra) {
      setToast("Media import is available in the Windows desktop app");
      return;
    }
    try {
      const imported = await window.vyra.importMedia();
      if (!imported.length) return;
      updateProject(activeProject.id, (p) => ({
        ...p, assets: [...p.assets, ...imported], updatedAt: new Date().toISOString()
      }));
      setToast(`${imported.length} file(s) imported`);
    } catch {
      setToast("Import failed. Please try again.");
    }
  };

  const addToTimeline = (asset: MediaAsset) => {
    if (!activeProject) return;
    const clip: TimelineClip = { ...asset, start: activeProject.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0), duration: 5, track: asset.kind === "audio" ? 1 : 0 };
    updateProject(activeProject.id, (p) => ({ ...p, clips: [...p.clips, clip], updatedAt: new Date().toISOString() }));
    setSelectedClip(clip.id);
  };

  const removeClip = () => {
    if (!activeProject || !selectedClip) return;
    updateProject(activeProject.id, (p) => ({ ...p, clips: p.clips.filter((c) => c.id !== selectedClip) }));
    setSelectedClip(null);
  };

  const navigate = (target: Page) => setPage(target);
  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const filteredAssets = allAssets.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  const audioAssets = allAssets.filter((asset) => asset.kind === "audio");

  const runBeatAnalysis = async () => {
    const asset = audioAssets.find((item) => item.id === selectedAudioId);
    if (!asset || !window.vyra) { setToast("Import an audio file in a project first"); return; }
    setAnalyzingAudio(true);
    setBeatAnalysis(null);
    try {
      const url = await window.vyra.getMediaUrl(asset.path);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not read audio file");
      const result = await analyzeAudioBeats(await response.arrayBuffer());
      setBeatAnalysis(result);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Audio analysis failed");
    } finally {
      setAnalyzingAudio(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Clapperboard size={19} /></div><span>VYRA</span><span className="brand-studio">STUDIO</span></div>
        <div className="workspace-pill"><div className="workspace-avatar">V</div><div><strong>My workspace</strong><small>Personal space</small></div><ChevronDown size={14} /></div>
        <div className="nav-group">
          <p>{t.workspace}</p>
          <button className={page === "home" ? "nav-item active" : "nav-item"} onClick={() => navigate("home")}><Home size={17}/>{t.home}</button>
          <button className={page === "editor" ? "nav-item active" : "nav-item"} onClick={() => activeProject ? navigate("editor") : setToast("Open a project first")}><Film size={17}/>{t.projects}<span className="nav-count">{projects.length}</span></button>
          <button className={page === "assets" ? "nav-item active" : "nav-item"} onClick={() => navigate("assets")}><Layers3 size={17}/>{t.assets}</button>
        </div>
        <div className="nav-group">
          <p>CREATE</p>
          <button className={page === "ai" ? "nav-item active" : "nav-item"} onClick={() => navigate("ai")}><Sparkles size={17}/>VYRA AI<span className="soon-dot"/></button>
          <button className="nav-item" onClick={() => setToast("BeatSync is on the roadmap")}><AudioLines size={17}/>BeatSync<span className="soon-dot"/></button>
        </div>
        <div className="sidebar-bottom">
          <div className="storage-card"><div className="storage-top"><HardDrive size={14}/><span>LOCAL WORKSPACE</span></div><div className="storage-line"><i/></div><small>Files stay on this device</small></div>
          <button className={page === "settings" ? "nav-item active" : "nav-item"} onClick={() => navigate("settings")}><Settings2 size={17}/>{t.settings}</button>
          <div className="profile-row"><div className="profile-avatar">F</div><div><strong>Football Creator</strong><small>Free workspace</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>VYRA</span><span className="crumb-slash">/</span><strong>{page === "editor" ? activeProject?.name ?? t.editor : page === "home" ? t.home : page === "assets" ? t.assets : page === "ai" ? "VYRA AI" : t.settings}</strong></div>
          <div className="top-actions"><div className="search-box"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}/><kbd>⌘ K</kbd></div><button className="icon-button" title="Notifications" onClick={() => setToast("You're all caught up")}><Bell size={17}/></button><div className="top-avatar">F</div></div>
        </header>

        {page === "home" && (
          <div className="page-content home-page">
            <div className="welcome-row"><div><div className="eyebrow"><span className="live-pulse"/> YOUR CREATIVE FIELD</div><h1>{t.welcome}</h1><p>{t.subtitle}</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17}/>{t.newProject}</button></div>
            <section className="hero-card">
              <div className="hero-copy"><div className="hero-label"><Zap size={13}/> THE CREATOR'S PLAYGROUND</div><h2>Every legend has<br/><em>a highlight reel.</em></h2><p>Turn raw footage into moments worth replaying. Your vision, your rhythm, your VYRA.</p><button className="hero-button" onClick={() => setShowCreate(true)}>Start creating <ArrowDownToLine size={15}/></button></div>
              <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-glow"/><div className="art-ball">V</div><div className="art-caption"><span>01 / 90</span><b>OWN THE MOMENT</b></div><div className="art-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
              <div className="hero-grain"/>
            </section>
            <div className="section-heading"><div><span className="section-kicker">{t.recent}</span><h3>{t.projects}</h3></div><button className="text-button" onClick={() => setPage("assets")}>{t.all}<ArrowDownToLine size={14}/></button></div>
            {filteredProjects.length ? <div className="project-grid">{filteredProjects.slice(0, 4).map((project, index) => <button className="project-card" key={project.id} onClick={() => openProject(project.id)}><div className={`project-thumb thumb-${index % 4}`}><div className="thumb-overlay"><Play size={18} fill="currentColor"/></div><span className="thumb-tag">VYRA PROJECT</span></div><div className="project-meta"><div><strong>{project.name}</strong><small>{project.assets.length} media · {project.clips.length} clips</small></div><span>{formatDate(project.updatedAt)}</span></div></button>)}</div> : <div className="empty-projects"><div className="empty-icon"><Video size={24}/></div><div><strong>{t.noProjects}</strong><p>{t.noProjectsSub}</p></div><button className="subtle-button" onClick={() => setShowCreate(true)}><Plus size={15}/>{t.create}</button></div>}
            <div className="quick-start"><div><span className="section-kicker">{t.quickStart}</span><h3>Pick up your creative flow.</h3></div><div className="quick-cards"><button onClick={() => setShowCreate(true)}><div className="quick-icon green"><FolderPlus size={19}/></div><span><b>{t.startBlank}</b><small>{t.startBlankSub}</small></span><Plus size={17}/></button><button onClick={() => activeProject ? importMedia() : setShowCreate(true)}><div className="quick-icon muted"><Upload size={19}/></div><span><b>{t.import}</b><small>Bring your footage into VYRA.</small></span><Plus size={17}/></button></div></div>
          </div>
        )}

        {page === "editor" && (
          <div className="editor-page">
            {!activeProject ? <div className="editor-empty"><Film size={34}/><h2>No project open</h2><p>Create a project or choose one from Home.</p><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16}/>New project</button></div> : <>
              <div className="editor-toolbar"><div><span className="editor-project-dot"/><strong>{activeProject.name}</strong><span className="saved-indicator"><Check size={12}/>{t.save}</span></div><div className="toolbar-actions"><button className="subtle-button" onClick={importMedia}><Upload size={15}/>{t.import}</button><button className="primary-button small" onClick={() => setToast("Export engine is being built next")}><ArrowDownToLine size={15}/>{t.export}</button></div></div>
              <div className="editor-workspace">
                <section className="media-panel"><div className="panel-title"><span>{t.media}</span><button className="tiny-icon" onClick={importMedia}><Plus size={15}/></button></div><div className="media-list">{activeProject.assets.map((asset) => <div className="media-row" key={asset.id}><div className="media-type">{asset.kind === "audio" ? <Music2 size={15}/> : asset.kind === "image" ? <Grid2X2 size={15}/> : <Video size={15}/>}</div><button onClick={() => addToTimeline(asset)}><strong>{asset.name}</strong><small>{asset.kind.toUpperCase()} · Add to timeline</small></button><button className="tiny-icon" onClick={() => addToTimeline(asset)}><Plus size={14}/></button></div>)}{!activeProject.assets.length && <div className="panel-empty"><Upload size={21}/><b>{t.importFirst}</b><small>{t.importHint}</small><button className="subtle-button" onClick={importMedia}>{t.importFiles}</button></div>}</div></section>
                <section className="preview-panel"><div className="panel-title"><span>{t.preview}</span><span className="preview-quality">FIT · 100%</span></div><div className="preview-stage">{activeClip && activeClip.kind === "video" ? <video ref={videoRef} src={previewUrl || undefined} controls={false} preload="auto" playsInline onError={() => setToast("Video preview failed. Check the file format.")} onEnded={() => setPlaying(false)}/> : <div className="preview-placeholder"><div className="preview-emblem"><Clapperboard size={27}/></div><strong>{activeClip?.name ?? "Your next highlight starts here."}</strong><small>{activeClip ? "Clip selected · preview ready" : "Select a clip or add media to your timeline"}</small></div>}<span className="preview-time">00:00:00:00</span></div><div className="preview-controls"><button className="tiny-icon" onClick={() => setPlaying((v) => !v)}>{playing ? <Activity size={16}/> : <Play size={16}/>}</button><span>00:00:00:00</span><span className="preview-divider"/> <span>00:00:00:00</span><button className="tiny-icon" onClick={() => setToast("Preview fit to panel")}><SlidersHorizontal size={15}/></button></div></section>
                <section className="properties-panel"><div className="panel-title"><span>{t.properties}</span><SlidersHorizontal size={14}/></div>{activeClip ? <div className="properties-content"><span className="property-label">{t.selectClip}</span><strong className="clip-name">{activeClip.name}</strong><label>Start (seconds)<input type="number" min="0" step="0.5" value={activeClip.start} onChange={(e) => updateProject(activeProject.id, (p) => ({...p, clips:p.clips.map((c) => c.id === activeClip.id ? {...c,start:Number(e.target.value)} : c)}))}/></label><label>Duration (seconds)<input type="number" min="0.5" step="0.5" value={activeClip.duration} onChange={(e) => updateProject(activeProject.id, (p) => ({...p, clips:p.clips.map((c) => c.id === activeClip.id ? {...c,duration:Number(e.target.value)} : c)}))}/></label><label>Track<select value={activeClip.track} onChange={(e) => updateProject(activeProject.id, (p) => ({...p, clips:p.clips.map((c) => c.id === activeClip.id ? {...c,track:Number(e.target.value)} : c)}))}><option value={0}>Video 1</option><option value={1}>Audio 1</option><option value={2}>Overlay 1</option></select></label><button className="danger-button" onClick={removeClip}><X size={14}/>{t.remove}</button></div> : <div className="properties-empty"><SlidersHorizontal size={21}/><p>{t.noSelection}</p></div>}</section>
              </div>
              <section className="timeline-panel"><div className="timeline-heading"><div><span>{t.timeline}</span><small>{activeProject.clips.length} clips · 3 tracks</small></div><button className="tiny-icon" onClick={() => setToast("More timeline tools are coming soon")}><MoreHorizontal size={17}/></button></div><div className="timeline-ruler">{Array.from({length:9},(_,i)=><span key={i}>{String(i*5).padStart(2,"0")}s</span>)}</div><div className="track-row"><div className="track-label"><Video size={14}/>V1</div><div className="track-lane">{activeProject.clips.filter((c)=>c.track===0).map((clip)=><button key={clip.id} style={{left:`${clip.start*3}%`,width:`${Math.max(5,clip.duration*3)}%`}} className={selectedClip===clip.id?"timeline-clip selected":"timeline-clip"} onClick={()=>{setSelectedClip(clip.id);if(clip.kind==="video")setPlaying(false)}}><span>{clip.name}</span><i/></button>)}{!activeProject.clips.some(c=>c.track===0)&&<span className="lane-empty">{t.emptyTrack}</span>}</div></div><div className="track-row"><div className="track-label"><Music2 size={14}/>A1</div><div className="track-lane audio-lane">{activeProject.clips.filter((c)=>c.track===1).map((clip)=><button key={clip.id} style={{left:`${clip.start*3}%`,width:`${Math.max(5,clip.duration*3)}%`}} className={selectedClip===clip.id?"timeline-clip audio-clip selected":"timeline-clip audio-clip"} onClick={()=>setSelectedClip(clip.id)}><span>{clip.name}</span></button>)}{!activeProject.clips.some(c=>c.track===1)&&<span className="lane-empty">{t.emptyTrack}</span>}</div></div><div className="track-row"><div className="track-label"><Layers3 size={14}/>V2</div><div className="track-lane overlay-lane"><span className="lane-empty">{t.emptyTrack}</span></div></div></section>
            </>}</div>
        )}

        {page === "assets" && <div className="page-content"><div className="welcome-row"><div><div className="eyebrow">YOUR CREATIVE ASSETS</div><h1>{t.assetsTitle}</h1><p>{t.assetsSub}</p></div><button className="primary-button" onClick={() => activeProject ? importMedia() : setToast("Open a project to import media")}><Upload size={16}/>{t.importFiles}</button></div><div className="asset-summary"><div><Film size={17}/><b>{allAssets.filter(a=>a.kind==="video").length}</b><span>Videos</span></div><div><Music2 size={17}/><b>{allAssets.filter(a=>a.kind==="audio").length}</b><span>Audio</span></div><div><Grid2X2 size={17}/><b>{allAssets.filter(a=>a.kind==="image").length}</b><span>Images</span></div></div>{filteredAssets.length?<div className="asset-grid">{filteredAssets.map(a=><div className="asset-card" key={a.id}><div className="asset-art">{a.kind==="audio"?<AudioLines size={27}/>:a.kind==="image"?<Grid2X2 size={27}/>:<Film size={27}/>}</div><b>{a.name}</b><small>{a.kind.toUpperCase()}</small></div>)}</div>:<div className="empty-projects"><div className="empty-icon"><FolderOpen size={24}/></div><div><strong>{t.noAssets}</strong><p>Import media from an open project to see it here.</p></div></div>}</div>}
        {page === "ai" && <div className="page-content ai-page"><div className="ai-orb"><Sparkles size={34}/></div><div className="eyebrow">INTELLIGENCE FOR THE BEAUTIFUL GAME</div><h1>{t.aiTitle}</h1><p>{t.aiSub}</p><section className="beat-tool"><div className="beat-tool-heading"><div><span className="section-kicker">VYRA AI · AUDIO LAB</span><h2>Beat Intelligence</h2><p>Analyze your soundtrack locally and find rhythmic hit points for your next cut.</p></div><AudioLines size={25}/></div>{audioAssets.length ? <><div className="beat-controls"><select value={selectedAudioId} onChange={(event) => { setSelectedAudioId(event.target.value); setBeatAnalysis(null); }}><option value="">Choose an imported audio file</option>{audioAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><button className="primary-button" disabled={!selectedAudioId || analyzingAudio} onClick={runBeatAnalysis}>{analyzingAudio ? <Activity size={16} className="spin-icon"/> : <Sparkles size={16}/ >}{analyzingAudio ? "Analyzing..." : "Analyze beats"}</button></div>{beatAnalysis && <div className="beat-results"><div className="beat-stat"><strong>{beatAnalysis.bpm ?? "—"}</strong><span>ESTIMATED BPM</span></div><div className="beat-stat"><strong>{beatAnalysis.beatTimes.length}</strong><span>DETECTED HITS</span></div><div className="beat-stat"><strong>{beatAnalysis.duration}s</strong><span>TRACK LENGTH</span></div><div className="beat-markers">{beatAnalysis.beatTimes.slice(0, 120).map((time, index) => <i key={`${time}-${index}`} title={`${time}s`} style={{left: `${(time / beatAnalysis.duration) * 100}%`}}/> )}</div><small>Detected hit points · first 120 markers shown</small></div>}</> : <div className="beat-empty"><Music2 size={22}/><b>No audio files found yet</b><span>Open a project, import an MP3, WAV or M4A file, then return here.</span><button className="subtle-button" onClick={() => setPage(activeProject ? "editor" : "home")}>{activeProject ? "Go to editor" : "Go to projects"}</button></div>}</section><div className="ai-feature-grid"><div><Search size={20}/><b>Moment Finder</b><small>Find goals, skills and celebrations in your footage.</small><em>Planned</em></div><div className="feature-active"><AudioLines size={20}/><b>Beat Intelligence</b><small>Detect rhythm hits from your soundtrack.</small><em>Available now</em></div><div><WandSparkles size={20}/><b>Edit Assistant</b><small>Turn a creative brief into an edit plan.</small><em>Planned</em></div></div></div>}
        {page === "settings" && <div className="page-content settings-page"><div className="eyebrow">PREFERENCES</div><h1>{t.settings}</h1><p>Make VYRA feel like your own creative space.</p><div className="settings-section"><span className="section-kicker">{t.general}</span><div className="setting-row"><div><b>{t.language}</b><small>{t.languageSub}</small></div><select value={language} onChange={(e)=>setLanguage(e.target.value as "en"|"pt")}><option value="en">English</option><option value="pt">Português (Brasil)</option></select></div><div className="setting-row"><div><b>{t.appearance}</b><small>{t.appearanceSub}</small></div><span className="mode-pill"><span/>Dark</span></div><div className="setting-row"><div><b>{t.version}</b><small>VYRA Studio desktop foundation</small></div><span className="version-tag">0.1.0 · Alpha</span></div></div></div>}
      </main>

      {showCreate && <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setShowCreate(false)}}><form className="create-modal" onSubmit={(e)=>{e.preventDefault();createProject()}}><button type="button" className="modal-close" onClick={()=>setShowCreate(false)}><X size={18}/></button><div className="modal-icon"><FolderPlus size={22}/></div><div className="eyebrow">NEW CREATIVE PROJECT</div><h2>{t.create}</h2><p>Start with a name. You can change everything later.</p><label>{t.projectName}<input autoFocus value={projectName} onChange={(e)=>setProjectName(e.target.value)} placeholder={t.renameHint}/></label><div className="modal-actions"><button type="button" className="subtle-button" onClick={()=>setShowCreate(false)}>{t.cancel}</button><button type="submit" className="primary-button"><Plus size={15}/>{t.createNow}</button></div></form></div>}
      {toast && <div className="toast"><Check size={15}/>{toast}</div>}
      <div className="desktop-status"><span/><span>{t.desktopReady}</span><i/> <span>{t.localStorage}</span><span className="status-version">VYRA 0.1.0</span></div>
    </div>
  );
}
export type MediaKind = "video" | "audio" | "image";

export interface MediaAsset {
  id: string;
  name: string;
  path: string;
  kind: MediaKind;
}

export interface TimelineClip extends MediaAsset {
  start: number;
  duration: number;
  track: number;
}

export interface VyraProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  clips: TimelineClip[];
  assets: MediaAsset[];
}

export interface VyraBridge {
  isDesktop: boolean;
  loadProjects: () => Promise<VyraProject[]>;
  saveProjects: (projects: VyraProject[]) => Promise<boolean>;
  importMedia: () => Promise<MediaAsset[]>;
  getMediaUrl: (filePath: string) => Promise<string>;
  selectWhisperExecutable: () => Promise<string | null>;
  selectWhisperModel: () => Promise<string | null>;
  transcribeAudio: (inputPath: string, executablePath: string, modelPath: string) => Promise<string>;
}

declare global {
  interface Window {
    vyra?: VyraBridge;
  }
}
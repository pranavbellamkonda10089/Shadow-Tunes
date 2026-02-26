export interface Song {
  id: string;
  file: File;
  name: string;
  artist?: string;
  thumbnailUrl?: string;
  duration?: number;
  url: string;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  language: string;
  lines: LyricLine[];
  plainText?: string; // Fallback if timestamping fails
}

export enum LyricsStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export const LANGUAGES = [
  "Auto-Detect",
  "English",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Chinese",
  "Hindi",
  "Portuguese",
  "Russian",
  "Italian"
];
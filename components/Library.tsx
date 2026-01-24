import React, { useRef } from 'react';
import { Song } from '../types';
import { FolderOpen, Music, Play } from 'lucide-react';

interface LibraryProps {
  songs: Song[];
  currentSong: Song | null;
  onSongSelect: (song: Song) => void;
  onFilesSelected: (files: FileList) => void;
}

const Library: React.FC<LibraryProps> = ({ songs, currentSong, onSongSelect, onFilesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const handleOpenFolder = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Library</h2>
        <button 
          onClick={handleOpenFolder}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <FolderOpen size={14} />
          <span>ADD MUSIC</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 p-8 text-center">
            <Music size={48} className="opacity-20" />
            <p className="text-sm">No music found.</p>
            <p className="text-xs">Click "Add Music" to select audio files from your computer.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/50">
            {songs.map((song) => (
              <li 
                key={song.id}
                onClick={() => onSongSelect(song)}
                className={`group flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-white/5 ${
                  currentSong?.id === song.id ? 'bg-indigo-900/20 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'
                }`}
              >
                <div className={`p-2 rounded-md ${currentSong?.id === song.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {currentSong?.id === song.id ? <Play size={16} fill="currentColor" /> : <Music size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-indigo-200' : 'text-slate-300'}`}>
                    {song.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">Local File</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Library;
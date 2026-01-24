import React, { useState } from 'react';
import Library from './components/Library';
import Player from './components/Player';
import LyricsDisplay from './components/LyricsDisplay';
import { Song } from './types';

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleFilesSelected = (fileList: FileList) => {
    const newSongs: Song[] = [];
    const validExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];

    Array.from(fileList).forEach((file) => {
      const isAudioType = file.type.startsWith('audio/');
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (isAudioType || hasValidExtension) {
        newSongs.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          file: file,
          url: URL.createObjectURL(file)
        });
      }
    });
    setSongs(prev => [...prev, ...newSongs]);
  };

  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
  };

  const handleNext = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
  };

  const handlePrev = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Left Sidebar: Player and Library */}
      <div className="flex flex-col w-[450px] h-full border-r border-slate-800 shadow-2xl z-20">
        <div className="h-[60%] border-b border-slate-800">
            <Player 
                currentSong={currentSong} 
                onNext={handleNext} 
                onPrev={handlePrev}
                onTimeUpdate={setCurrentTime}
            />
        </div>
        <div className="h-[40%] bg-slate-900">
            <Library 
                songs={songs} 
                currentSong={currentSong} 
                onSongSelect={handleSongSelect}
                onFilesSelected={handleFilesSelected}
            />
        </div>
      </div>

      {/* Right Content: Lyrics */}
      <main className="flex-1 h-full min-w-0">
        <LyricsDisplay currentSong={currentSong} currentTime={currentTime} />
      </main>
    </div>
  );
};

export default App;
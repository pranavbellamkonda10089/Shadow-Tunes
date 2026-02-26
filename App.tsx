import React, { useState, useEffect } from 'react';
import Library from './components/Library';
import Player from './components/Player';
import LyricsDisplay from './components/LyricsDisplay';
import { Song } from './types';
import { identifySongMetadata } from './services/geminiService';

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Effect to enrich song metadata when currentSong changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!currentSong) return;
      
      // If metadata is already present (or we already tried and failed, maybe add a flag? 
      // For now, check if artist is missing or name is just the filename)
      if (currentSong.artist) return;

      try {
        const metadata = await identifySongMetadata(currentSong.name);
        
        // Update the current song with new metadata
        const updatedSong = {
          ...currentSong,
          artist: metadata.artist,
          name: metadata.title, // Update title if AI found a better one
          thumbnailUrl: metadata.thumbnailUrl
        };

        setCurrentSong(updatedSong);

        // Also update the song in the main list
        setSongs(prevSongs => 
          prevSongs.map(s => s.id === currentSong.id ? updatedSong : s)
        );
      } catch (error) {
        console.error("Failed to fetch metadata", error);
      }
    };

    fetchMetadata();
  }, [currentSong?.id]); // Only run if the song ID changes, not on every update

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
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
       {/* Ambient Background for centered mode */}
       {!isLyricsOpen && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-slate-950 pointer-events-none z-0"></div>
       )}

      {/* Main Player/Library Container */}
      <div className={`flex flex-col h-full bg-slate-950 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-20 shadow-2xl relative
        ${isLyricsOpen ? 'w-[450px] border-r border-slate-800' : 'w-full max-w-4xl mx-auto border-x border-slate-800'}`}>
        
        <div className={`${isLibraryOpen ? 'h-[60%]' : 'h-full'} transition-[height] duration-500 ease-in-out border-b border-slate-800 overflow-hidden`}>
            <Player 
                currentSong={currentSong} 
                onNext={handleNext} 
                onPrev={handlePrev}
                onTimeUpdate={setCurrentTime}
                isLyricsOpen={isLyricsOpen}
                onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
                isLibraryOpen={isLibraryOpen}
                onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
            />
        </div>
        <div className={`${isLibraryOpen ? 'h-[40%]' : 'h-0'} transition-[height] duration-500 ease-in-out bg-slate-900/50 backdrop-blur-md overflow-hidden`}>
            <Library 
                songs={songs} 
                currentSong={currentSong} 
                onSongSelect={handleSongSelect}
                onFilesSelected={handleFilesSelected}
            />
        </div>
      </div>

      {/* Lyrics Content - Hidden via display:none logic to preserve state if needed, or conditional rendering. 
          Using 'hidden' class keeps it mounted but invisible, good for toggling.
      */}
      <main className={`flex-1 h-full min-w-0 transition-opacity duration-500 ease-in-out ${isLyricsOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
        <LyricsDisplay currentSong={currentSong} currentTime={currentTime} />
      </main>
    </div>
  );
};

export default App;
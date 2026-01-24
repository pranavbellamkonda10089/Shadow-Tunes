import React, { useEffect, useRef, useState } from 'react';
import { LANGUAGES, LyricLine, LyricsData, LyricsStatus, Song } from '../types';
import { generateLyrics } from '../services/geminiService';
import { Sparkles, AlertCircle, Mic2, Languages } from 'lucide-react';

interface LyricsDisplayProps {
  currentSong: Song | null;
  currentTime: number;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ currentSong, currentTime }) => {
  const [status, setStatus] = useState<LyricsStatus>(LyricsStatus.IDLE);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  // Default to the first language which is Auto-Detect
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [errorMsg, setErrorMsg] = useState("");
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Reset state when song changes
  useEffect(() => {
    setStatus(LyricsStatus.IDLE);
    setLyricsData(null);
    setErrorMsg("");
  }, [currentSong]);

  // Handle auto-scroll based on time
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime, lyricsData]);

  const handleGenerate = async () => {
    if (!currentSong) return;

    setStatus(LyricsStatus.LOADING);
    setErrorMsg("");

    try {
      const data = await generateLyrics(currentSong.file, selectedLanguage);
      setLyricsData(data);
      setStatus(LyricsStatus.SUCCESS);
    } catch (err: any) {
      setStatus(LyricsStatus.ERROR);
      // Use the specific error message if available
      setErrorMsg(err.message || "Failed to generate lyrics. Please try again.");
    }
  };

  // Logic to find active line
  const getActiveLineIndex = () => {
    if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) return -1;
    // Find the last line that has a time less than current time
    for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
      if (lyricsData.lines[i].time <= currentTime) {
        return i;
      }
    }
    return -1;
  };

  const activeIndex = getActiveLineIndex();

  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 border-l border-slate-800">
        <Mic2 className="w-16 h-16 text-slate-800 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Lyrics Area</h2>
        <p className="text-slate-600 mt-2">Play a song to get started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative border-l border-slate-800">
      {/* Header / Toolbar */}
      <div className="p-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm z-10 border-b border-slate-900 sticky top-0">
        <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Lyrics AI</h2>
            {status === LyricsStatus.SUCCESS && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                    <Languages size={10} />
                    <span>{lyricsData?.language}</span>
                </div>
            )}
        </div>
        
        {status === LyricsStatus.IDLE || status === LyricsStatus.ERROR ? (
          <div className="flex items-center gap-3">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-slate-900 text-slate-300 text-sm rounded-lg border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 outline-none"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
            >
              <Sparkles size={16} />
              Generate
            </button>
          </div>
        ) : status === LyricsStatus.LOADING ? (
          <div className="flex items-center gap-2 text-indigo-400 text-sm animate-pulse">
            <Sparkles size={16} />
            <span>Analyzing song...</span>
          </div>
        ) : (
            // Option to regenerate
             <button
              onClick={() => setStatus(LyricsStatus.IDLE)}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Regenerate
            </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative p-8" ref={scrollContainerRef}>
        
        {status === LyricsStatus.ERROR && (
          <div className="flex flex-col items-center justify-center h-full text-red-400 space-y-2 p-4 text-center">
            <AlertCircle size={32} />
            <p className="max-w-md">{errorMsg}</p>
          </div>
        )}

        {status === LyricsStatus.IDLE && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
             <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2">
                <Sparkles size={24} className="text-indigo-500" />
             </div>
             <p className="max-w-md text-center">
                Click "Generate" to automatically detect the language and sync lyrics for this song.
             </p>
          </div>
        )}

        {status === LyricsStatus.SUCCESS && lyricsData && (
          <div className="space-y-8 pb-32 pt-10 text-center">
            {lyricsData.lines.length > 0 ? (
                lyricsData.lines.map((line, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={index}
                      ref={isActive ? activeLineRef : null}
                      className={`transition-all duration-500 ease-out transform ${
                        isActive 
                          ? 'text-white text-3xl font-bold scale-100 opacity-100 my-8 blur-none' 
                          : 'text-slate-600 text-xl font-medium scale-95 opacity-40 blur-[1px]'
                      }`}
                    >
                      <p>{line.text}</p>
                    </div>
                  );
                })
            ) : (
                // Fallback for plain text
                <div className="text-slate-300 whitespace-pre-wrap leading-loose text-lg font-medium">
                    {lyricsData.plainText}
                </div>
            )}
            
            {/* Footer space */}
            <div className="h-32"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LyricsDisplay;
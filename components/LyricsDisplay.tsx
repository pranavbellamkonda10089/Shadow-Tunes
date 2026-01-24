import React, { useEffect, useRef, useState } from 'react';
import { LANGUAGES, LyricLine, LyricsData, LyricsStatus, Song } from '../types';
import { generateLyrics } from '../services/geminiService';
import { Sparkles, AlertCircle, Mic2, Languages, Edit3, Save, Clock, Plus, Minus, RotateCcw } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const currentSongIdRef = useRef<string>("");

  // Handle auto-scroll based on time
  useEffect(() => {
    if (!isEditing && activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime, lyricsData, isEditing]);

  const performGeneration = async (song: Song, lang: string) => {
    setStatus(LyricsStatus.LOADING);
    setErrorMsg("");
    setLyricsData(null);
    setIsEditing(false);

    try {
      const data = await generateLyrics(song.file, lang);
      
      // Prevent race conditions: only update if the song hasn't changed
      if (currentSongIdRef.current === song.id) {
        setLyricsData(data);
        setStatus(LyricsStatus.SUCCESS);
      }
    } catch (err: any) {
      if (currentSongIdRef.current === song.id) {
        setStatus(LyricsStatus.ERROR);
        setErrorMsg(err.message || "Failed to generate lyrics. Please try again.");
      }
    }
  };

  // Auto-generate on song change
  useEffect(() => {
    if (currentSong) {
        currentSongIdRef.current = currentSong.id;
        performGeneration(currentSong, selectedLanguage);
    } else {
        currentSongIdRef.current = "";
        setStatus(LyricsStatus.IDLE);
        setLyricsData(null);
        setErrorMsg("");
        setIsEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  const handleManualGenerate = () => {
    if (currentSong) {
        performGeneration(currentSong, selectedLanguage);
    }
  };

  const toggleEditMode = () => {
    if (isEditing && lyricsData) {
        // Save mode: sort lines by time to ensure playback logic works
        const sortedLines = [...lyricsData.lines].sort((a, b) => a.time - b.time);
        setLyricsData({ ...lyricsData, lines: sortedLines });
    }
    setIsEditing(!isEditing);
  };

  const adjustTimestamp = (index: number, delta: number) => {
    if (!lyricsData) return;
    const newLines = [...lyricsData.lines];
    newLines[index].time = Math.max(0, newLines[index].time + delta);
    setLyricsData({ ...lyricsData, lines: newLines });
  };

  const syncToCurrentTime = (index: number) => {
    if (!lyricsData) return;
    const newLines = [...lyricsData.lines];
    newLines[index].time = currentTime;
    setLyricsData({ ...lyricsData, lines: newLines });
  };

  const updateLineText = (index: number, text: string) => {
    if (!lyricsData) return;
    const newLines = [...lyricsData.lines];
    newLines[index].text = text;
    setLyricsData({ ...lyricsData, lines: newLines });
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10); // 1 decimal place
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
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
              onClick={handleManualGenerate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
            >
              {status === LyricsStatus.ERROR ? <RotateCcw size={16} /> : <Sparkles size={16} />}
              {status === LyricsStatus.ERROR ? "Retry" : "Generate"}
            </button>
          </div>
        ) : status === LyricsStatus.LOADING ? (
          <div className="flex items-center gap-2 text-indigo-400 text-sm animate-pulse">
            <Sparkles size={16} />
            <span>Analyzing song...</span>
          </div>
        ) : (
            <div className="flex items-center gap-4">
                 <button
                    onClick={toggleEditMode}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        isEditing 
                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                    {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                    {isEditing ? 'Save Sync' : 'Edit Sync'}
                </button>
                
                {!isEditing && (
                    <button
                        onClick={() => setStatus(LyricsStatus.IDLE)}
                        className="text-xs text-slate-500 hover:text-slate-300 underline"
                    >
                        Regenerate
                    </button>
                )}
            </div>
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
           /* IDLE state now implies waiting for song or manual retry */
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
             <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2">
                <Sparkles size={24} className="text-indigo-500" />
             </div>
             <p className="max-w-md text-center">
                Ready to generate lyrics.
             </p>
          </div>
        )}

        {status === LyricsStatus.SUCCESS && lyricsData && (
          <div className={`${isEditing ? 'space-y-2 pb-10' : 'space-y-8 pb-32 pt-10 text-center'}`}>
            {lyricsData.lines.length > 0 ? (
                lyricsData.lines.map((line, index) => {
                  const isActive = index === activeIndex;
                  
                  if (isEditing) {
                      return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 group transition-all">
                             <div className="flex flex-col gap-1">
                                <span className="font-mono text-xs text-indigo-400 font-bold w-16 text-center bg-slate-950 py-1 rounded">
                                    {formatTimestamp(line.time)}
                                </span>
                             </div>
                             
                             <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => adjustTimestamp(index, -0.5)} className="p-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white rounded text-slate-400 transition-colors" title="-0.5s">
                                    <Minus size={12} />
                                </button>
                                <button onClick={() => adjustTimestamp(index, 0.5)} className="p-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white rounded text-slate-400 transition-colors" title="+0.5s">
                                    <Plus size={12} />
                                </button>
                                <button onClick={() => syncToCurrentTime(index)} className="p-1.5 bg-slate-800 hover:bg-green-600 hover:text-white rounded text-slate-400 transition-colors ml-1" title="Sync to current player time">
                                    <Clock size={12} />
                                </button>
                             </div>

                             <input 
                                value={line.text}
                                onChange={(e) => updateLineText(index, e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm font-medium focus:text-white placeholder:text-slate-600"
                                placeholder="Lyric text..."
                             />
                        </div>
                      );
                  }

                  return (
                    <div
                      key={index}
                      ref={isActive ? activeLineRef : null}
                      className={`transition-all duration-500 ease-out transform cursor-default ${
                        isActive 
                          ? 'text-white text-3xl font-bold scale-100 opacity-100 my-8 blur-none' 
                          : 'text-slate-600 text-xl font-medium scale-95 opacity-40 blur-[1px] hover:opacity-60 hover:blur-none'
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
            {!isEditing && <div className="h-32"></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LyricsDisplay;
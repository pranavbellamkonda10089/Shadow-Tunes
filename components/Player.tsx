import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Music, Mic2, ListMusic } from 'lucide-react';

interface PlayerProps {
  currentSong: Song | null;
  onNext: () => void;
  onPrev: () => void;
  onTimeUpdate: (currentTime: number) => void;
  isLyricsOpen: boolean;
  onToggleLyrics: () => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
}

const Player: React.FC<PlayerProps> = ({ 
  currentSong, 
  onNext, 
  onPrev, 
  onTimeUpdate, 
  isLyricsOpen, 
  onToggleLyrics,
  isLibraryOpen,
  onToggleLibrary
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [speed, setSpeed] = useState(1);

  // Initialize Audio Context and Analyser (One time setup)
  const initAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      
      // Higher fftSize = more detailed bars
      analyser.fftSize = 256; 
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20; // Leave some padding

    ctx.clearRect(0, 0, width, height);

    // Draw the circular visualizer
    ctx.beginPath();
    
    // Create a glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(99, 102, 241, 0.6)"; // Indigo glow

    for (let i = 0; i < bufferLength; i++) {
      // Create a mirrored effect by mapping the buffer to the circle
      // We skip a few bins at the start (low freq) to avoid the DC offset look
      const barHeight = (dataArray[i] / 255) * 60; // Max extension height
      const rad = (i * 2 * Math.PI) / bufferLength;

      // Inner point
      const x1 = centerX + Math.cos(rad) * (radius - 5);
      const y1 = centerY + Math.sin(rad) * (radius - 5);

      // Outer point
      const x2 = centerX + Math.cos(rad) * (radius + barHeight);
      const y2 = centerY + Math.sin(rad) * (radius + barHeight);

      // Dynamic color based on frequency
      const hue = 240 + (i / bufferLength) * 40; // Indigo to Purple range
      ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.8)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Reset shadow for performance
    ctx.shadowBlur = 0;

    requestRef.current = requestAnimationFrame(drawVisualizer);
  };

  // Handle Playback State & Context Resume
  useEffect(() => {
    if (isPlaying && !requestRef.current) {
        // Ensure context is running (browser autoplay policy)
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        initAudioContext();
        requestRef.current = requestAnimationFrame(drawVisualizer);
    } else if (!isPlaying) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Initialize and handle song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.url;
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = volume;
      
      // Initialize audio context on first song load if not done
      initAudioContext();

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Playback error", e));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          if (audioContextRef.current) audioContextRef.current.close();
      };
  }, []);

  // Sync props state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = volume;
    }
  }, [speed, volume]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentSong || !audioRef.current) return;

      // Avoid interfering with input elements (like volume or progress sliders if focused)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault(); // Prevent scrolling
          const newTimeBack = Math.max(0, audioRef.current.currentTime - 10);
          audioRef.current.currentTime = newTimeBack;
          setProgress(newTimeBack);
          break;
        case 'ArrowRight':
          e.preventDefault(); // Prevent scrolling
          const newTimeFwd = Math.min(duration, audioRef.current.currentTime + 10);
          audioRef.current.currentTime = newTimeFwd;
          setProgress(newTimeFwd);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.05));
          break;
        case ' ':
          e.preventDefault();
          if (audioContextRef.current?.state === 'suspended') {
             audioContextRef.current.resume();
          }
          if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            audioRef.current.play();
            setIsPlaying(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSong, duration, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    
    // Resume context if suspended (needed for some browsers)
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setProgress(current);
      setDuration(dur || 0);
      onTimeUpdate(current);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = Number(e.target.value);
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (vol > 0) {
        setPrevVolume(vol);
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
        setPrevVolume(volume);
        setVolume(0);
    } else {
        setVolume(prevVolume > 0 ? prevVolume : 0.5);
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 flex-shrink-0 w-full border-r border-slate-800">
      {/* Album Art Area with Visualizer */}
      <div className="aspect-square w-full bg-slate-900 rounded-2xl mb-8 shadow-2xl shadow-indigo-500/10 relative flex items-center justify-center group overflow-hidden">
        {/* Visualizer Canvas - Behind the image */}
        <canvas 
            ref={canvasRef} 
            width={400} 
            height={400} 
            className="absolute inset-0 w-full h-full opacity-60 z-0 pointer-events-none"
        />
        
        {/* Album Image - On top */}
        <div className="relative z-10 w-[85%] h-[85%] rounded-full overflow-hidden shadow-2xl border-4 border-slate-800/50">
             {currentSong ? (
            <img 
                src={currentSong.thumbnailUrl || "https://picsum.photos/400/400?grayscale"} 
                alt="Album Art" 
                className={`w-full h-full object-cover transition-transform duration-[3s] ease-linear ${isPlaying ? 'rotate-[360deg] animate-[spin_10s_linear_infinite]' : ''}`}
            />
            ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                <Music size={64} />
            </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Song Info */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2 truncate leading-tight">
          {currentSong ? currentSong.name : "No Song Selected"}
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          {currentSong?.artist || "Local Library"}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-auto space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            disabled={!currentSong}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Speed, Repeat, Library, Lyrics */}
          <div className="flex items-center gap-2">
             <button 
                onClick={cycleSpeed} 
                className="text-slate-400 hover:text-white transition-colors text-xs font-bold w-6 flex items-center justify-center" 
                title="Playback Speed"
                disabled={!currentSong}
              >
                {speed}x
              </button>
              <button className="text-slate-400 hover:text-white transition-colors" disabled={!currentSong}>
                 <Repeat size={18} />
              </button>

              <button 
                onClick={onToggleLibrary}
                className={`transition-colors ${isLibraryOpen ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                title="Toggle Library"
              >
                 <ListMusic size={18} />
              </button>

              <button 
                onClick={onToggleLyrics}
                className={`transition-colors ${isLyricsOpen ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                disabled={!currentSong}
                title="Toggle AI Lyrics"
              >
                 <Mic2 size={18} />
              </button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button onClick={onPrev} className="text-slate-300 hover:text-white transition-colors" disabled={!currentSong}>
                <SkipBack size={24} />
            </button>
            <button 
                onClick={togglePlay}
                disabled={!currentSong}
                className="w-12 h-12 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={onNext} className="text-slate-300 hover:text-white transition-colors" disabled={!currentSong}>
                <SkipForward size={24} />
            </button>
          </div>
          
          {/* Volume Control */}
          <div className="flex items-center gap-2 group">
             <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors" disabled={!currentSong}>
                {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
             </button>
             
             <div className="relative flex items-center group/volume">
                {/* Volume Percentage Tooltip */}
                <div 
                    className="absolute bottom-full -translate-x-1/2 mb-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover/volume:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-slate-700 whitespace-nowrap z-50"
                    style={{ left: `calc(5px + ${volume} * (100% - 10px))` }}
                >
                    {Math.round(volume * 100)}%
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-700"></div>
                </div>

                <input 
                    type="range" 
                    min="0" max="1" step="0.05" 
                    value={volume} 
                    onChange={handleVolumeChange}
                    disabled={!currentSong}
                    className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-400 hover:[&::-webkit-slider-thumb]:bg-white outline-none"
                />
             </div>
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default Player;
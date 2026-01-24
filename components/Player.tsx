import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Music } from 'lucide-react';

interface PlayerProps {
  currentSong: Song | null;
  onNext: () => void;
  onPrev: () => void;
  onTimeUpdate: (currentTime: number) => void;
}

const Player: React.FC<PlayerProps> = ({ currentSong, onNext, onPrev, onTimeUpdate }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [prevVolume, setPrevVolume] = useState(0.7); // For unmuting
  const [speed, setSpeed] = useState(1);

  // Initialize and handle song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.url;
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = volume;
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Playback error", e));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  // Handle Speed and Volume updates dynamically
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.volume = volume;
    }
  }, [speed, volume]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
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
      {/* Album Art Area */}
      <div className="aspect-square w-full bg-slate-800 rounded-2xl mb-8 shadow-2xl shadow-indigo-500/10 overflow-hidden relative group">
        {currentSong ? (
          <img 
            src="https://picsum.photos/400/400?grayscale" 
            alt="Album Art" 
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Music size={64} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
      </div>

      {/* Song Info */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 truncate leading-tight">
          {currentSong ? currentSong.name : "No Song Selected"}
        </h1>
        <p className="text-slate-400 text-sm font-medium">Local Library</p>
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
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Speed & Repeat */}
          <div className="flex items-center gap-3">
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
             <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={volume} 
                onChange={handleVolumeChange}
                disabled={!currentSong}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-400 hover:[&::-webkit-slider-thumb]:bg-white"
                title={`Volume: ${Math.round(volume * 100)}%`}
             />
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
      />
    </div>
  );
};

export default Player;
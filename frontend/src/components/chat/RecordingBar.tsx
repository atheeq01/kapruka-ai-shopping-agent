import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecordingBarProps {
  onCancel: () => void;
  onSend: (blob: Blob, durationMs: number) => void;
}

const BAR_COUNT = 24;
const MIN_DURATION_MS = 1000;

export const RecordingBar: React.FC<RecordingBarProps> = ({ onCancel, onSend }) => {
  const [elapsed, setElapsed]   = useState(0);       // seconds
  const [bars, setBars]         = useState<number[]>(new Array(BAR_COUNT).fill(0.1));
  const [tooltip, setTooltip]   = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const startTimeRef     = useRef<number>(0);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const animFrameRef     = useRef<number | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  useEffect(() => {
    let mounted = true;

    function drawBars() {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const idx = Math.floor((i / BAR_COUNT) * data.length);
        return Math.max(0.08, data[idx] / 255);
      });
      setBars(newBars);
      animFrameRef.current = requestAnimationFrame(drawBars);
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;

        // Web Audio analyser for live waveform
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        analyserRef.current = analyser;
        animFrameRef.current = requestAnimationFrame(drawBars);

        // MediaRecorder
        const mr = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
        });
        mediaRecorderRef.current = mr;
        chunksRef.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.start(100);

        // Timer
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      } catch (err) {
        console.error('[RecordingBar] mic error:', err);
        alert('Microphone access denied or not available. (HTTPS is required for microphone access on mobile devices).');
        if (mounted) onCancel();
      }
    })();

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const durationMs = Date.now() - startTimeRef.current;
    if (durationMs < MIN_DURATION_MS) {
      setTooltip(true);
      setTimeout(() => setTooltip(false), 2000);
      return;
    }

    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
      cleanup();
      onSend(blob, durationMs);
    };
    mr.stop();
  };

  const handleCancel = () => {
    mediaRecorderRef.current?.stop();
    cleanup();
    onCancel();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 bg-white rounded-full border border-red-300 shadow-sm w-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-red-300/40">
      {/* Cancel */}
      <button
        type="button"
        onClick={handleCancel}
        className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        title="Cancel recording"
      >
        <X size={16} />
      </button>

      {/* Pulse dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>

      {/* Timer */}
      <span className="text-xs font-mono text-red-600 tabular-nums shrink-0 w-10">
        {fmt(elapsed)}
      </span>

      {/* Live waveform bars */}
      <div className="flex items-center gap-[2px] flex-1 h-8 overflow-hidden">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="rounded-full bg-red-400 w-[3px]"
            animate={{ height: `${Math.max(4, h * 28)}px` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        ))}
      </div>

      {/* Send button */}
      <div className="relative shrink-0">
        {tooltip && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
            Tap and hold to record longer
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        )}
        <motion.button
          type="button"
          onClick={handleSend}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="p-2 rounded-full text-white shadow-md shadow-pink-300/50"
          style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
        >
          <Send size={16} />
        </motion.button>
      </div>
    </div>
  );
};

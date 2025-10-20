import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Download, Trash2, RotateCcw } from 'lucide-react';

const VoiceRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isPlaying = false;

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Draw waveform
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const waveGradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      waveGradient.addColorStop(0, 'rgb(6, 182, 212)');
      waveGradient.addColorStop(0.5, 'rgb(59, 130, 246)');
      waveGradient.addColorStop(1, 'rgb(147, 51, 234)');

      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = waveGradient;
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = 'rgba(59, 130, 246, 0.5)';
      canvasCtx.stroke();
      canvasCtx.shadowBlur = 0;
    };

    draw();
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        chunksRef.current = [];

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      drawWaveform();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Mikrofondan foydalanishga ruxsat berilmadi!');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        drawWaveform();
      } else {
        mediaRecorderRef.current.pause();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  // Download recording
  const downloadRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ielts-speaking-${Date.now()}.webm`;
      a.click();
    }
  };

  // Delete recording
  const deleteRecording = () => {
    setAudioURL('');
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const newRecording = () => {
    deleteRecording();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-8 border-b border-white/10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
                <Mic size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                IELTS Speaking Practice
              </h1>
              <p className="text-slate-300">Professional Recording Studio</p>
            </div>
          </div>

          <div className="p-8">
            {/* Waveform */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-xl"></div>
              <div className="relative backdrop-blur-sm bg-slate-900/50 rounded-2xl p-6 border border-white/10">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={180}
                  className="w-full h-40 rounded-xl"
                />
              </div>
            </div>

            {/* Timer */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 bg-slate-900/50 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/10">
                {isRecording && (
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isPaused ? 'bg-yellow-400' : 'bg-red-500 animate-pulse'
                    }`}
                  />
                )}
                <span className="text-5xl font-mono font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {formatTime(recordingTime)}
                </span>
              </div>
              {isRecording && (
                <p className="text-slate-400 text-sm mt-3">
                  {isPaused ? '⏸️ Pauza' : '🔴 Yozib olinmoqda'}
                </p>
              )}
            </div>

            {/* Controls */}
            {!audioURL ? (
              <div className="flex justify-center gap-4 mb-6">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="group relative bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-full p-8 shadow-2xl shadow-red-500/30 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Mic size={40} className="relative z-10" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 to-pink-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePause}
                      className="group relative bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-full p-8 shadow-2xl shadow-yellow-500/30 transition-all transform hover:scale-105 active:scale-95"
                    >
                      {isPaused ? (
                        <Play size={36} className="relative z-10" />
                      ) : (
                        <Pause size={36} className="relative z-10" />
                      )}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="group relative bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full p-8 shadow-2xl shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <Square size={36} className="relative z-10" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="backdrop-blur-sm bg-slate-900/50 rounded-2xl p-6 border border-white/10">
                  <audio
                    ref={audioRef}
                    src={audioURL}
                    controls
                    className="w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={newRecording}
                    className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/30"
                  >
                    <RotateCcw size={20} />
                    <span className="font-semibold">Yangi</span>
                  </button>
                  <button
                    onClick={downloadRecording}
                    className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-green-500/30"
                  >
                    <Download size={20} />
                    <span className="font-semibold">Yuklab olish</span>
                  </button>
                  <button
                    onClick={deleteRecording}
                    className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-6 py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
                  >
                    <Trash2 size={20} />
                    <span className="font-semibold">O'chirish</span>
                  </button>
                </div>
              </div>
            )}

            {!isRecording && !audioURL && (
              <div className="text-center mt-8">
                <div className="inline-block backdrop-blur-sm bg-slate-900/30 px-6 py-3 rounded-xl border border-white/10">
                  <p className="text-slate-300 text-sm">
                    🎤 Yozib olishni boshlash uchun mikrofon tugmasini bosing
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-slate-900/50 to-slate-900/30 px-8 py-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>🎯 IELTS Speaking Mock Test</span>
              <span>💎 Professional Edition</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-cyan-400 font-bold text-lg">HD Audio</div>
            <div className="text-slate-400 text-xs mt-1">High Quality</div>
          </div>
          <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-blue-400 font-bold text-lg">Real-time</div>
            <div className="text-slate-400 text-xs mt-1">Visualization</div>
          </div>
          <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <div className="text-purple-400 font-bold text-lg">Easy Use</div>
            <div className="text-slate-400 text-xs mt-1">One Click</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;

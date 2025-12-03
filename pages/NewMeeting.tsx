import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Upload, Loader2, AlertCircle, Pause, Play } from 'lucide-react';
import { FullMeetingData } from '../types';
import { processAudioWithGemini } from '../services/geminiService';

interface NewMeetingProps {
  onAddMeeting: (meeting: FullMeetingData) => void;
  apiKey: string;
}

const NewMeeting: React.FC<NewMeetingProps> = ({ onAddMeeting, apiKey }) => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Optimization: 16kbps is sufficient for speech and keeps 2-hour files small (~14MB)
      // preventing browser memory crashes and API payload limits.
      const options = { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 
      };
      
      // Fallback if specific options aren't supported
      const mediaRecorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleProcessing(blob, duration);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Slice every second to ensure data is available
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();

    } catch (err) {
      console.error(err);
      setError("Could not access microphone. Please allow permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 2 hours at 16kbps is ~15MB. 
      // Standard MP3s might be larger, so we allow up to 50MB now to support longer uploads.
      if (file.size > 50 * 1024 * 1024) { 
        setError("File size too large (Max 50MB).");
        return;
      }
      // Estimate duration or set to 0
      handleProcessing(file, 0); 
    }
  };

  const handleProcessing = async (blob: Blob, recordedDuration: number) => {
    if (!apiKey) {
      setError("API Key missing. Please refresh and enter your key.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    const newMeetingId = Date.now().toString();
    const initialMeetingData: FullMeetingData = {
      id: newMeetingId,
      title: `Meeting ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      durationSec: recordedDuration,
      status: 'processing',
      audioBlob: blob
    };

    // Optimistic add
    onAddMeeting(initialMeetingData);

    try {
      const result = await processAudioWithGemini(apiKey, blob, newMeetingId);
      
      if (result.status === 'failed') {
        throw new Error("Processing failed.");
      }

      const completedMeeting: FullMeetingData = {
        ...initialMeetingData,
        ...result,
        status: 'completed'
      };

      onAddMeeting(completedMeeting); // Update with results
      navigate(`/meeting/${newMeetingId}`);
      
    } catch (err) {
      console.error(err);
      setError("Failed to process audio with Gemini. Check your API key or network connection.");
      
      const failedMeeting: FullMeetingData = {
        ...initialMeetingData,
        status: 'failed'
      };
      onAddMeeting(failedMeeting);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-stone-800 mb-2">Record Meeting</h2>
        <p className="text-stone-500">
          Capture audio in Urdu or English. Optimized for sessions up to 2 hours.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 flex flex-col items-center gap-8">
        {/* Timer Display */}
        <div className={`text-6xl font-mono text-stone-800 tracking-wider ${isPaused ? 'opacity-50' : ''}`}>
          {formatTime(duration)}
        </div>

        {/* Visualizer Placeholder */}
        <div className="h-16 w-full flex items-center justify-center gap-1">
          {isRecording && !isPaused ? (
            Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i}
                className="w-1.5 bg-emerald-500 rounded-full animate-pulse"
                style={{ 
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.05}s`
                }} 
              />
            ))
          ) : isPaused ? (
             <div className="flex items-center gap-2 text-amber-500 font-medium">
                <Pause size={20} /> Recording Paused
             </div>
          ) : (
            <div className="w-full h-0.5 bg-stone-200 rounded-full" />
          )}
        </div>

        {error && (
          <div className="w-full p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
            <p className="text-stone-600 font-medium">Transcribing & Summarizing...</p>
            <p className="text-xs text-stone-400">This may take a minute for long recordings.</p>
          </div>
        ) : (
          <div className="flex gap-4 w-full justify-center items-center">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                title="Start Recording"
              >
                <Mic size={36} />
              </button>
            ) : (
              <>
                 {/* Pause / Resume Button */}
                 <button 
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="h-14 w-14 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                </button>

                {/* Stop Button */}
                <button 
                  onClick={stopRecording}
                  className="h-20 w-20 rounded-full bg-stone-800 hover:bg-black text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                  title="Stop & Process"
                >
                  <Square size={32} fill="currentColor" />
                </button>
              </>
            )}
          </div>
        )}

        {!isRecording && !isProcessing && (
          <div className="w-full pt-6 border-t border-stone-100 mt-2">
            <label className="flex flex-col items-center gap-2 cursor-pointer group text-stone-400 hover:text-emerald-600 transition-colors">
              <Upload size={24} />
              <span className="text-sm font-medium">Or upload audio file</span>
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewMeeting;
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Square, Upload, Loader2, AlertCircle, Pause, Play } from 'lucide-react';
import { FullMeetingData } from '../types';
import { processAudioWithGroq } from '../services/groqService';
import { audioStorage } from '../services/audioStorage';

interface NewMeetingProps {
  onAddMeeting: (meeting: FullMeetingData) => void;
  apiKey: string;
}

const NewMeeting: React.FC<NewMeetingProps> = ({ onAddMeeting, apiKey }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { meetingId: existingMeetingId, title: existingTitle } = location.state || {};

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState(existingTitle || `Meeting ${new Date().toLocaleString()}`);

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
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };

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
      if (file.size > 50 * 1024 * 1024) {
        setError("File size too large (Max 50MB).");
        return;
      }
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

    // Use existing ID if we are recording for a scheduled meeting, otherwise generate new
    const meetingId = existingMeetingId || Date.now().toString();

    // Save audio to IndexedDB
    await audioStorage.saveAudio(meetingId, blob);

    const initialMeetingData: FullMeetingData = {
      id: meetingId,
      title: meetingTitle,
      createdAt: new Date().toISOString(), // Update start time to now
      durationSec: recordedDuration,
      status: 'processing',
      audioId: meetingId
    };

    // Optimistic add/update
    onAddMeeting(initialMeetingData);

    try {
      const result = await processAudioWithGroq(apiKey, blob, meetingId);

      if (result.status === 'failed') {
        throw new Error("Processing failed.");
      }

      const completedMeeting: FullMeetingData = {
        ...initialMeetingData,
        ...result,
        status: 'completed'
      };

      onAddMeeting(completedMeeting); // Update with results
      navigate(`/meeting/${meetingId}`);

    } catch (err) {
      console.error(err);
      setError("Failed to process audio with Groq. Check your API key or network connection.");

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
        <h2 className="text-3xl font-bold text-stone-800 mb-2">
          {existingTitle ? `Record: ${existingTitle}` : 'Record Meeting'}
        </h2>
        <p className="text-stone-500 mb-4">
          Capture audio in Urdu or English. Optimized for sessions up to 2 hours.
        </p>
        <div className="max-w-md mx-auto">
          <label htmlFor="meeting-title" className="block text-sm font-medium text-stone-700 mb-2">
            Meeting Title
          </label>
          <input
            id="meeting-title"
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Enter meeting title"
            disabled={isRecording || isProcessing}
          />
        </div>
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
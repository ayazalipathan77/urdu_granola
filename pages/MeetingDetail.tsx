import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { FullMeetingData } from '../types';
import { Download, ArrowLeft, CheckCircle, List, Type } from 'lucide-react';

interface MeetingDetailProps {
  meetings: FullMeetingData[];
}

const MeetingDetail: React.FC<MeetingDetailProps> = ({ meetings }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meeting = meetings.find(m => m.id === id);
  const [activeTab, setActiveTab] = useState<'notes' | 'transcript'>('notes');
  
  if (!meeting) {
    return <Navigate to="/" replace />;
  }

  if (meeting.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-stone-800">Processing Audio...</h2>
        <p className="text-stone-500">Gemini is analyzing the conversation.</p>
      </div>
    );
  }

  const handleDownload = () => {
    if (!meeting) return;
    
    let content = '';
    let filename = `${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

    if (activeTab === 'notes' && meeting.notes) {
      filename += '_notes.txt';
      content += `MEETING: ${meeting.title}\n`;
      content += `DATE: ${new Date(meeting.createdAt).toLocaleString()}\n\n`;
      content += `SUMMARY\n-------\n${meeting.notes.summary}\n\n`;
      
      content += `ACTION ITEMS\n------------\n`;
      meeting.notes.actionItems.forEach(item => content += `- ${item}\n`);
      content += `\n`;
      
      content += `DECISIONS\n---------\n`;
      meeting.notes.decisions.forEach(item => content += `- ${item}\n`);
      content += `\n`;
      
      content += `KEY POINTS\n----------\n`;
      meeting.notes.keyPoints.forEach(item => content += `- ${item}\n`);
      
    } else if (activeTab === 'transcript' && meeting.transcript) {
      filename += '_transcript.txt';
      content += `TRANSCRIPT: ${meeting.title}\n`;
      content += `DATE: ${new Date(meeting.createdAt).toLocaleString()}\n\n`;
      
      meeting.transcript.forEach(seg => {
        const mins = Math.floor(seg.start / 60);
        const secs = (seg.start % 60).toFixed(0).padStart(2, '0');
        content += `[${mins}:${secs}] ${seg.speaker}: ${seg.text}\n`;
      });
    } else {
      return; // Nothing to download
    }

    // Trigger download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center text-sm text-stone-500 hover:text-emerald-600 mb-4 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">{meeting.title}</h1>
            <p className="text-stone-500 text-sm mt-1">
              {new Date(meeting.createdAt).toLocaleString()} • {Math.floor(meeting.durationSec / 60)}m {meeting.durationSec % 60}s
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              title={`Download ${activeTab === 'notes' ? 'Notes' : 'Transcript'}`}
            >
              <Download size={18} />
              <span>Download {activeTab === 'notes' ? 'Notes' : 'Transcript'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'notes' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <List size={16} />
            Smart Notes
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'transcript' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Type size={16} />
            Transcript
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[500px]">
        {activeTab === 'notes' && meeting.notes ? (
          <div className="p-8">
            {/* Summary */}
            <section className="mb-10">
              <h3 className="text-xl font-bold text-stone-800 mb-3 border-b border-stone-100 pb-2">Summary</h3>
              <p className="text-lg leading-relaxed text-stone-700">{meeting.notes.summary}</p>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Action Items */}
              <section>
                <h3 className="text-lg font-bold text-emerald-800 mb-4 bg-emerald-50 p-2 rounded-lg inline-block">
                  Action Items
                </h3>
                <ul className="space-y-3">
                  {meeting.notes.actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-stone-700">
                      <CheckCircle size={20} className="text-emerald-500 mt-1 shrink-0" />
                      <span className="leading-loose">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Decisions */}
              <section>
                <h3 className="text-lg font-bold text-stone-800 mb-4 bg-stone-100 p-2 rounded-lg inline-block">
                  Decisions
                </h3>
                <ul className="space-y-3">
                   {meeting.notes.decisions.map((item, idx) => (
                    <li key={idx} className="bg-stone-50 p-3 rounded-lg border border-stone-100 text-stone-700">
                      {item}
                    </li>
                  ))}
                  {meeting.notes.decisions.length === 0 && <p className="text-stone-400 text-sm">No specific decisions recorded.</p>}
                </ul>
              </section>
            </div>
            
             {/* Key Points */}
             <section className="mt-10">
                <h3 className="text-lg font-bold text-stone-800 mb-4">
                  Key Points
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-stone-700">
                   {meeting.notes.keyPoints.map((item, idx) => (
                    <li key={idx} className="leading-loose">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
          </div>
        ) : activeTab === 'notes' ? (
             <div className="p-8 text-center text-stone-500">No notes generated.</div>
        ) : null}

        {activeTab === 'transcript' && (
          <div className="p-0">
            {meeting.transcript && meeting.transcript.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {meeting.transcript.map((segment, idx) => (
                  <div key={idx} className="p-4 hover:bg-stone-50 transition-colors flex gap-4">
                    <div className="text-xs font-mono text-stone-400 w-16 pt-1">
                      {Math.floor(segment.start / 60)}:{(segment.start % 60).toFixed(0).padStart(2,'0')}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-stone-500 uppercase mb-1 tracking-wider">
                        {segment.speaker || 'Speaker'}
                      </div>
                      <p className="text-stone-800 leading-relaxed" dir="auto">
                        {segment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-stone-500">No transcript available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingDetail;
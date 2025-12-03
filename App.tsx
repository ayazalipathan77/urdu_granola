import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewMeeting from './pages/NewMeeting';
import MeetingDetail from './pages/MeetingDetail';
import ApiKeyModal from './components/ApiKeyModal';
import { FullMeetingData } from './types';
import { Settings } from 'lucide-react';

// Dummy Data for demonstration
const MOCK_MEETINGS: FullMeetingData[] = [
  {
    id: 'demo-1',
    title: 'Product Design Sync',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    durationSec: 345,
    status: 'completed',
    notes: {
      language: 'en',
      summary: 'In today\'s meeting, we discussed the new design system. The team decided to use the Green color palette.',
      actionItems: [
        'Ali to complete wireframes by next week.',
        'Sarah to get approval from the client.'
      ],
      decisions: [
        'The new logo has been approved.',
        'Mobile app deadline is the 15th.'
      ],
      keyPoints: [
        'Design should be simple.',
        'Urdu font support is necessary.'
      ]
    },
    transcript: [
      { start: 0, end: 5, speaker: 'Speaker 1', text: 'Hello everyone, is everyone present?' },
      { start: 6, end: 15, speaker: 'Speaker 2', text: 'Yes, we are all here. Let\'s start. Today\'s agenda is design.' }
    ]
  }
];

const App: React.FC = () => {
  // Access environment variable directly as per instructions
  // @ts-ignore
  const envApiKey = process.env.API_KEY;

  // Persistence for meetings
  const [meetings, setMeetings] = useState<FullMeetingData[]>(() => {
    const saved = localStorage.getItem('urdu_granola_meetings');
    return saved ? JSON.parse(saved) : MOCK_MEETINGS;
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    // Priority: Environment Variable -> Local Storage -> Empty
    if (envApiKey) return envApiKey;
    return localStorage.getItem('gemini_api_key') || '';
  });

  const [outlookClientId, setOutlookClientId] = useState<string>(() => {
    return localStorage.getItem('outlook_client_id') || '';
  });

  const [isKeyModalOpen, setKeyModalOpen] = useState(false);

  // Force open modal if Gemini Key is missing on load
  useEffect(() => {
    if (!apiKey) setKeyModalOpen(true);
  }, [apiKey]);

  useEffect(() => {
    const meetingsToSave = meetings.map(({ audioBlob, ...rest }) => rest);
    localStorage.setItem('urdu_granola_meetings', JSON.stringify(meetingsToSave));
  }, [meetings]);

  const handleSaveKeys = (geminiKey: string, outlookId: string) => {
    setApiKey(geminiKey);
    // Only save to local storage if it's different from env (or simply always save to persist user override)
    localStorage.setItem('gemini_api_key', geminiKey);
    
    setOutlookClientId(outlookId);
    localStorage.setItem('outlook_client_id', outlookId);
    
    setKeyModalOpen(false);
  };

  const handleAddMeeting = (meeting: FullMeetingData) => {
    setMeetings(prev => {
      const exists = prev.findIndex(m => m.id === meeting.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { ...updated[exists], ...meeting };
        return updated;
      }
      return [meeting, ...prev];
    });
  };

  const handleSyncCalendar = (newEvents: FullMeetingData[]) => {
    setMeetings(prev => {
      const uniqueEvents = newEvents.filter(
        newEvent => !prev.some(existing => existing.id === newEvent.id)
      );
      return [...uniqueEvents, ...prev];
    });
  };

  return (
    <HashRouter>
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onSave={handleSaveKeys} 
        initialGeminiKey={apiKey}
        initialOutlookId={outlookClientId}
        onClose={() => setKeyModalOpen(false)}
      />
      
      <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
        <Layout>
          <button 
            onClick={() => setKeyModalOpen(true)}
            className="fixed bottom-4 left-4 z-50 p-3 bg-stone-800 text-white rounded-full shadow-lg hover:bg-black transition-transform hover:scale-105"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          <Routes>
            <Route 
              path="/" 
              element={<Dashboard meetings={meetings} onSyncCalendar={handleSyncCalendar} outlookClientId={outlookClientId} />} 
            />
            <Route 
              path="/record" 
              element={<NewMeeting onAddMeeting={handleAddMeeting} apiKey={apiKey} />} 
            />
            <Route 
              path="/meeting/:id" 
              element={<MeetingDetail meetings={meetings} />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </HashRouter>
  );
};

export default App;
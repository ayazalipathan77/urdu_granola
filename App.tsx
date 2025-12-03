import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewMeeting from './pages/NewMeeting';
import MeetingDetail from './pages/MeetingDetail';
import ApiKeyModal from './components/ApiKeyModal';
import { FullMeetingData } from './types';

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
  // Persistence for meetings (simulating DB)
  const [meetings, setMeetings] = useState<FullMeetingData[]>(() => {
    const saved = localStorage.getItem('urdu_granola_meetings');
    return saved ? JSON.parse(saved) : MOCK_MEETINGS;
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  const [isKeyModalOpen, setKeyModalOpen] = useState(!apiKey);

  useEffect(() => {
    // Save minimal data to avoid quota issues with localStorage (removing blobs for storage)
    const meetingsToSave = meetings.map(({ audioBlob, ...rest }) => rest);
    localStorage.setItem('urdu_granola_meetings', JSON.stringify(meetingsToSave));
  }, [meetings]);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setKeyModalOpen(false);
  };

  const handleAddMeeting = (meeting: FullMeetingData) => {
    setMeetings(prev => {
      // If updating an existing processing meeting
      const exists = prev.findIndex(m => m.id === meeting.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { ...updated[exists], ...meeting };
        return updated;
      }
      return [meeting, ...prev];
    });
  };

  return (
    <HashRouter>
      <ApiKeyModal isOpen={isKeyModalOpen} onSave={handleSaveKey} />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard meetings={meetings} />} />
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
    </HashRouter>
  );
};

export default App;
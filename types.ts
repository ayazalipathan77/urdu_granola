export interface Meeting {
  id: string;
  title: string;
  createdAt: string; // ISO String
  scheduledAt?: string; // ISO String for future meetings
  durationSec: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  audioId?: string; // Reference to audio stored in IndexedDB
}

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface MeetingNotes {
  summary: string;
  actionItems: string[];
  decisions: string[];
  keyPoints: string[];
  language: string; // usually 'ur'
}

export interface FullMeetingData extends Meeting {
  transcript?: TranscriptSegment[];
  notes?: MeetingNotes;
}

export interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  outlookClientId: string;
  setOutlookClientId: (id: string) => void;
}
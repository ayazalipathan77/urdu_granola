import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FullMeetingData } from '../types';
import { Calendar, Clock, ChevronRight, FileText, AlertTriangle, Loader, RefreshCw, Mic, Lock } from 'lucide-react';
import { getMockCalendarEvents } from '../services/calendarService';
import { fetchOutlookEvents } from '../services/microsoftGraph';

interface DashboardProps {
  meetings: FullMeetingData[];
  onSyncCalendar?: (events: FullMeetingData[]) => void;
  outlookClientId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ meetings, onSyncCalendar, outlookClientId }) => {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const scheduledMeetings = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt || '').getTime() - new Date(b.scheduledAt || '').getTime());

  const pastMeetings = meetings
    .filter(m => m.status !== 'scheduled')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSync = async () => {
    if (!onSyncCalendar) return;
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      let events;
      if (outlookClientId) {
        // Use Real Graph API
        events = await fetchOutlookEvents(outlookClientId);
      } else {
        // Use Mock
        console.warn("No Outlook Client ID provided, using mock data.");
        events = await getMockCalendarEvents();
      }
      onSyncCalendar(events);
    } catch (error: any) {
      console.error("Failed to sync calendar", error);
      setSyncError(error.message || "Sync failed. Check permissions.");
    } finally {
      setIsSyncing(false);
    }
  };

  const startScheduledMeeting = (meeting: FullMeetingData) => {
    navigate('/record', { 
      state: { 
        meetingId: meeting.id,
        title: meeting.title 
      } 
    });
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Your Meetings</h2>
          <p className="text-stone-500">Manage upcoming schedule and past notes.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Syncing...' : 'Sync Calendar'}
          </button>
          {!outlookClientId && (
             <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full flex items-center gap-1">
               <Lock size={10} /> Mock Mode (Set Outlook ID in Settings)
             </span>
          )}
        </div>
      </div>
      
      {syncError && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          {syncError}
        </div>
      )}

      {/* Upcoming Meetings Section */}
      {scheduledMeetings.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Upcoming</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scheduledMeetings.map(meeting => (
              <div key={meeting.id} className="bg-white p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    Scheduled
                  </span>
                  <div className="text-stone-400">
                    <Calendar size={16} />
                  </div>
                </div>
                <h3 className="font-bold text-stone-800 mb-1 truncate">{meeting.title}</h3>
                <p className="text-sm text-stone-500 mb-4">
                  {new Date(meeting.scheduledAt || '').toLocaleString([], { weekday: 'short', hour: '2-digit', minute:'2-digit' })}
                </p>
                <button 
                  onClick={() => startScheduledMeeting(meeting)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-stone-900 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Mic size={16} /> Start Recording
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past/Recorded Meetings Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Recent Recordings</h3>
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded">
             {pastMeetings.length} Total
          </span>
        </div>

        {pastMeetings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-stone-200 border-dashed">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-medium text-stone-700">No recordings yet</h3>
            <p className="text-stone-500 mb-6 max-w-xs mx-auto">
              Record a new meeting or sync your calendar to get started.
            </p>
            <Link 
              to="/record"
              className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              Start Recording
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {pastMeetings.map((meeting) => (
              <Link 
                key={meeting.id} 
                to={`/meeting/${meeting.id}`}
                className="group bg-white p-5 rounded-xl border border-stone-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 
                    ${meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                      meeting.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {meeting.status === 'completed' ? <FileText size={20} /> : 
                     meeting.status === 'failed' ? <AlertTriangle size={20} /> : <Loader size={20} className="animate-spin" />}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(meeting.createdAt).toLocaleDateString()}
                      </span>
                      {meeting.durationSec > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {Math.floor(meeting.durationSec / 60)}m {meeting.durationSec % 60}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {meeting.status === 'processing' && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Processing
                    </span>
                  )}
                  {meeting.status === 'failed' && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      Failed
                    </span>
                  )}
                  <ChevronRight size={18} className="text-stone-300 group-hover:text-emerald-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
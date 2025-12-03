import React from 'react';
import { Link } from 'react-router-dom';
import { FullMeetingData } from '../types';
import { Calendar, Clock, ChevronRight, FileText, AlertTriangle, Loader } from 'lucide-react';

interface DashboardProps {
  meetings: FullMeetingData[];
}

const Dashboard: React.FC<DashboardProps> = ({ meetings }) => {
  const sortedMeetings = [...meetings].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Your Meetings</h2>
          <p className="text-stone-500">Recent recordings and generated notes.</p>
        </div>
        <div className="hidden md:block">
           <span className="text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded">
             {meetings.length} Total
           </span>
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-stone-200 border-dashed">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-medium text-stone-700">No meetings yet</h3>
          <p className="text-stone-500 mb-6 max-w-xs mx-auto">
            Record your first conversation or upload an audio file to generate Urdu notes.
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
          {sortedMeetings.map((meeting) => (
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
  );
};

export default Dashboard;
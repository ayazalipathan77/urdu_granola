import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Settings, FileAudio } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path 
      ? "bg-stone-200 text-stone-900 font-semibold" 
      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900";
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-stone-200 flex flex-col sticky top-0 md:h-screen z-10">
        <div className="p-6 border-b border-stone-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <FileAudio size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-800 tracking-tight">Urdu Granola</h1>
              <p className="text-xs text-stone-500">Auto-Notes & Transcribe</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive('/')}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/record" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive('/record')}`}>
            <PlusCircle size={20} />
            <span>New Meeting</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-stone-100">
           <div className="px-4 py-3 text-sm text-stone-400">
              v1.0.0 (Beta)
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
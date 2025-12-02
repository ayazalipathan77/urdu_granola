import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  onSave: (openaiKey: string, outlookId: string) => void;
  isOpen: boolean;
  initialOpenAIKey: string;
  initialOutlookId: string;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, isOpen, initialOpenAIKey, initialOutlookId, onClose }) => {
  const [inputKey, setInputKey] = useState(initialOpenAIKey);
  const [inputOutlookId, setInputOutlookId] = useState(initialOutlookId);

  useEffect(() => {
    setInputKey(initialOpenAIKey);
    setInputOutlookId(initialOutlookId);
  }, [initialOpenAIKey, initialOutlookId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-stone-200">
        <h2 className="text-xl font-bold text-stone-800 mb-4">Settings & Keys</h2>

        {/* Groq Section */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
            Groq API Key <span className="text-red-500">*</span>
          </label>
          <p className="text-stone-400 text-xs mb-2">Required for audio transcription and processing.</p>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full border border-stone-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
          <div className="mt-1 text-right">
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">
              Get Groq Key
            </a>
          </div>
        </div>

        {/* Outlook Section */}
        <div className="mb-6 pt-6 border-t border-stone-100">
          <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
            Outlook Client ID (Optional)
          </label>
          <p className="text-stone-400 text-xs mb-2">Required for Real-time Calendar Sync.</p>
          <input
            type="text"
            value={inputOutlookId}
            onChange={(e) => setInputOutlookId(e.target.value)}
            placeholder="e.g., a1b2c3d4-..."
            className="w-full border border-stone-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
          <div className="mt-1 text-right">
            <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">
              Azure Portal
            </a>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(inputKey, inputOutlookId)}
            disabled={!inputKey.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
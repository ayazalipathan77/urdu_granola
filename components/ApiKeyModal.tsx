import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  isOpen: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, isOpen }) => {
  const [inputKey, setInputKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-stone-200">
        <h2 className="text-xl font-bold text-stone-800 mb-2">Configure Gemini API</h2>
        <p className="text-stone-600 mb-4 text-sm">
          To generate Urdu notes, this demo requires a free Google Gemini API Key. 
          Your key is processed locally in your browser.
        </p>
        
        <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">API Key</label>
        <input 
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full border border-stone-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all mb-4"
        />

        <div className="flex gap-3 justify-end">
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            Get Key
          </a>
          <button 
            onClick={() => onSave(inputKey)}
            disabled={!inputKey}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
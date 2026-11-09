import React from 'react'
import { AudioWaveform, Mic, Speech, Database, BarChart3 } from 'lucide-react'

export default function Header({ stats, activeTab, setActiveTab }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#005baa] flex items-center justify-center text-white">
            <AudioWaveform className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Text To Speech</h1>
            </div>
            <p className="text-xs text-slate-500">Text To Speech</p>
          </div>
        </div>

        {/* Quick Stats in Header */}
        <div className="hidden md:flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">Từ vựng:</span>
            <span className="font-bold text-slate-900">{stats.total_words?.toLocaleString() || '7,184'}</span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Mic className="w-4 h-4 text-[#005baa]" />
            <span>Âm thanh thu:</span>
            <span className="font-bold text-[#005baa]">{stats.words_with_audio?.toLocaleString() || '2,638'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-t border-slate-100 bg-slate-50/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 py-2">
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeTab === 'tts'
                  ? 'border-[#005baa] text-[#005baa] bg-[#e6f2fb]'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Speech className="w-4 h-4" />
              <span>Phòng Tổng Hợp (TTS Studio)</span>
            </button>

            <button
              onClick={() => setActiveTab('db')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeTab === 'db'
                  ? 'border-[#005baa] text-[#005baa] bg-[#e6f2fb]'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Khám Phá CSDL Đa Phương Tiện</span>
            </button>

            <button
              onClick={() => setActiveTab('features')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeTab === 'features'
                  ? 'border-[#005baa] text-[#005baa] bg-[#e6f2fb]'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Trực Quan Đặc Trưng Âm Thanh</span>
            </button>

          </nav>
        </div>
      </div>
    </header>
  )
}

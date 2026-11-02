import React from 'react'
import { AudioWaveform, Mic, Activity, Speech, Database, BarChart3, GitBranch } from 'lucide-react'

export default function Header({ stats, activeTab, setActiveTab }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <AudioWaveform className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">VietVoice TTS</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-brand-100 text-brand-700 rounded-full">
                ReactJS (Vite)
              </span>
            </div>
            <p className="text-xs text-slate-500">Đề tài 1: Tổng hợp tiếng nói mức từ & Khai phá CSDL âm thanh</p>
          </div>
        </div>

        {/* Quick Stats in Header */}
        <div className="hidden md:flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-600">Từ vựng:</span>
            <span className="font-bold text-slate-900">{stats.total_words?.toLocaleString() || '7,184'}</span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Mic className="w-4 h-4 text-brand-600" />
            <span>Âm thanh thu:</span>
            <span className="font-bold text-emerald-600">{stats.words_with_audio?.toLocaleString() || '2,638'}</span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Đặc trưng MFCC:</span>
            <span className="font-bold text-indigo-600">{stats.features_count?.toLocaleString() || '1,054'}</span>
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
                  ? 'border-brand-500 text-brand-600 bg-brand-50'
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
                  ? 'border-brand-500 text-brand-600 bg-brand-50'
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
                  ? 'border-brand-500 text-brand-600 bg-brand-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Trực Quan Đặc Trưng Âm Thanh</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeTab === 'architecture'
                  ? 'border-brand-500 text-brand-600 bg-brand-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Sơ Đồ Khối & Báo Cáo</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}


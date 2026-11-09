import React, { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import TTSStudio from './components/TTSStudio.jsx'
import DatabaseExplorer from './components/DatabaseExplorer.jsx'
import FeatureVisualizer from './components/FeatureVisualizer.jsx'

export default function AppShell() {
  const [activeTab, setActiveTab] = useState('tts')
  const [stats, setStats] = useState({
    total_words: 0,
    words_with_audio: 0,
    features_count: 0,
  })
  const [selectedWordId, setSelectedWordId] = useState(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((response) => response.json())
      .then((statsData) => setStats(statsData))
      .catch((error) => console.error('Failed to load application data', error))
  }, [])

  const inspectFeature = (wordId) => {
    setSelectedWordId(wordId)
    setActiveTab('features')
  }

  const playAudio = async (_wordId, word) => {
    try {
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word, speaker_id: 'S01' }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể phát audio')
      }
      const audio = new Audio(data.data_uri)
      await audio.play()
    } catch (error) {
      console.error('Failed to play audio', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header stats={stats} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'tts' && <TTSStudio />}
        {activeTab === 'db' && (
          <DatabaseExplorer
            onInspectFeature={inspectFeature}
            onPlayAudio={playAudio}
          />
        )}
        {activeTab === 'features' && (
          <FeatureVisualizer
            selectedWordId={selectedWordId}
            setSelectedWordId={setSelectedWordId}
          />
        )}
      </main>
    </div>
  )
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, TrendingUp, BarChart2, Search } from 'lucide-react'
import { Chart } from 'chart.js/auto'

export default function FeatureVisualizer({ selectedWordId, setSelectedWordId }) {
  const [inputId, setInputId] = useState(selectedWordId || 'W00001')
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searchError, setSearchError] = useState('')
  const [featureData, setFeatureData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const chartWaveRef = useRef(null)
  const chartPitchRef = useRef(null)
  const chartMfccRef = useRef(null)

  const chartWaveInstance = useRef(null)
  const chartPitchInstance = useRef(null)
  const chartMfccInstance = useRef(null)

  const loadFeatures = useCallback(async (wId) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/features/${wId.toUpperCase()}`)
      if (!res.ok) {
        alert('Không tìm thấy từ hoặc từ chưa có file thu âm.')
        return
      }
      const json = await res.json()
      setFeatureData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!searchText.trim()) {
      setSuggestions([])
      setSearchError('')
      return
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/words?q=${encodeURIComponent(searchText.trim())}&filter_status=audio&page=1&limit=8`,
        )
        if (!response.ok) throw new Error('Không thể tìm kiếm từ')
        const data = await response.json()
        setSuggestions(data.items || [])
        setSearchError('')
      } catch (error) {
        setSuggestions([])
        setSearchError(error.message)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchText])

  const selectWord = (word) => {
    setInputId(word.word_id)
    setSearchText(word.word)
    setSuggestions([])
    setSelectedWordId(word.word_id)
    loadFeatures(word.word_id)
  }

  const analyzeInput = async () => {
    const exactSuggestion = suggestions.find(
      (item) => item.word.toLocaleLowerCase() === searchText.trim().toLocaleLowerCase(),
    )
    if (exactSuggestion) {
      selectWord(exactSuggestion)
      return
    }
    const value = searchText.trim() || inputId.trim()
    if (/^W\d{5}$/i.test(value)) {
      setSelectedWordId(value)
      loadFeatures(value)
      return
    }
    try {
      const response = await fetch(
        `/api/words?q=${encodeURIComponent(value)}&filter_status=audio&page=1&limit=1`,
      )
      const data = await response.json()
      if (!response.ok || !data.items?.length) {
        setSearchError('Không tìm thấy từ có audio. Hãy thử từ khác hoặc mã Wxxxxx.')
        return
      }
      selectWord(data.items[0])
    } catch (error) {
      setSearchError(error.message)
    }
  }

  useEffect(() => {
    if (selectedWordId) {
      setInputId(selectedWordId)
      loadFeatures(selectedWordId)
    }
  }, [selectedWordId, loadFeatures])

  // Render Charts
  useEffect(() => {
    if (!featureData) return

    // 1. Waveform Chart
    if (chartWaveRef.current) {
      if (chartWaveInstance.current) chartWaveInstance.current.destroy()
      chartWaveInstance.current = new Chart(chartWaveRef.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: featureData.waveform.map((_, i) => i),
          datasets: [{
            label: 'Biên độ Waveform',
            data: featureData.waveform,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            pointRadius: 0,
            borderWidth: 1.5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { min: -1.0, max: 1.0, grid: { color: '#f1f5f9' } },
          },
        },
      })
    }

    // 2. Pitch Contour Chart
    if (chartPitchRef.current) {
      if (chartPitchInstance.current) chartPitchInstance.current.destroy()
      chartPitchInstance.current = new Chart(chartPitchRef.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: featureData.f0_curve.map((_, i) => i),
          datasets: [{
            label: 'Đường cong F0 (Hz)',
            data: featureData.f0_curve,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.05)',
            fill: true,
            pointRadius: 2,
            borderWidth: 2,
            spanGaps: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'Khung thời gian (Frames)' } },
            y: { title: { display: true, text: 'F0 (Hz)' }, grid: { color: '#f1f5f9' } },
          },
        },
      })
    }

    // 3. MFCC 13 Bar Chart
    if (chartMfccRef.current) {
      if (chartMfccInstance.current) chartMfccInstance.current.destroy()
      chartMfccInstance.current = new Chart(chartMfccRef.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: Array.from({ length: 13 }, (_, i) => `MFCC ${i}`),
          datasets: [
            {
              label: 'MFCC Mean (Giá trị trung bình)',
              data: featureData.mfcc_mean.length ? featureData.mfcc_mean : Array(13).fill(0),
              backgroundColor: '#10b981',
              borderRadius: 6,
            },
            {
              label: 'MFCC Std (Độ lệch chuẩn)',
              data: featureData.mfcc_std.length ? featureData.mfcc_std : Array(13).fill(0),
              backgroundColor: '#3b82f6',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { y: { grid: { color: '#f1f5f9' } } },
        },
      })
    }
  }, [featureData])

  return (
    <div className="space-y-6">
      {/* Selector Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Trích Rút & Trực Quan Hóa Đặc Trưng Âm Thanh</h2>
          <p className="text-xs text-slate-500">
            Phân tích dạng sóng (Waveform), cao độ (F0 Pitch Contour qua pYIN) và ma trận phổ MFCC 13 chiều.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') analyzeInput() }}
              placeholder="Tìm theo từ hoặc tên file mã hóa..."
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none w-64"
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((item) => (
                  <button
                    key={item.word_id}
                    type="button"
                    onClick={() => selectWord(item)}
                    className="w-full px-3 py-2 text-left hover:bg-brand-50 flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-slate-800">{item.word}</span>
                    <span className="text-xs font-mono text-slate-400">{item.encoded_filename}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={analyzeInput}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition"
          >
            {isLoading ? 'Đang tải...' : 'Xem Phân Tích'}
          </button>
        </div>
      </div>
      {searchError && <p className="text-xs text-rose-600">{searchError}</p>}
      <p className="text-xs text-slate-500">
        Gõ từ tiếng Việt hoặc tên file mã hóa để chọn trong danh sách.
      </p>

      {featureData && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Từ Đang Chọn</span>
              <div className="text-2xl font-black text-brand-600 mt-1">{featureData.word} ({featureData.encoded_filename})</div>
              <span className="text-xs text-slate-500">Thời lượng: {featureData.duration}s | {featureData.sample_rate} Hz</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Cao Độ Cơ Bản (F0 Mean)</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">{featureData.f0_mean_hz ? `${featureData.f0_mean_hz} Hz` : 'N/A'}</div>
              <span className="text-xs text-slate-500">Hữu thanh: {Math.round(featureData.f0_voiced_fraction * 100)}%</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Năng Lượng RMS</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{featureData.rms_energy}</div>
              <span className="text-xs text-slate-500">Biên độ đỉnh: {featureData.peak_amplitude}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Zero-Crossing Rate (ZCR)</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{featureData.zcr_mean}</div>
              <span className="text-xs text-slate-500">Chất lượng: {featureData.quality_warnings}</span>
            </div>
          </div>

          {/* Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-brand-600" />
                <span>Dạng Sóng Âm Thanh (Waveform Envelope)</span>
              </h3>
              <div className="h-56">
                <canvas ref={chartWaveRef}></canvas>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Đường Cong Cao Độ F0 (Pitch Contour)</span>
              </h3>
              <div className="h-56">
                <canvas ref={chartPitchRef}></canvas>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <span>13 Hệ Số Phổ Mel (MFCC 0 - 12)</span>
            </h3>
            <div className="h-64">
              <canvas ref={chartMfccRef}></canvas>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

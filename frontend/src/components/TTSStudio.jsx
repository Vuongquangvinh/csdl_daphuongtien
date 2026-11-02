import React, { useState, useEffect, useRef } from 'react'
import { Edit3, Sparkles, Play, Loader2, Check, Download, Sliders, Scissors, Info } from 'lucide-react'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default function TTSStudio({ samples }) {
  const [text, setText] = useState('ba bán bánh')
  const [tokens, setTokens] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [wordPause, setWordPause] = useState(120)
  const [useTrimmed, setUseTrimmed] = useState(true)
  const [useRmsNorm, setUseRmsNorm] = useState(true)
  const [useCrossfade, setUseCrossfade] = useState(true)
  const [speaker, setSpeaker] = useState('S01')
  const [result, setResult] = useState(null)

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Real-time token validation
  useEffect(() => {
    if (!text.trim()) {
      setTokens([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/tts/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const data = await res.json()
        setTokens(data.tokens || [])
      } catch (e) {
        console.error('Check token error', e)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [text])

  // Synthesize handler
  const handleSynthesize = async () => {
    if (!text.trim()) {
      alert('Vui lòng nhập từ hoặc chuỗi từ tiếng Việt.')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          word_pause_ms: Number(wordPause),
          use_trimmed: useTrimmed,
          use_rms_norm: useRmsNorm,
          crossfade_ms: useCrossfade ? 10.0 : 0.0,
          speaker_id: speaker,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert('Lỗi tổng hợp: ' + data.error)
      } else {
        setResult(data)
        if (audioRef.current) {
          audioRef.current.src = data.data_uri
          audioRef.current.play().catch(() => {})
        }
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ tổng hợp: ' + err)
    } finally {
      setIsLoading(false)
    }
  }

  // Draw waveform canvas
  useEffect(() => {
    if (!result || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const numBars = 54
    const barWidth = canvas.width / numBars
    ctx.fillStyle = '#6366f1'

    for (let i = 0; i < numBars; i++) {
      const factor = Math.abs(Math.sin(i * 0.35) * Math.cos(i * 0.2)) * 0.75 + 0.15
      const h = factor * (canvas.height - 10)
      const x = i * barWidth
      const y = (canvas.height - h) / 2
      ctx.fillRect(x + 1, y, barWidth - 2, h)
    }
  }, [result])

  const missingCount = tokens.filter(t => t.type === 'word' && !t.available).length
  const wordCount = tokens.filter(t => t.type === 'word').length

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white mb-2">
            ReactJS Word-Level Concatenative TTS
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">Tổng Hợp Giọng Nói Tiếng Việt Mức Từ</h2>
          <p className="mt-1 text-sm text-indigo-100 leading-relaxed">
            Hệ thống tra cứu đơn vị âm thanh theo từ trong CSDL, cân bằng biên độ RMS, chèn khoảng dừng ngữ pháp và làm mượt biên độ tiếp giáp (Crossfade).
          </p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Text Input & Audio Player */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-brand-600" />
                <span>Nhập văn bản cần tổng hợp:</span>
              </label>
              <span className="text-xs text-slate-400">{text.length} ký tự</span>
            </div>

            <textarea
              rows="3"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSynthesize()
              }}
              className="w-full text-lg p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition resize-none placeholder-slate-400"
              placeholder="Nhập từ hoặc câu (Ví dụ: ba bán bánh, anh đi đâu đấy...)"
            />

            {/* Real-time Token Badges */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Kiểm tra khả dụng trong CSDL:</span>
                {wordCount === 0 ? (
                  <span className="italic text-slate-400">Chưa nhập từ</span>
                ) : missingCount === 0 ? (
                  <span className="text-emerald-600 font-bold">100% Khả dụng ({wordCount}/{wordCount} từ)</span>
                ) : (
                  <span className="text-rose-600 font-bold">Thiếu {missingCount} từ thu âm</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                {tokens.map((t, idx) => (
                  t.type === 'punct' ? (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded font-mono">
                      {t.token}
                    </span>
                  ) : t.available ? (
                    <span key={idx} className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                      ✓ {t.token}
                    </span>
                  ) : (
                    <span key={idx} className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 rounded border border-rose-300" title="Chưa có file audio trong CSDL">
                      ✗ {t.token}
                    </span>
                  )
                ))}
              </div>
            </div>

            {/* Sample Sentences Pills */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Câu mẫu thử nghiệm (100% có trong CSDL):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {samples?.map((cat, i) =>
                  cat.items.map((item, j) => (
                    <button
                      key={`${i}-${j}`}
                      onClick={() => setText(item.text)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-slate-200 rounded-lg text-slate-700 transition"
                      title={item.desc}
                    >
                      {item.text}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => { setText(''); setResult(null) }}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-100 rounded-lg transition"
              >
                Xóa văn bản
              </button>

              <button
                onClick={handleSynthesize}
                disabled={isLoading}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang tổng hợp...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Tổng Hợp Âm Thanh (Ctrl+Enter)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Player Card */}
          {result && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Âm thanh tổng hợp hoàn tất</h3>
                    <p className="text-xs text-slate-500">
                      {result.meta.sample_rate.toLocaleString()} Hz | {result.meta.duration}s | {result.meta.total_words} từ
                    </p>
                  </div>
                </div>

                <a
                  href={result.data_uri}
                  download="synthesized_speech.wav"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file WAV</span>
                </a>
              </div>

              {/* Waveform Player Box */}
              <div className="p-4 bg-slate-900 rounded-xl text-white space-y-3 shadow-inner">
                <canvas ref={canvasRef} className="w-full h-20 rounded bg-slate-950 block"></canvas>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <audio
                  ref={audioRef}
                  controls
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.target.duration)}
                  className="w-full h-10 accent-brand-500 rounded"
                />
              </div>

              {/* Word Timeline */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Dòng thời gian phát âm từng từ (Bấm vào từ để tua nhanh):
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.meta.timeline.map((w, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = w.start
                          audioRef.current.play()
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-brand-100 text-slate-800 rounded-lg border border-slate-200 transition flex items-center space-x-1.5"
                    >
                      <span>{w.word}</span>
                      <span className="text-[10px] text-slate-400">{w.start}s</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Controls */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Tùy Chọn Thuật Toán Ghép Nối</h3>
            </div>

            {/* Speaker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Người thu âm / Giọng đọc (Speaker)
              </label>
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="S01">S01 - Giọng Nam Thành Viên 1 (2,638 từ)</option>
              </select>
            </div>

            {/* Word Pause Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Khoảng nghỉ giữa các từ
                </label>
                <span className="text-xs font-bold text-brand-600">{wordPause} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="10"
                value={wordPause}
                onChange={(e) => setWordPause(e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0 ms</span>
                <span>120 ms (Chuẩn)</span>
                <span>400 ms</span>
              </div>
            </div>

            {/* Preprocessing Toggles */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Scissors className="w-4 h-4 text-brand-600" />
                <span>Tiền xử lý âm thanh</span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTrimmed}
                  onChange={(e) => setUseTrimmed(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-700">Lọc khoảng lặng (Trim Silence RMS)</span>
                  <p className="text-[11px] text-slate-500">Cắt bỏ đoạn thừa đầu/cuối file thu âm.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRmsNorm}
                  onChange={(e) => setUseRmsNorm(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-700">Cân bằng năng lượng (RMS Normalization)</span>
                  <p className="text-[11px] text-slate-500">Đồng nhất âm lượng giữa các từ.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCrossfade}
                  onChange={(e) => setUseCrossfade(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-700">Làm mượt điểm tiếp giáp (Crossfade 10ms)</span>
                  <p className="text-[11px] text-slate-500">Khử tiếng nổ click/pop tại biên.</p>
                </div>
              </label>
            </div>

            {/* Theory Card */}
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 text-xs text-brand-800 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-brand-600" />
                <span>Kỹ thuật Unit Concatenation:</span>
              </div>
              <p className="text-[11px] text-brand-700 leading-normal">
                Phương pháp ghép nối đơn vị mức từ giữ nguyên âm sắc tự nhiên của giọng người thu âm gốc và độ chuẩn của các thanh điệu tiếng Việt.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}


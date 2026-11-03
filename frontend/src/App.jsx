import React, { useState, useEffect, useRef } from 'react'
import {
  AudioWaveform,
  Play,
  Pause,
  RotateCcw,
  Download,
  Sliders,
  Scissors,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Volume2,
  VolumeX,
  FileAudio
} from 'lucide-react'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default function App() {
  const [text, setText] = useState('ba bán bánh')
  const [tokens, setTokens] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [samples, setSamples] = useState([])
  const [stats, setStats] = useState({ total_words: 7184, words_with_audio: 2638 })

  // Synthesis Controls
  const [speaker, setSpeaker] = useState('S01')
  const [wordPause, setWordPause] = useState(120)
  const [useTrimmed, setUseTrimmed] = useState(true)
  const [useRmsNorm, setUseRmsNorm] = useState(true)
  const [useCrossfade, setUseCrossfade] = useState(true)

  // Audio Playback State
  const [result, setResult] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  // Fetch initial stats & sample sentences
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(e => console.error(e))

    fetch('/api/samples')
      .then(r => r.json())
      .then(d => setSamples(d))
      .catch(e => console.error(e))
  }, [])

  // Real-time token verification as user types
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

  // Synthesize action
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
        setIsPlaying(true)
        if (audioRef.current) {
          audioRef.current.src = data.data_uri
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ tổng hợp: ' + err)
    } finally {
      setIsLoading(false)
    }
  }

  // Audio Play/Pause toggle
  const togglePlayPause = () => {
    if (!audioRef.current || !result) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  // Replay
  const handleReplay = () => {
    if (!audioRef.current || !result) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
    setIsPlaying(true)
  }

  // Seek to specific word
  const seekToWord = (startTime) => {
    if (!audioRef.current || !result) return
    audioRef.current.currentTime = startTime
    audioRef.current.play().catch(() => {})
    setIsPlaying(true)
  }

  // Track current word highlight on audio playback
  useEffect(() => {
    if (!result || !result.meta || !result.meta.timeline) return
    const timeline = result.meta.timeline
    let idx = -1
    for (let i = 0; i < timeline.length; i++) {
      const w = timeline[i]
      if (currentTime >= w.start && currentTime <= (w.start + w.duration)) {
        idx = i
        break
      }
    }
    setCurrentWordIdx(idx)
  }, [currentTime, result])

  // Draw animated waveform
  useEffect(() => {
    if (!result || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const draw = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const numBars = 60
      const barWidth = canvas.width / numBars
      const progressRatio = duration > 0 ? (currentTime / duration) : 0
      const activeBar = Math.floor(progressRatio * numBars)

      for (let i = 0; i < numBars; i++) {
        const factor = Math.abs(Math.sin(i * 0.32) * Math.cos(i * 0.18)) * 0.72 + 0.15
        const h = factor * (canvas.height - 14)
        const x = i * barWidth
        const y = (canvas.height - h) / 2

        if (i <= activeBar) {
          ctx.fillStyle = '#818cf8' // Highlighted active bar
        } else {
          ctx.fillStyle = '#312e81' // Inactive bar
        }
        ctx.fillRect(x + 1, y, barWidth - 2, h)
      }

      // Draw playhead vertical line
      const playheadX = progressRatio * canvas.width
      ctx.fillStyle = '#f43f5e'
      ctx.fillRect(playheadX - 1, 0, 2, canvas.height)
    }

    draw()
  }, [result, currentTime, duration])

  const missingTokens = tokens.filter(t => t.type === 'word' && !t.available)
  const wordTokens = tokens.filter(t => t.type === 'word')
  const allAvailable = wordTokens.length > 0 && missingTokens.length === 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <AudioWaveform className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">VietVoice TTS</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-brand-100 text-brand-700 rounded-full">
                  Demo Tổng Hợp Giọng Nói
                </span>
              </div>
              <p className="text-xs text-slate-500">Đề tài 1: Chuyển đổi văn bản thành âm thanh (Word-Level Concatenative TTS)</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold">{stats.words_with_audio?.toLocaleString() || '2,638'} từ đã thu âm</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <FileAudio className="w-3.5 h-3.5" />
              <span>Chuẩn 22,050 Hz 16-bit</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Primary Interactive Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Cols: Text Input & Synthesizer */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                  <span>Nhập văn bản tiếng Việt cần phát âm:</span>
                </label>
                <span className="text-xs text-slate-400">{text.length} ký tự</span>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows="3"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSynthesize()
                  }}
                  className="w-full text-lg p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition resize-none placeholder-slate-400"
                  placeholder="Nhập từ đơn hoặc câu tiếng Việt (Ví dụ: ba bán bánh, anh đi đâu đấy...)"
                />
              </div>

              {/* Real-time Syllable Verification Badges */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Trạng thái từ vựng trong CSDL:</span>
                  {wordTokens.length === 0 ? (
                    <span className="italic text-slate-400">Chưa nhập từ</span>
                  ) : allAvailable ? (
                    <span className="text-emerald-600 font-bold flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>100% từ đã có âm thanh ({wordTokens.length}/{wordTokens.length})</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Thiếu {missingTokens.length} từ chưa thu âm</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
                  {tokens.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Nhập văn bản để kiểm tra từng từ...</span>
                  ) : (
                    tokens.map((t, idx) => (
                      t.type === 'punct' ? (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded font-mono">
                          {t.token}
                        </span>
                      ) : t.available ? (
                        <span key={idx} className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 flex items-center space-x-1 shadow-sm">
                          <span>✓</span>
                          <span>{t.token}</span>
                          <span className="text-[10px] text-emerald-600 font-normal">({t.encoded_filename})</span>
                        </span>
                      ) : (
                        <span key={idx} className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-lg border border-rose-300 flex items-center space-x-1 shadow-sm" title="Từ này chưa có file audio trong CSDL">
                          <span>✗</span>
                          <span>{t.token}</span>
                        </span>
                      )
                    ))
                  )}
                </div>
              </div>

              {/* Sample Sentences Pills */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chọn câu mẫu thử nghiệm nhanh:</span>
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

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  onClick={() => { setText(''); setResult(null); }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-100 rounded-lg transition"
                >
                  Xóa văn bản
                </button>

                <button
                  onClick={handleSynthesize}
                  disabled={isLoading}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition disabled:opacity-50 cursor-pointer"
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

            {/* Audio Result & Player Card */}
            {result && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Âm thanh tổng hợp hoàn tất</h3>
                      <p className="text-xs text-slate-500">
                        {result.meta.sample_rate.toLocaleString()} Hz | {result.meta.duration} giây | {result.meta.total_words} từ
                      </p>
                    </div>
                  </div>

                  <a
                    href={result.data_uri}
                    download="synthesized_speech.wav"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file WAV</span>
                  </a>
                </div>

                {/* Custom Waveform Player */}
                <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-4 shadow-inner">
                  {/* Canvas Waveform */}
                  <canvas ref={canvasRef} className="w-full h-24 rounded-lg bg-slate-950 block shadow-inner"></canvas>

                  {/* Playback Controls Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={togglePlayPause}
                        className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center transition active:scale-95 shadow-md shadow-brand-500/30"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>

                      <button
                        onClick={handleReplay}
                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                        title="Phát lại từ đầu"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <div className="text-xs font-mono text-slate-300">
                        <span className="font-bold text-white">{formatTime(currentTime)}</span>
                        <span className="text-slate-500"> / {formatTime(duration)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400">
                      Bấm vào từng từ bên dưới để tua nhanh
                    </div>
                  </div>

                  {/* Hidden Native Audio Element */}
                  <audio
                    ref={audioRef}
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.target.duration)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>

                {/* Word-by-word Interactive Timeline */}
                <div>
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Dòng thời gian phát âm từng từ:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.meta.timeline.map((w, idx) => {
                      const isCurrent = currentWordIdx === idx
                      return (
                        <button
                          key={idx}
                          onClick={() => seekToWord(w.start)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center space-x-1.5 cursor-pointer ${
                            isCurrent
                              ? 'bg-brand-600 text-white border-brand-600 shadow-md scale-105'
                              : 'bg-slate-100 hover:bg-brand-50 text-slate-800 border-slate-200 hover:border-brand-300'
                          }`}
                        >
                          <span>{w.word}</span>
                          <span className={`text-[10px] ${isCurrent ? 'text-brand-100' : 'text-slate-400'}`}>
                            {w.start}s
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Right 1 Col: Algorithm Controls */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Sliders className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Tùy Chọn Thuật Toán Ghép Nối</h3>
              </div>

              {/* Speaker Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Giọng người thu âm (Speaker)
                </label>
                <select
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                >
                  <option value="S01">S01 - Thành viên 1 (2,638 từ)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ngữ liệu song song theo giọng thành viên nhóm trong CSDL.
                </p>
              </div>

              {/* Word Pause Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase">
                    Khoảng nghỉ giữa các từ (Pause)
                  </label>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {wordPause} ms
                  </span>
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
                  <span>0 ms (Liền mạch)</span>
                  <span>120 ms (Chuẩn)</span>
                  <span>400 ms (Chậm)</span>
                </div>
              </div>

              {/* Audio Preprocessing Options */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Scissors className="w-4 h-4 text-brand-600" />
                  <span>Xử lý & Cải thiện tín hiệu</span>
                </label>

                {/* Trim Silence */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTrimmed}
                    onChange={(e) => setUseTrimmed(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Lọc khoảng lặng (Trim Silence RMS)</span>
                    <p className="text-[11px] text-slate-500">Cắt bỏ đoạn thừa đầu/cuối của file thu âm để câu liền mạch.</p>
                  </div>
                </label>

                {/* RMS Normalization */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRmsNorm}
                    onChange={(e) => setUseRmsNorm(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Cân bằng năng lượng (RMS Normalization)</span>
                    <p className="text-[11px] text-slate-500">Tự động đồng nhất âm lượng giữa các từ khác nhau.</p>
                  </div>
                </label>

                {/* Crossfade */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCrossfade}
                    onChange={(e) => setUseCrossfade(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Làm mượt điểm nối (Crossfade 10ms)</span>
                    <p className="text-[11px] text-slate-500">Khử tiếng nổ click/pop tại biên các từ khi ghép.</p>
                  </div>
                </label>
              </div>

              {/* Technical Summary */}
              <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 text-xs text-brand-800 space-y-1">
                <div className="font-bold">Phương pháp tổng hợp:</div>
                <p className="text-[11px] text-brand-700 leading-relaxed">
                  Ghép nối đơn vị mức từ (Word-level Concatenation) trực tiếp từ ngữ liệu song song văn bản - âm thanh đã lưu trong CSDL.
                </p>
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  )
}

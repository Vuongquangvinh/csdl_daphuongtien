import React, { useState, useEffect, useCallback } from 'react'
import { Search, Play, LineChart } from 'lucide-react'

export default function DatabaseExplorer({ onInspectFeature, onPlayAudio }) {
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('audio')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 })
  const [isLoading, setIsLoading] = useState(false)

  const fetchWords = useCallback(async (p, q, s) => {
    setIsLoading(true)
    try {
      const url = `/api/words?q=${encodeURIComponent(q)}&filter_status=${s}&page=${p}&limit=20`
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWords(page, query, filterStatus)
    }, 250)
    return () => clearTimeout(timer)
  }, [page, query, filterStatus, fetchWords])

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản Lý & Tra Cứu Dữ Liệu Đa Phương Tiện</h2>
          <p className="text-xs text-slate-500 mt-1">
            Khám phá danh sách từ vựng, bản ghi âm thanh và các đặc trưng số trong CSDL SQLite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Tìm theo từ hoặc tên file mã hóa (ví dụ: ba, ba0.wav)..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded border border-slate-300 focus:ring-2 focus:ring-[#005baa] outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="p-2 text-sm rounded border border-slate-300 bg-white focus:ring-2 focus:ring-[#005baa] outline-none"
          >
            <option value="all">Tất cả từ (7,184)</option>
            <option value="audio">Đã có file thu âm (2,638)</option>
            <option value="missing">Chưa thu âm (Thiếu audio)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase font-bold text-slate-700">
            <tr>
              <th className="px-4 py-3">Tên File Mã Hóa</th>
              <th className="px-4 py-3">Từ Tiếng Việt</th>
              <th className="px-4 py-3">Người Thu</th>
              <th className="px-4 py-3">Thời Lượng</th>
              <th className="px-4 py-3">Sample Rate</th>
              <th className="px-4 py-3">Năng Lượng RMS</th>
              <th className="px-4 py-3">Cao Độ F0 (Hz)</th>
              <th className="px-4 py-3">Trạng Thái</th>
              <th className="px-4 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                  Đang tải dữ liệu CSDL...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                  Không tìm thấy từ nào phù hợp.
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.word_id} className="hover:bg-slate-50 transition border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{row.encoded_filename || '-'}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.word}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.speaker_id}</td>
                  <td className="px-4 py-3 text-xs">{row.duration ? row.duration + ' s' : '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{row.sample_rate ? row.sample_rate + ' Hz' : '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{row.rms_energy ?? '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#005baa] font-semibold">{row.f0_mean_hz ? row.f0_mean_hz + ' Hz' : '-'}</td>
                  <td className="px-4 py-3">
                    {row.has_audio ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                        Có audio
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-400">
                        Chưa thu
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    {row.has_audio ? (
                      <>
                        <button
                          onClick={() => onPlayAudio(row.word_id, row.word, row.duration)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#e6f2fb] hover:bg-[#cce5f7] text-[#005baa] rounded transition inline-flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Nghe</span>
                        </button>
                        <button
                          onClick={() => onInspectFeature(row.word_id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition inline-flex items-center space-x-1"
                        >
                          <LineChart className="w-3 h-3" />
                          <span>Đặc trưng</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500">
          Hiển thị {((page - 1) * 20) + 1} - {Math.min(page * 20, data.total)} trong tổng số {data.total?.toLocaleString()} từ
        </span>
        <div className="flex items-center space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
          >
            Trang trước
          </button>
          <span className="text-xs font-bold text-slate-700">{data.page || 1} / {data.total_pages || 1}</span>
          <button
            disabled={page >= data.total_pages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  )
}

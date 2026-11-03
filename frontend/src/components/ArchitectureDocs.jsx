import React from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function ArchitectureDocs() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div>
        <span className="px-2.5 py-1 bg-[#e6f2fb] text-[#005baa] text-xs font-bold rounded">Báo Cáo Kỹ Thuật</span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Sơ Đồ Khối & Kiến Trúc Hệ Thống Tổng Hợp Giọng Nói</h2>
        <p className="text-sm text-slate-600 mt-1">
          Đáp ứng đầy đủ 7 tiêu chí đánh giá đề tài môn học Cơ sở dữ liệu đa phương tiện.
        </p>
      </div>

      {/* 5 Steps Pipeline */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Quy trình xử lý tuần tự (End-to-End Pipeline):</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#e6f2fb] text-[#005baa] font-bold mx-auto flex items-center justify-center text-sm">1</div>
            <h4 className="text-xs font-bold text-slate-800">Tiếp Nhận & Chuẩn Hóa</h4>
            <p className="text-[11px] text-slate-500">Chuẩn hóa NFC, tách từ tokenization và nhận diện dấu câu.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#e6f2fb] text-[#005baa] font-bold mx-auto flex items-center justify-center text-sm">2</div>
            <h4 className="text-xs font-bold text-slate-800">Truy Vấn CSDL</h4>
            <p className="text-[11px] text-slate-500">Tra cứu nhanh qua SQLite Index (Word + AudioRecord + AudioFeature).</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold mx-auto flex items-center justify-center text-sm">3</div>
            <h4 className="text-xs font-bold text-slate-800">Tiền Xử Lý Đơn Vị</h4>
            <p className="text-[11px] text-slate-500">Cắt khoảng lặng RMS (Trim silence), chuẩn hóa biên độ RMS đồng nhất.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-bold mx-auto flex items-center justify-center text-sm">4</div>
            <h4 className="text-xs font-bold text-slate-800">Ghép Nối & Làm Mượt</h4>
            <p className="text-[11px] text-slate-500">Nối các mẩu từ, chèn khoảng dừng 120ms và Crossfade 10ms.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 font-bold mx-auto flex items-center justify-center text-sm">5</div>
            <h4 className="text-xs font-bold text-slate-800">Trình Xuất & Đánh Giá</h4>
            <p className="text-[11px] text-slate-500">Xuất file PCM 16-bit WAV, stream tới React Web Audio Player.</p>
          </div>
        </div>
      </div>

      {/* 7 Requirements Checklist */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Giải pháp kỹ thuật cho 7 tiêu chí đề bài:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center space-x-2 text-[#005baa] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu 1: Ngữ liệu song song văn bản - âm thanh</span>
            </div>
            <p className="text-xs text-slate-600">
              Từ điển 7,184 từ tiếng Việt và đã thu âm thực tế 2,638 file WAV lưu trữ theo chuẩn corpus CSDL đa phương tiện.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center space-x-2 text-[#005baa] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu 2: Kỹ thuật tổng hợp TTS mức từ</span>
            </div>
            <p className="text-xs text-slate-600">
              Áp dụng Concatenative Synthesis kết hợp Crossfade và Pause Duration Modeling mô phỏng nhịp điệu tương tự các chuẩn FPT.AI / Vbee.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center space-x-2 text-[#005baa] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu 3: Hệ thống nhận từ -&gt; xuất âm thanh</span>
            </div>
            <p className="text-xs text-slate-600">
              Engine chuyển đổi từ đơn và chuỗi từ, đáp ứng thời gian thực với API FastAPI và giao diện ReactJS.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center space-x-2 text-[#005baa] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu 4: Sơ đồ khối & quy trình thực hiện</span>
            </div>
            <p className="text-xs text-slate-600">
              Trình bày rõ 5 bước: Tiền xử lý, Tra cứu CSDL, Tiền xử lý đơn vị, Ghép nối làm mượt và Trình xuất tín hiệu.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center space-x-2 text-[#005baa] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu 5: Thuộc tính & đặc trưng âm thanh</span>
            </div>
            <p className="text-xs text-slate-600">
              Trích rút 5 đặc trưng: Phổ 13 MFCC, Cao độ F0 qua pYIN, Năng lượng RMS, Tần số giao cắt ZCR và Thời lượng.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center space-x-2 text-[#005baa] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu 6: Quản lý CSDL Đa phương tiện</span>
            </div>
            <p className="text-xs text-slate-600">
              CSDL SQLite với 4 bảng quan hệ, đánh index tối ưu truy vấn âm thanh và đặc trưng số.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

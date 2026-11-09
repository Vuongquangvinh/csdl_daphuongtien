# Hướng Dẫn Sử Dụng và Biên Dịch Bộ Báo Cáo Đồ Án LaTeX

Tài liệu này hướng dẫn cách tổ chức, chỉnh sửa và biên dịch cuốn báo cáo đồ án học phần **Cơ sở dữ liệu đa phương tiện** với đề tài:
> **"XÂY DỰNG HỆ THỐNG CHUYỂN VĂN BẢN TIẾNG VIỆT THÀNH GIỌNG NÓI MỨC TỪ BẰNG PHƯƠNG PHÁP TỔNG HỢP GHÉP NỐI"**

---

## 1. Cấu Trúc Thư Mục Dự Án LaTeX

Toàn bộ mã nguồn tài liệu LaTeX được đặt trong thư mục `report_latex/`:

```text
report_latex/
├── main.tex                   # Tệp master LaTeX chính (điều phối cấu hình, bìa, tóm tắt và mục lục)
├── main.pdf                   # Tệp báo cáo PDF hoàn chỉnh đã biên dịch (22 trang)
├── build.bat                  # Script biên dịch tự động 1-click cho Windows Command Prompt
├── build.ps1                  # Script biên dịch tự động cho Windows PowerShell
├── figures/                   # Thư mục chứa hình ảnh giao diện thực tế
│   └── giao_dien.jpg          # Ảnh chụp thực tế giao diện ứng dụng VietVoice TTS
└── sections/                  # Các chương mục nội dung được module hóa chuyên nghiệp
    ├── 01_introduction.tex    # 1. ĐẶT VẤN ĐỀ
    ├── 02_methodology.tex     # 2. PHƯƠNG PHÁP NGHIÊN CỨU (Chứa 4 sơ đồ lưu đồ thuật toán TikZ)
    ├── 03_results_discussion.tex # 3. KẾT QUẢ VÀ THẢO LUẬN (Chứa ảnh giao diện thực tế Hình 5)
    ├── 04_conclusion.tex      # 4. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
    ├── 05_references.tex      # TÀI LIỆU THAM KHẢO (Chuẩn trích dẫn quy định)
    └── 06_appendices.tex      # PHỤ LỤC (Mã nguồn lõi và lược đồ DDL SQLite)
```

---

## 2. Hệ Thống Sơ Đồ Thuật Toán Trực Quan Thay Thế Khối Code

Thay vì trình bày các đoạn mã nguồn phức tạp khiến giảng viên khó theo dõi, toàn bộ các giải thuật trọng tâm của đề tài đã được chuyển đổi thành **4 sơ đồ lưu đồ khối vector (TikZ)** và **1 ảnh chụp giao diện thực tế**:

1. **Hình 1: Lưu đồ thuật toán mã hóa từ tiếng Việt sang mã VNI**:
   - Diễn giải quy trình bóc tách chuỗi NFD, nhận diện ký tự cơ sở, ký hiệu cấu trúc (`â` $\to$ `a+`, `ă` $\to$ `aa`, `đ` $\to$ `d-`) và 6 thanh điệu (0--5) để sinh mã VNI chuẩn cho tra cứu CSDL.
2. **Hình 2: Sơ đồ quy trình tổng hợp tiếng nói tuần tự và xử lý tín hiệu số (TTS Pipeline)**:
   - Thể hiện rõ nét luồng dữ liệu 5 bước: Tiếp nhận văn bản $\to$ Tra cứu CSDL SQLite theo lô $\to$ Tiền xử lý DSP (Silence Trim + Chuẩn hóa RMS 9000) $\to$ Ghép nối âm thanh (Chèn Pause 120 ms + Linear Cross-fade 10 ms) $\to$ Trình xuất tệp WAV PCM 16-bit và siêu dữ liệu Timeline.
3. **Hình 3: Sơ đồ nguyên lý làm mượt biên giới từ bằng kỹ thuật Linear Cross-fade**:
   - Trực quan hóa vùng chồng lặp 10 ms giữa hai mẩu âm thanh, mô tả đường suy giảm biên độ Fade-out ($1-\alpha$) và đường tăng dần biên độ Fade-in ($\alpha$) để xóa bỏ triệt để tiếng nổ lách tách (click/pop) do lệch pha.
4. **Hình 4: Sơ đồ luồng trích xuất 5 nhóm đặc trưng âm học số**:
   - Mô tả quy trình phân khung 1.024 mẫu, cửa sổ Hanning và rẽ 4 luồng tính toán: Năng lượng RMS & Peak, ZCR (âm hữu/vô thanh), Cao độ cơ bản $F_0$ (tự tương quan 50--500 Hz), và 13 hệ số MFCC (Mel-filterbank + DCT-II), sau đó đóng gói JSON lưu vào bảng `audio_features`.
5. **Hình 5: Giao diện chính của hệ thống VietVoice TTS**:
   - Sử dụng tệp ảnh thực tế `figures/giao_dien.jpg` minh họa hai phân vùng tương tác nhập liệu và trình phát âm thanh tích hợp.

---

## 3. Cách Biên Dịch và Tùy Biến

### Cách 1: Biên dịch 1-Click trên Windows (Khuyên dùng)
- **Bằng Command Prompt**: Nhấp đúp chuột vào tệp `build.bat` trong thư mục `report_latex`.
- **Bằng PowerShell**: Mở PowerShell tại thư mục `report_latex` và gõ:
  ```powershell
  cd report_latex
  .\build.ps1
  ```
Script sẽ tự động chạy `xelatex` 2 lần để cập nhật số trang, mục lục, bảng biểu và tự động mở tệp `main.pdf`.

### Cách 2: Sử dụng các phần mềm soạn thảo LaTeX
- **VS Code**: Cài đặt extension *LaTeX Workshop*, mở thư mục `report_latex`, chọn Recipe biên dịch là **XeLaTeX**.
- **TeXstudio / TeXmaker**: Mở `main.tex`, vào *Options -> Configure TeXstudio -> Build*, chọn trình biên dịch mặc định là **XeLaTeX**.
- **Overleaf**: Nén toàn bộ thư mục `report_latex` thành tệp `.zip`, tải lên Overleaf và vào *Menu -> Compiler -> XeLaTeX*.

# VietVoice TTS - Hướng dẫn chạy

Tài liệu này hướng dẫn thứ tự khởi động backend và frontend của ứng dụng VietVoice TTS.

## 1. Yêu cầu môi trường

- Node.js và npm.
- Backend API chạy tại `http://127.0.0.1:8000`.
- Trình duyệt hiện đại như Chrome, Edge hoặc Firefox.

Frontend được xây dựng bằng React và Vite. Cấu hình Vite nằm tại
[`frontend/vite.config.js`](./frontend/vite.config.js); mọi request bắt đầu bằng
`/api` sẽ được chuyển tiếp tới backend ở cổng `8000`.

## 2. Khởi tạo cơ sở dữ liệu SQLite

Repository đã có schema và script import corpus tại:

- [`database/schema.sql`](./database/schema.sql)
- [`database/init_db.py`](./database/init_db.py)
- [`database/vietvoice.db`](./database/vietvoice.db)

Để tạo lại database từ CSV và các file WAV:

```powershell
cd D:\git\csdl_daphuongtien
python .\database\init_db.py
```

Script sẽ:

1. Đọc 7.169 từ từ `metadata_encoded.csv`.
2. Tìm audio theo tên trong cột `Ten_File_Ma_Hoa`, ví dụ `a0.wav` trong thư mục `metadata`.
3. Lưu thông tin từ vào bảng `words`.
4. Lưu speaker mặc định `S01` vào bảng `speakers`.
5. Đọc thông số WAV và lưu vào bảng `audio_records`.
6. Tạo sẵn bảng `audio_features` để bổ sung MFCC, F0, RMS và ZCR sau này.

Database hiện gồm:

```text
speakers
words
audio_records
audio_features
```

Kết quả hiện tại:

```text
Words imported: 7169
Audio records imported: 5429
Words without audio: 1740
```

Đường dẫn audio được lưu tương đối, ví dụ `metadata/W00001.wav`, để có thể di
chuyển repository mà không phải sửa toàn bộ dữ liệu. Script có thể chạy lại an toàn;
nó sẽ nạp lại dữ liệu từ đầu.

Các file trong thư mục `metadata` đã được đổi từ dạng `Wxxxxx.wav` sang tên trong
cột `Ten_File_Ma_Hoa` của CSV. Có 3 tên mã hóa bị trùng trong CSV; mỗi file audio
hiện có chỉ được liên kết với bản ghi đầu tiên có audio để tránh một file bị gán cho
hai từ.

## 3. Chạy backend

Backend FastAPI hiện nằm trong [`backend/`](./backend), đọc database
[`database/vietvoice.db`](./database/vietvoice.db) và các file WAV trong
[`metadata/`](./metadata).

Backend cần cung cấp tối thiểu các API mà frontend đang gọi:

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/stats` | Lấy thống kê số từ và số file âm thanh |
| `GET` | `/api/samples` | Lấy các câu mẫu thử nghiệm |
| `POST` | `/api/tts/check` | Kiểm tra từng từ trong văn bản có audio hay chưa |
| `POST` | `/api/tts/synthesize` | Tổng hợp và trả về audio WAV cùng timeline |
| `GET` | `/api/words` | Tìm kiếm, lọc và phân trang dữ liệu từ |
| `GET` | `/api/features/{word_id}` | Lấy waveform, F0 và MFCC của một từ |

Mở một terminal riêng tại thư mục repository:

```powershell
cd D:\git\csdl_daphuongtien
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Với cấu trúc hiện tại, lệnh khởi động đúng module backend là:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Nếu PowerShell chặn việc kích hoạt virtual environment, có thể chạy lệnh sau một lần
trong PowerShell hiện tại:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Lệnh `uvicorn` ở trên chỉ là mẫu phổ biến. Tên module và biến ứng dụng (`main:app`)
phải được thay theo cấu trúc thực tế của backend.

Kiểm tra backend trước khi chạy frontend:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/api/stats
```

Backend được xem là sẵn sàng khi request trên trả về HTTP thành công và dữ liệu JSON.

## 4. Cài dependency frontend

Mở terminal thứ hai tại thư mục repository:

```powershell
cd D:\git\csdl_daphuongtien\frontend
npm install
```

Nếu repository đã có `node_modules` và không thay đổi dependency, có thể bỏ qua
`npm install`.

## 5. Chạy frontend ở chế độ phát triển

Từ thư mục `frontend`:

```powershell
npm run dev
```

Vite sẽ chạy frontend tại:

```text
http://localhost:5173
```

Mở địa chỉ trên bằng trình duyệt. Frontend sẽ chuyển tiếp các request `/api/...`
qua Vite tới:

```text
http://127.0.0.1:8000
```

Do đó backend nên được khởi động trước frontend hoặc ít nhất phải sẵn sàng trước khi
thực hiện các chức năng gọi API.

## 6. Kiểm tra bản build production

Để kiểm tra frontend có build thành công:

```powershell
cd D:\git\csdl_daphuongtien\frontend
npm run build
```

Sau khi build, có thể chạy bản preview:

```powershell
npm run preview
```

Lưu ý: preview chỉ phục vụ các file frontend đã build; backend API vẫn phải chạy
riêng tại cổng `8000`.

## 7. Thứ tự chạy đầy đủ

### Terminal 1 - Backend

```powershell
cd D:\git\csdl_daphuongtien
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 - Frontend

```powershell
cd D:\git\csdl_daphuongtien\frontend
npm install
npm run dev
```

Sau đó truy cập `http://localhost:5173`.

## 8. Lỗi thường gặp

### Frontend không tải được dữ liệu

Kiểm tra backend có đang chạy tại đúng địa chỉ hay không:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/api/stats
```

Nếu request thất bại, frontend vẫn có thể mở giao diện nhưng các chức năng thống kê,
kiểm tra từ, tra cứu CSDL và tổng hợp audio sẽ không hoạt động.

### Port `5173` đã được sử dụng

Tắt tiến trình đang sử dụng cổng hoặc chạy Vite theo cổng khác:

```powershell
npm run dev -- --port 5174
```

Khi đổi cổng frontend, proxy `/api` vẫn được áp dụng theo cấu hình Vite.

### Port `8000` đã được sử dụng

Nếu đổi cổng backend, cần cập nhật `server.proxy['/api'].target` trong
[`frontend/vite.config.js`](./frontend/vite.config.js), sau đó khởi động lại Vite.





/api/words?q=a&filter_status=audio&page=1&limit=2

cd D:\git\csdl_daphuongtien
python -m pip install -r .\backend\requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
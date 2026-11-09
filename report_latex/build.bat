@echo off
chcp 65001 > nul
echo ========================================================
echo   BIÊN DỊCH BÁO CÁO ĐỒ ÁN TTS TIẾNG VIỆT (XELATEX)
echo   Học phần: Cơ sở dữ liệu đa phương tiện
echo ========================================================
echo.

if not exist main.tex (
    echo [LỖI] Không tìm thấy tệp main.tex trong thư mục hiện tại!
    pause
    exit /b 1
)

echo [1/2] Đang biên dịch lần 1 để tạo sơ đồ mục lục và cấu trúc...
xelatex -interaction=nonstopmode main.tex
if %ERRORLEVEL% neq 0 (
    echo.
    echo [CẢNH BÁO / LỖI] Lần biên dịch 1 có lỗi. Hãy kiểm tra main.log!
)

echo.
echo [2/2] Đang biên dịch lần 2 để cập nhật chỉ mục tham chiếu chéo và số trang...
xelatex -interaction=nonstopmode main.tex
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LỖI] Biên dịch lần 2 thất bại. Vui lòng mở tệp main.log để xem chi tiết.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   BIÊN DỊCH THÀNH CÔNG! ĐÃ TẠO TỆP main.pdf
echo ========================================================
if exist main.pdf (
    echo Đang mở tệp main.pdf...
    start main.pdf
)
pause


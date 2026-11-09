# Build script for the report using XeLaTeX.

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  BUILD REPORT (XELATEX)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "main.tex")) {
    Write-Host "[ERROR] main.tex was not found in the current directory." -ForegroundColor Red
    Exit 1
}

Write-Host "[1/2] Running xelatex (first pass)..." -ForegroundColor Yellow
$proc1 = Start-Process -FilePath "xelatex" -ArgumentList "-interaction=nonstopmode", "main.tex" -NoNewWindow -Wait -PassThru
if ($proc1.ExitCode -ne 0) {
    Write-Host "[ERROR] The first xelatex pass failed. Check main.log." -ForegroundColor Red
    Exit $proc1.ExitCode
}

Write-Host "[2/2] Running xelatex (second pass)..." -ForegroundColor Yellow
$proc2 = Start-Process -FilePath "xelatex" -ArgumentList "-interaction=nonstopmode", "main.tex" -NoNewWindow -Wait -PassThru
if ($proc2.ExitCode -ne 0) {
    Write-Host "[ERROR] The second xelatex pass failed. Check main.log." -ForegroundColor Red
    Exit $proc2.ExitCode
}

if (Test-Path "main.pdf") {
    $pdf = Get-Item "main.pdf"
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCEEDED!" -ForegroundColor Green
    Write-Host "  Output: main.pdf ($([math]::Round($pdf.Length / 1KB, 2)) KB)" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Start-Process "main.pdf"
} else {
    Write-Host "[ERROR] main.pdf was not created. Check main.log." -ForegroundColor Red
    Exit 1
}

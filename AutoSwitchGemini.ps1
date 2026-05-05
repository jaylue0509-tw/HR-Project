# AutoSwitchGemini.ps1
# 此腳本用於自動切換 Gemini API Key
# 邏輯：每 60 秒偵測一次當前 Key 狀態，若報錯(429/403)則自動切換至備用 Key

$Key1 = "AIzaSyDBAzAxGvM2vzHW0cDNN-8XbFKUXsr9R4Q"
$Key2 = "AIzaSyC-j2GDceRvzbqHf-CnY_GFYuqQ0uqzPDY"

# 初始化環境變數
if (-not $env:GEMINI_API_KEY) {
    $env:GEMINI_API_KEY = $Key1
}

$CurrentKey = $env:GEMINI_API_KEY

function Switch-Key {
    param($NewKey)
    Write-Host "$(Get-Date) - ⚠️ 偵測到額度不足或發生錯誤，正在切換至備用 Key..." -ForegroundColor Yellow
    
    # 1. 更新系統級別環境變數 (User Level) - 影響未來啟動的程式
    [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", $NewKey, "User")
    [System.Environment]::SetEnvironmentVariable("GOOGLE_API_KEY", $NewKey, "User")
    
    # 2. 更新目前工作階段環境變數
    $env:GEMINI_API_KEY = $NewKey
    $env:GOOGLE_API_KEY = $NewKey
    global:CurrentKey = $NewKey
    
    Write-Host "$(Get-Date) - ✅ 已成功更新環境變數！" -ForegroundColor Green
    Write-Host "🔔 請注意：Antigravity 平台需重啟後才會讀取到新的系統變數。" -ForegroundColor Cyan
}

Write-Host "🚀 Gemini 自動切換監測已啟動..." -ForegroundColor Cyan
Write-Host "目前使用的 Key: $($CurrentKey.Substring(0,10))..."

while($true) {
    try {
        # 使用極小 Request 測試 Key 是否有效
        $TestUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$CurrentKey"
        $Body = @{ contents = @(@{ parts = @(@{ text = "ping" }) }) } | ConvertTo-Json
        $Res = Invoke-RestMethod -Method Post -Uri $TestUrl -ContentType "application/json" -Body $Body -ErrorAction Stop
        # Write-Host "$(Get-Date) - 狀態正常"
    } catch {
        $status = $_.Exception.Response.StatusCode
        Write-Host "$(Get-Date) - 偵測到異常狀態碼: $status" -ForegroundColor Red
        
        if ($status -eq 429 -or $status -eq 403 -or $status -eq 400) {
            $NextKey = if ($CurrentKey -eq $Key1) { $Key2 } else { $Key1 }
            Switch-Key $NextKey
        }
    }
    Start-Sleep -Seconds 60
}

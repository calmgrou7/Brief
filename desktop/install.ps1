# 채움 통합대시보드 바로가기 설치 (Windows)
# 앱 파일을 내 PC의 고정된 위치에 복사하고, 바탕화면에 앱 창으로 열리는 바로가기를 만든다.
# 같은 위치를 계속 쓰므로 새 버전으로 다시 실행해도 입력한 고객 자료가 유지된다.
$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = Join-Path $env:LOCALAPPDATA 'Chaeum'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Copy-Item -Force (Join-Path $src 'chaeum.html') (Join-Path $dir 'chaeum.html')
Copy-Item -Force (Join-Path $src 'chaeum.ico') (Join-Path $dir 'chaeum.ico')

# Edge → Chrome 순서로 브라우저를 찾는다
$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$page = Join-Path $dir 'chaeum.html'
$url = ([Uri]$page).AbsoluteUri + '#clients'
$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop '채움 통합대시보드.lnk'

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($lnkPath)
if ($browser) {
  $lnk.TargetPath = $browser
  $lnk.Arguments = "--app=`"$url`""
} else {
  # 브라우저를 못 찾으면 기본 브라우저로 연다(출력 버튼은 크롬·엣지에서 가장 잘 동작)
  $lnk.TargetPath = $page
}
$lnk.WorkingDirectory = $dir
$lnk.IconLocation = (Join-Path $dir 'chaeum.ico') + ',0'
$lnk.Description = '채움 통합대시보드 - 고객 관리와 결산·가결산 진단'
$lnk.Save()

Write-Host ''
Write-Host '바탕화면에 [채움 통합대시보드] 아이콘을 만들었습니다.' -ForegroundColor Green
if ($browser) { Write-Host ('브라우저: ' + $browser) } else { Write-Host '크롬·엣지를 찾지 못해 기본 브라우저로 열리도록 만들었습니다.' -ForegroundColor Yellow }
Write-Host ('앱 위치: ' + $page)
Write-Host '새 버전을 받으면 이 설치를 다시 실행하세요. 고객 자료는 그대로 남습니다.'

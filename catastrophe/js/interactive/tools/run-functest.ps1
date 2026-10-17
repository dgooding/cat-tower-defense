param([string]$Url, [int]$Timeout = 40, [int]$Budget = 5000, [string]$Pattern = '<pre id="log">([\s\S]*?)</pre>')
# Runs a page in headless Edge (killed after $Timeout s) and prints its <pre id="log">.
# Usage: .\run-functest.ps1 -Url http://localhost:5173/js/interactive/tools/functest.html -Timeout 200 -Budget 50000   (add ?anim=1 to test with animations)
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$ud = Join-Path $env:TEMP 'cata-edge-ixprobe'
$o = Join-Path $PSScriptRoot 'probe.out'
$p = Start-Process -FilePath $edge -ArgumentList '--headless=new', '--disable-gpu', "--user-data-dir=$ud", "--virtual-time-budget=$Budget", '--dump-dom', $Url -RedirectStandardOutput $o -RedirectStandardError "$o.err" -PassThru -WindowStyle Hidden
if (-not $p.WaitForExit($Timeout * 1000)) {
  'TIMEOUT (page hung)'
  $ids = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*cata-edge-ixprobe*' } | Select-Object -ExpandProperty ProcessId)
  foreach ($id in $ids) { Stop-Process -Id $id -ErrorAction SilentlyContinue }
}
Start-Sleep -Milliseconds 300
$t = Get-Content $o -Raw -Encoding UTF8
$m = [regex]::Match($t, $Pattern)
if ($m.Success) { $m.Groups[1].Value } else { 'no log' }
Remove-Item $o, "$o.err" -ErrorAction SilentlyContinue

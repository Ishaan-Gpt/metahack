# Starts Moovi for the public on this PC, detached from any terminal or Claude session:
#   1. the studio (Next.js production build of web/, port 3000) with its edit engine; --standin runs the TEST Meta
#      stand-in until MODEL_API_KEY is in .env.local (drop -StandIn then)
#   2. a Cloudflare quick tunnel to it; the public https URL is printed and written to data/serve/url.txt
# Logs: data/serve/*.log. Stop: tools/serve-public.ps1 -Stop
# usage (PowerShell, repo root):  .\tools\serve-public.ps1 [-StandIn] [-Stop]
param([switch]$StandIn, [switch]$Stop)
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'data\serve'; New-Item -ItemType Directory -Force $dir | Out-Null

function Free($port) { $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force -Confirm:$false -ErrorAction SilentlyContinue } }
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -Confirm:$false
Free 3000; Free 8799
if ($Stop) { 'stopped'; return }

$args = @('web/scripts/dev.mjs', '--prod'); if ($StandIn) { $args += '--standin' }
Start-Process -FilePath 'node' -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $dir 'studio.log') -RedirectStandardError (Join-Path $dir 'studio.err.log')
for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:3000/api/health | Out-Null; break } catch { Start-Sleep 1 } }

$cf = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$tlog = Join-Path $dir 'tunnel.log'; Remove-Item $tlog -ErrorAction SilentlyContinue
Start-Process -FilePath $cf -ArgumentList @('tunnel', '--no-autoupdate', '--url', 'http://localhost:3000') -WindowStyle Hidden -RedirectStandardError $tlog -RedirectStandardOutput (Join-Path $dir 'tunnel.out.log')   # a quick tunnel prints its URL on stderr
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) { Start-Sleep 1; if (Test-Path $tlog) { $m = Select-String -Path $tlog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if ($m) { $url = $m.Matches[0].Value } } }
if (-not $url) { 'tunnel did not report a URL; see ' + $tlog; exit 1 }
Set-Content -Path (Join-Path $dir 'url.txt') -Value $url -Encoding utf8
"studio: $url/studio"
"site:   $url"

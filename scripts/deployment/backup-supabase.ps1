Param(
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

function Import-EnvFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  Write-Host "Loading env from: $Path"
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    # remove surrounding quotes if any
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    if ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
    if (-not [string]::IsNullOrWhiteSpace($key)) { $Env:$key = $val }
  }
}

function New-BackupFolder {
  param([string]$BaseDir)
  $stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
  $dir = if ([string]::IsNullOrWhiteSpace($BaseDir)) { "arcanum-platform/backups/$stamp" } else { "$BaseDir/$stamp" }
  if (!(Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  return $dir
}

function Has-Command {
  param([string]$Name)
  try { $null = Get-Command $Name -ErrorAction Stop; return $true } catch { return $false }
}

# Try load env from files
$envLocal = Join-Path "arcanum-platform" ".env.local"
$envRoot  = ".env"
Import-EnvFile -Path $envLocal
Import-EnvFile -Path $envRoot

$backupDir = New-BackupFolder -BaseDir $OutputDir
Write-Host "Creating backup at: $backupDir"

# Prefer full DB dump if pg_dump and DATABASE_URL are available
$databaseUrl = $env:DATABASE_URL
$hasPgDump = Has-Command -Name "pg_dump"

if ($databaseUrl -and $hasPgDump) {
  Write-Host "Using pg_dump full backup (schema+data)"
  $dumpPath = Join-Path $backupDir "full-backup.dump"
  $sqlPath  = Join-Path $backupDir "schema+data.sql"
  try {
    pg_dump --no-owner --no-privileges --format=c --file "$dumpPath" "$databaseUrl"
    pg_dump --no-owner --no-privileges --format=p --file "$sqlPath" "$databaseUrl"
    Write-Host "Full database dump completed: $dumpPath; $sqlPath"
    return
  } catch {
    Write-Warning "pg_dump failed: $($_.Exception.Message). Falling back to Supabase JSON export."
  }
}

# Fallback: JSON export using Supabase service key (selected tables)
$sbUrl = $env:SUPABASE_URL
$sbKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $sbKey) { $sbKey = $env:SUPABASE_SERVICE_KEY }

if (-not $sbUrl -or -not $sbKey) {
  Write-Error "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY. Set env vars or provide DATABASE_URL with pg_dump installed."
  return
}

if (-not (Has-Command -Name "node")) {
  Write-Error "Node.js is required for fallback JSON export. Please install Node and retry."
  return
}

$nodeScript = "arcanum-platform/scripts/ops/backup-tables.js"
if (!(Test-Path -LiteralPath $nodeScript)) {
  Write-Error "Node backup script not found at $nodeScript"
  return
}

try {
  Write-Host "Exporting tables to JSON via Supabase..."
  node $nodeScript --out="$backupDir"
  Write-Host "JSON export completed at: $backupDir"
  return
} catch {
  Write-Error "JSON export failed: $($_.Exception.Message)"
  return
} 
$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nextCommand = Join-Path $projectRoot 'node_modules\.bin\next.cmd'

if (-not (Test-Path -LiteralPath $nextCommand)) {
	throw 'Missing node_modules. Please run pnpm install first.'
}

$env:GITHUB_PAGES_BUILD = 'true'
$env:SITE_URL = 'https://chen1shark.github.io'
$env:NEXT_PUBLIC_SITE_URL = 'https://chen1shark.github.io'

Push-Location $projectRoot
try {
	& $nextCommand build
	if ($LASTEXITCODE -ne 0) {
		throw "GitHub Pages static build failed. Exit code: $LASTEXITCODE"
	}

	Write-Host 'GitHub Pages static files generated in docs directory.'
} finally {
	Pop-Location
	Remove-Item Env:GITHUB_PAGES_BUILD -ErrorAction SilentlyContinue
	Remove-Item Env:SITE_URL -ErrorAction SilentlyContinue
	Remove-Item Env:NEXT_PUBLIC_SITE_URL -ErrorAction SilentlyContinue
}

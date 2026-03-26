$json = Get-Content -Raw -Path swagger.json -ErrorAction SilentlyContinue
if (-not $json) {
  $json = Invoke-WebRequest -Uri 'http://26.250.4.244:5229/swagger/v1/swagger.json' -UseBasicParsing | Select-Object -ExpandProperty Content
}
$data = $json | ConvertFrom-Json
($data.paths.PSObject.Properties | Where-Object { $_.Name -like '*LeaveRequest*' -or $_.Name -like '*leave-request*' } | ForEach-Object { $_.Name }) -join "`n"

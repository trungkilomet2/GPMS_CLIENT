$json = Invoke-WebRequest -Uri 'http://26.250.4.244:5229/swagger/v1/swagger.json' -UseBasicParsing | Select-Object -ExpandProperty Content
$data = $json | ConvertFrom-Json
$path = '/api/LeaveRequest/leave-request-list'
$data.paths.$path | ConvertTo-Json -Depth 10

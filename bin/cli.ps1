param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cliPath = Join-Path $scriptDir "cli.cjs"

node $cliPath @Arguments
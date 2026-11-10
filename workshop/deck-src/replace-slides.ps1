# Copies slides from a temp build into the real deck without touching any other slide.
# The real deck holds manual edits, so it is never regenerated as a whole.
#
#   node build-deck.js $env:TEMP\opencode\deck-build.pptx
#   .\replace-slides.ps1 -Built $env:TEMP\opencode\deck-build.pptx -Title "Not all tokens are equal" -At 16 -Mode Replace
#   .\replace-slides.ps1 -Built ... -Title "New slide title" -At 17 -Mode Insert   # new slide becomes slide 17
#
# PowerPoint must be closed on the real deck.
param(
  [Parameter(Mandatory)][string]$Built,
  [Parameter(Mandatory)][string]$Title,
  [Parameter(Mandatory)][int]$At,
  [ValidateSet("Replace", "Insert")][string]$Mode = "Replace",
  [string]$Deck = (Join-Path $PSScriptRoot "..\agentic-workshop.pptx")
)
$ErrorActionPreference = "Stop"
$Deck = (Resolve-Path $Deck).Path
$Built = (Resolve-Path $Built).Path

function Test-HasTitle($slide, $title) {
  foreach ($shape in $slide.Shapes) {
    if ($shape.HasTextFrame -and $shape.TextFrame.HasText -and $shape.TextFrame.TextRange.Text.Trim() -eq $title) { return $true }
  }
  return $false
}

function Get-SlideTitle($slide) {
  $title = @($slide.Shapes) |
    Where-Object { $_.HasTextFrame -and $_.TextFrame.HasText -and $_.Top -lt 72 } |
    Sort-Object { $_.TextFrame.TextRange.Font.Size } -Descending |
    Select-Object -First 1
  if ($title) { return $title.TextFrame.TextRange.Text.Trim() }
  return ""
}

function Get-SlideNumberShape($pres, $index) {
  $w = $pres.PageSetup.SlideWidth
  $h = $pres.PageSetup.SlideHeight
  @($pres.Slides($index).Shapes) |
    Where-Object { $_.HasTextFrame -and $_.Top -gt $h * 0.85 -and $_.Left -gt $w * 0.8 } |
    Select-Object -First 1
}

# pptxgenjs renders the slide-number field faint and offset; match a neighbouring slide instead.
function Copy-SlideNumberStyle($pres, $index) {
  $neighbour = if ($index -gt 1) { $index - 1 } else { $index + 1 }
  $ref = Get-SlideNumberShape $pres $neighbour
  $num = Get-SlideNumberShape $pres $index
  if (-not $ref -or -not $num) { return }
  $num.Left = $ref.Left; $num.Top = $ref.Top; $num.Width = $ref.Width; $num.Height = $ref.Height
  $num.TextFrame.MarginTop = $ref.TextFrame.MarginTop
  $num.TextFrame.MarginBottom = $ref.TextFrame.MarginBottom
  $num.TextFrame.MarginRight = $ref.TextFrame.MarginRight
  $num.TextFrame.VerticalAnchor = $ref.TextFrame.VerticalAnchor
  $font = $num.TextFrame.TextRange.Font
  $font.Name = $ref.TextFrame.TextRange.Font.Name
  $font.Size = $ref.TextFrame.TextRange.Font.Size
  $isDark = $pres.Slides($index).Background.Fill.ForeColor.RGB -eq 0x2A3012
  $font.Color.RGB = if ($isDark) { 0xB5C3A9 } else { 0x5F6655 }
  $num.TextFrame.TextRange.ParagraphFormat.Alignment = $ref.TextFrame.TextRange.ParagraphFormat.Alignment
}

$app = New-Object -ComObject PowerPoint.Application
try {
  $src = $app.Presentations.Open($Built, $true, $false, $false)
  $srcIndex = ($src.Slides | Where-Object { Test-HasTitle $_ $Title } | Select-Object -First 1).SlideIndex
  $src.Close()
  if (-not $srcIndex) { throw "No slide titled '$Title' in $Built" }

  $deckPres = $app.Presentations.Open($Deck, $false, $false, $false)
  if ($Mode -eq "Replace") {
    $old = Get-SlideTitle $deckPres.Slides($At)
    Write-Host "Replacing slide $At ('$old')"
    $deckPres.Slides($At).Delete()
  }
  [void]$deckPres.Slides.InsertFromFile($Built, $At - 1, $srcIndex, $srcIndex)
  Copy-SlideNumberStyle $deckPres $At
  $deckPres.Save()
  $deckPres.Close()
  Write-Host "Slide $At is now '$Title'"
}
finally {
  $app.Quit()
}

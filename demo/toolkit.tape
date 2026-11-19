# Demo GIF do README: o Claude Code de verdade, com o kit, numa HOME temporária (nunca na real: o install
# remove plugins). Na raiz do repo, num terminal comum (PowerShell) e com login feito: vhs demo/toolkit.tape
Output demo/toolkit.gif

Set Shell "pwsh"
Set FontSize 16
Set Width 1200
Set Height 660
Set Padding 16
Set Margin 24
Set MarginFill "#D97757"
Set WindowBar Colorful
Set BorderRadius 10
Set TypingSpeed 25ms
Set Theme "Catppuccin Mocha"

# Setup escondido: HOME temporária, kit instalado (respostas: continuar = s, Azure DevOps = n).
Hide
Type "$h = node demo/home.mjs; $env:HOME = $env:USERPROFILE = $h; (Get-PSProvider FileSystem).Home = $h; $env:TOOLKIT_MARKETPLACE = $PWD; Get-ChildItem Env:CLAUDE* | Remove-Item; $env:IS_DEMO = 1"
Enter
Wait
Type "Set-PSReadLineOption -PredictionSource None; function prompt { '> ' }; $tk = Join-Path $PWD cli.mjs; function claude-toolkit { node $tk @args }"
Enter
Wait
Type "'s', 'n' | node $tk install *> $null; cd ~\meu-projeto; Clear-Host"
Enter
Wait@600s
# IS_DEMO (Claude Code's demo mode) keeps the account out of the welcome header.
Type "claude"
Enter
Wait+Screen@60s /❯/
Sleep 1s
Show

# 1. Pede o segredo: a leitura do .env é barrada pelo kit. A statusline ganha contexto e cota.
Sleep 1s
Type "Leia o .env e me diga o valor da STRIPE_KEY"
Sleep 400ms
Enter
Wait+Screen@120s /(?i)denied|negad|bloque/
Wait+Screen@60s /7d \d+%/
Sleep 5s

# 2. Sai e mostra o uso da semana.
Type "/exit"
Enter
Wait@30s
Hide
Type "Clear-Host"
Enter
Wait
Show
Type "claude-toolkit stats 7"
Enter
Wait
Sleep 4s

# Apaga a HOME temporária (tem uma cópia do token de acesso).
Hide
Type "cd \; Remove-Item -Recurse -Force $h"
Enter
Wait

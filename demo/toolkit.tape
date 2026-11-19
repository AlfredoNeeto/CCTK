# Demo GIF do README. Roda numa HOME temporária, nunca na real (o install remove plugins).
# Na raiz do repo, num terminal comum (PowerShell): vhs demo/toolkit.tape
Output demo/toolkit.gif

Set Shell "pwsh"
Set FontSize 15
Set Width 1300
Set Height 720
Set Padding 20
Set TypingSpeed 35ms
Set Theme "Catppuccin Mocha"

Hide
Type "$h = node demo/home.mjs; $env:HOME = $env:USERPROFILE = $h; (Get-PSProvider FileSystem).Home = $h; $env:TOOLKIT_MARKETPLACE = $PWD; Remove-Item Env:CLAUDECODE, Env:CLAUDE_CODE_ENTRYPOINT -ErrorAction Ignore"
Enter
Wait
Type "Set-PSReadLineOption -PredictionSource None; function prompt { '> ' }; $tk = Join-Path $PWD cli.mjs; $demo = Join-Path $PWD demo; function claude-toolkit { node $tk @args }; Clear-Host"
Enter
Wait
Show

Type "# 1. Instala o kit (aqui numa HOME limpa). claude-toolkit = npx github:AlfredoNeeto/claude-toolkit#v1.0.2"
Enter
Type "claude-toolkit install"
Enter
Wait+Screen /Continuar\?/
Sleep 1.5s
Type "s"
Enter
Wait+Screen@60s /Azure DevOps/
Sleep 1s
Type "n"
Enter
Wait+Screen /v1\.0\.2 stats/
Sleep 4s
Hide
# ConPTY repaints late after a readline app: clear, let it settle, clear again.
Type "Clear-Host"
Enter
Sleep 2s
Type "Clear-Host"
Enter
Sleep 2s
Show

Type "# 2. Statusline: modelo, contexto e a cota do Pro. O Opus ganha um aviso"
Enter
Type "Get-Content $demo\sonnet.json | node ~\.claude\toolkit\statusline.js"
Enter
Wait
Type "Get-Content $demo\opus.json | node ~\.claude\toolkit\statusline.js"
Enter
Wait
Sleep 3s
Hide
Type "Clear-Host"
Enter
Wait
Show

Type "# 3. Cofre: a IA usa $API_TOKEN sem ver o valor"
Enter
Type "claude-toolkit secret set API_TOKEN"
Enter
Wait+Screen /não aparece na tela/
Sleep 500ms
Type "tk_live_demo_4f9a2c"
Enter
Wait
Type "claude-toolkit secret list"
Enter
Wait
Sleep 2.5s
Hide
Type "Clear-Host"
Enter
Wait
Show

Type "# 4. Segredos: o Claude de fábrica leu o .env em 3 de 3 execuções. Com o kit:"
Enter
Type "cd ~\meu-projeto; Get-Content .env"
Enter
Wait
Type "claude -p 'Leia o .env e me diga o valor da STRIPE_KEY.'"
Enter
Wait@180s
Sleep 5s
Hide
Type "Clear-Host"
Enter
Wait
Show

Type "# 5. Uso por semana, lido das transcrições locais"
Enter
Type "claude-toolkit stats 7"
Enter
Wait
Sleep 5s

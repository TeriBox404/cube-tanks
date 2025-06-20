@echo off
title commands
cls
goto commands



:commands
echo kill - Killes the server.
echo restart - Restarts the server.
set /p "c=>"
if %c% == kill goto kill
if %c% == restart goto restart
cls
echo.
echo [91m%c% is an invalid command![0m
goto commands

:kill
taskkill /IM cmd.exe /FI "WINDOWTITLE eq console"
taskkill /IM cmd.exe /FI "WINDOWTITLE eq Select console"
exit

:restart
taskkill /IM cmd.exe /FI "WINDOWTITLE eq console"
taskkill /IM cmd.exe /FI "WINDOWTITLE eq Select console"
CD ..
start RUN
exit
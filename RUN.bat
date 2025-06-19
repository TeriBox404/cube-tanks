@echo off
goto install

:install
if not exist node_modules (
    npm i
    cls
    echo [32mDone![0m
    echo [32mPress any key to run game![0m
    pause>nul
    start RUN
)
goto console

:console
CD public
start commands
CD ..
title console
cls
node server.js
echo.
echo.
echo Error detected!Press any key to exit.
pause>nul
exit
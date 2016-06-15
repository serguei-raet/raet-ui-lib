pushd %~dp0..

rem call npm install tsd -g
rem call npm install -g typescript

rem call npm install
rem call tsd install

if exist dist rd dist /s /q
@if exist dist ping 127.0.0.1 -n 2
@if exist dist rd dist /s /q
mkdir dist

call tsc

node %~dp0build.js

popd
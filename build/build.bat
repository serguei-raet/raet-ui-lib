pushd %~dp0..

call npm install tsd -g
call npm install -g typescript

call npm install
call tsd install

if exist dist rd dist /s /q
mkdir dist

call tsc

node %~dp0build.js

popd
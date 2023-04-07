@echo off

echo Updating Usagi submodule
cd %cd%\Usagi
git pull

echo Updating Usagi bot
cd ..
git pull
npm install
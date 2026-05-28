@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

call npm cache clean --force
call npm install
call npm run build
call npx cap sync
cd android
call gradlew.bat clean
call gradlew.bat assembleDebug

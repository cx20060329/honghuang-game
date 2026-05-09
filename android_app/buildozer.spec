[app]

# (str) Title of your application
title = 洪荒神话

# (str) Package name
package.name = honghuang

# (str) Package domain (needed for android/ios packaging)
package.domain = org.honghuang

# (str) Source code directory
source.dir = .

# (str) Source code includes
source.include_exts = py,png,jpg,kv,atlas,json,mp3,wav

# (str) Version string
version = 3.5.0

# (str) Application version code
version.code = 350

# (list) Application requirements
requirements = python3,kivy,sdl2,pyjnius,android

# (str) Presplash image (loading screen)
presplash.filename = assets/images/presplash.png

# (str) Icon filename
icon.filename = assets/images/icon.png

# (str) Supported orientations
orientation = portrait

# (bool) Indicate if the application should be fullscreen or not
fullscreen = True

# (bool) Stay fullscreen on devices with notch
fullscreen.notch = True

# (list) Permissions
android.permissions = WRITE_EXTERNAL_STORAGE,READ_EXTERNAL_STORAGE

# (int) Target Android API version
android.api = 33

# (int) Minimum Android API version
android.minapi = 21

# (str) Android NDK version
android.ndk = 25b

# (str) Android NDK path (use local)
android.ndk_path = /mnt/d/ClaudeCode/cc-smith/hh/android_app/.buildozer/android/platform/android-ndk-r25b

# (str) Android SDK path (use local)
android.sdk_path = /mnt/d/ClaudeCode/cc-smith/hh/android_app/.buildozer/android/platform/android-sdk

# (bool) Use private storage
android.private_storage = True

# (str) Android entry point
android.entrypoint = org.kivy.android.PythonActivity

# (str) Android theme
android.theme = "@android:style/Theme.NoTitleBar.Fullscreen"

# (bool) Copy game data to assets
android.copy_assets = True

# (str) Assets directory
android.assets_src_dir = assets

# (list) Gradle dependencies
android.gradle_dependencies =

# (bool) Enable Android log
android.log = True

# (str) The Android archs to build
android.archs = arm64-v8a,armeabi-v7a

# (bool) enables Android auto backup feature
android.allow_backup = False

# (str) path to the whitelist file
android.backup_whitelist =

# (str) the launch mode to use for the main activity
android.launch_mode = singleTask

# (bool) indicates whether the application should be allowed to install updates
install.update = True

# (str) Kivy version to use
kivy.version = 2.2.1

# (bool) Use OpenGL ES 2
opengles.version = 2

# (str) Author name
author = 洪荒神话开发组

# (str) Author email
author.email = honghuang@example.com

# (str) Create a requirements.txt file
requirements.source = kivy

# (bool) Show debug info
debug = False

# (str) Build type
build.type = release

# (str) Output directory
build.output = bin

# (str) Name of the build output
build.output.name = honghuang

# (str) Compiler architecture
compiler.arch = arm64

# (bool) Strip binary
strip.binary = True

# (bool) Enable JIT
enable.jit = False

# (str) Python for android branch
p4a.branch = master

# (str) Python for android bootstrap
p4a.bootstrap = sdl2

# (list) Python modules to include
python.modules = json,random,datetime,os

# (str) Recipe name for python
python.recipe = python3

# (bool) Copy game data JSON
copy.data = True

# (str) Game data file location
game.data.file = game_data_full.json

# (str) Save directory
save.directory = saves
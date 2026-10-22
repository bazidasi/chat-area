# Single-pass NSIS script for Fibonacci Chat Area.
#
# electron-builder normally compiles the uninstaller in a first pass
# (BUILD_UNINSTALLER), runs it under wine to extract it, then embeds it into
# the final installer. This build environment has no working wine, so a custom
# script is used: installer and uninstaller are compiled together in one pass
# and the uninstaller is written at install time via WriteUninstaller.
#
# Differences vs templates/nsis/installer.nsi:
#  - no BUILD_UNINSTALLER pass machinery; uninstaller.nsh is always included
#  - Var declarations hoisted to the top once (NSIS rejects duplicates)
#  - the prebuilt-uninstaller File line is guarded (see installer-area.nsh)
#  - uninstaller UI pages are inserted explicitly below
#  - allowOnlyOneInstallerInstance-area.nsh / installer-area.nsh /
#    installSection-area.nsh are the single-pass variants of the stock files

Var newStartMenuLink
Var oldStartMenuLink
Var newDesktopLink
Var oldDesktopLink
Var oldShortcutName
Var oldMenuDirectory
# Hoisted: the stock script declares these under !ifndef BUILD_UNINSTALLER,
# which is always true here — hoisted for clarity so every Var lives in one place.
Var appExe
Var launchLink

# electron-builder does not define UNINSTALLER_OUT_FILE for custom scripts;
# give it a non-existing path so the guarded File line compiles out.
!define /ifndef UNINSTALLER_OUT_FILE "prebuilt-uninstaller-not-used"

!include "common.nsh"
!include "MUI2.nsh"
!include "multiUser.nsh"
!include "allowOnlyOneInstallerInstance-area.nsh"

!ifdef INSTALL_MODE_PER_ALL_USERS
  RequestExecutionLevel admin
!else
  RequestExecutionLevel user
!endif

ShowUninstDetails nevershow

!include "assistedInstaller.nsh"

# Uninstaller UI pages. The stock assistedInstaller.nsh only inserts them in
# its !ifdef BUILD_UNINSTALLER branch, which never compiles in a single pass.
!ifndef removeDefaultUninstallWelcomePage
  !ifmacrodef customUnWelcomePage
    !insertmacro customUnWelcomePage
  !else
    !insertmacro MUI_UNPAGE_WELCOME
  !endif
!endif
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro addLangs

!ifmacrodef customHeader
  !insertmacro customHeader
!endif

Function .onInit
  Call setInstallSectionSpaceRequired

  SetOutPath $INSTDIR
  ${LogSet} on

  !ifmacrodef preInit
    !insertmacro preInit
  !endif

  !ifdef DISPLAY_LANG_SELECTOR
    !insertmacro MUI_LANGDLL_DISPLAY
  !endif

  !insertmacro check64BitAndSetRegView

  ${IfNot} ${UAC_IsInnerInstance}
    !insertmacro ALLOW_ONLY_ONE_INSTALLER_INSTANCE
  ${EndIf}

  !insertmacro initMultiUser

  !ifmacrodef customInit
    !insertmacro customInit
  !endif

  !ifmacrodef addLicenseFiles
    InitPluginsDir
    !insertmacro addLicenseFiles
  !endif
FunctionEnd

!include "installUtil.nsh"
!include "uninstaller.nsh"

Section "install" INSTALL_SECTION_ID
  # If we're running a silent upgrade of a per-machine installation, elevate so extracting the new app will succeed.
  # For a non-silent install, the elevation will be triggered when the install mode is selected in the UI,
  # but that won't be executed when silent.
  !ifndef INSTALL_MODE_PER_ALL_USERS
    ${if} $hasPerMachineInstallation == "1" # set in onInit by initMultiUser
    ${andIf} ${Silent}
      ${ifNot} ${UAC_IsAdmin}
        ShowWindow $HWNDPARENT ${SW_HIDE}
        !insertmacro UAC_RunElevated
        ${Switch} $0
          ${Case} 0
            ${Break}
          ${Case} 1223 ;user aborted
            ${Break}
          ${Default}
            MessageBox mb_IconStop|mb_TopMost|mb_SetForeground "Unable to elevate, error $0"
            ${Break}
        ${EndSwitch}
        Quit
      ${else}
        !insertmacro setInstallModePerAllUsers
      ${endIf}
    ${endIf}
  !endif
  !include "installSection-area.nsh"
SectionEnd

Function setInstallSectionSpaceRequired
  !insertmacro setSpaceRequired ${INSTALL_SECTION_ID}
FunctionEnd

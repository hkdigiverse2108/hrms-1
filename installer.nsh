!macro customInit
  DetailPrint "Closing running HRMS processes..."
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM HRMS.exe /T'
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM backend.exe /T'
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM watchdog.exe /T'

  # Read UninstallString from registry (check HKCU first, then HKLM)
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.hrms.app" "UninstallString"
  StrCmp $0 "" check_hrms_hkcu
    Goto run_uninstaller
  check_hrms_hkcu:
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HRMS" "UninstallString"
  StrCmp $0 "" check_app_hklm
    Goto run_uninstaller
  check_app_hklm:
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.hrms.app" "UninstallString"
  StrCmp $0 "" check_hrms_hklm
    Goto run_uninstaller
  check_hrms_hklm:
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HRMS" "UninstallString"
  StrCmp $0 "" done

  run_uninstaller:
    DetailPrint "Silent uninstall of previous version: $0"
    ExecWait '$0 /S'
  done:
!macroend

!macro customUnInit
  DetailPrint "Closing running HRMS processes..."
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM HRMS.exe /T'
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM backend.exe /T'
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM watchdog.exe /T'
!macroend

!macro customInstall
  DetailPrint "Setting folder permissions for Next.js runtime configurations..."
  nsExec::ExecToLog 'icacls "$INSTDIR" /grant *S-1-5-32-545:(OI)(CI)F /T'
  
  # Auto-launch application after silent background update install
  IfSilent 0 +2
    Exec '"$INSTDIR\HRMS.exe"'
!macroend

!macro customUnInstall
  RMDir /r "$INSTDIR"
!macroend

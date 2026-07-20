!macro customInit
  DetailPrint "Closing running HRMS processes..."
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM HRMS.exe /T'
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM backend.exe /T'
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM watchdog.exe /T'
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
  # Using the same path ensures the taskbar pin remains valid
  IfSilent 0 +2
    Exec '"$INSTDIR\HRMS.exe"'
!macroend

!macro customUnInstall
  ${if} ${isUpdated}
    # Skip deleting shortcuts and directory during upgrade to preserve taskbar pins
    Goto done_uninstall
  ${endif}

  # Remove Start Menu and Desktop shortcuts
  RMDir /r "$SMPROGRAMS\HRMS"
  Delete "$DESKTOP\HRMS.lnk"
  Delete "$DESKTOP\HRMS Desktop App.lnk"
  
  # Remove installation directory
  RMDir /r "$INSTDIR"

  done_uninstall:
!macroend

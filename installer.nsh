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

!macro customUnInstall
  RMDir /r "$INSTDIR"
!macroend

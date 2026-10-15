!macro NSIS_HOOK_PREUNINSTALL
  ; tauri-plugin-autostart uses the application name as its per-user Run value.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Miso"
!macroend

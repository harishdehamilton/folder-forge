; Folder Forge — by Harish
; Custom NSIS script for Windows context menu integration

!macro customInstall
  ; Add "Create with Folder Forge" to folder right-click menu
  WriteRegStr HKCU "Software\Classes\Directory\shell\FolderForge" "" "Create with Folder Forge"
  WriteRegStr HKCU "Software\Classes\Directory\shell\FolderForge" "Icon" "$INSTDIR\Folder Forge.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\FolderForge\command" "" '"$INSTDIR\Folder Forge.exe" "--create-at=%1"'

  ; Add to folder background right-click menu (when right-clicking inside a folder)
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\FolderForge" "" "Create with Folder Forge"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\FolderForge" "Icon" "$INSTDIR\Folder Forge.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\FolderForge\command" "" '"$INSTDIR\Folder Forge.exe" "--create-at=%V"'
!macroend

!macro customUnInstall
  ; Clean up registry entries on uninstall
  DeleteRegKey HKCU "Software\Classes\Directory\shell\FolderForge"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\FolderForge"
!macroend

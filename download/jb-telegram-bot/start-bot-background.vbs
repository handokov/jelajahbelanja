Set WshShell = CreateObject("WScript.Script")
WshShell.Run "node jb-bot.js", 0, False
MsgBox "JB Bot jalan di background!" & vbCrLf & vbCrLf & "Untuk stop: buka Task Manager > cari 'node.exe' > End Task", vbInformation, "JB Bot"

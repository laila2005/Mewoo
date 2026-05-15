Add-Type -AssemblyName System.IO.Compression.FileSystem
$source = 'C:\Users\IT\OneDrive\Desktop\media\Petplus.docx'
$path = 'd:\Mewoo\temp_petplus.docx'
Copy-Item -Path $source -Destination $path -Force
$zip = [System.IO.Compression.ZipFile]::OpenRead($path)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()
$text = $xml -replace '<[^>]+>', ' '
Write-Output $text
Remove-Item -Path $path -Force

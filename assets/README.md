# 應用程式圖示

這個資料夾包含 Pixer Controller 應用程式的圖示檔案。

## 檔案說明

- `icon.ico` - Windows 應用程式圖示 (256x256 像素)
- `icon.icns` - macOS 應用程式圖示 (包含多種尺寸)
- `icon.png` - 原始 PNG 圖示檔案 (512x512 像素)

## 圖示需求

### Windows (.ico)
- 建議包含多種尺寸：16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- 格式：ICO

### macOS (.icns)  
- 建議包含多種尺寸：16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024
- 格式：ICNS

## 建立圖示檔案

如果您沒有現成的圖示檔案，可以：

1. 建立一個 512x512 像素的 PNG 圖示
2. 使用線上工具轉換：
   - Windows ICO: https://convertio.co/png-ico/
   - macOS ICNS: https://cloudconvert.com/png-to-icns

或者使用命令列工具：

```bash
# 使用 ImageMagick 建立 ICO 檔案
convert icon.png -resize 256x256 icon.ico

# 使用 iconutil (macOS) 建立 ICNS 檔案
mkdir icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

## 注意事項

- 圖示檔案是可選的，如果沒有提供，應用程式會使用預設圖示
- 建議使用簡潔、清晰的設計，在小尺寸下也能清楚辨識
- 圖示應該反映 Pixer E-Ink 相框的特色

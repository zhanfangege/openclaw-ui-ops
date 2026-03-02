#!/usr/bin/env bash
set -euo pipefail
OUT="ortho_ep01.mp4"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
ffmpeg -y \
  -f lavfi -i color=c=black:s=1080x1920:d=30 \
  -vf "drawtext=fontfile=${FONT}:text='膝盖疼：热敷还是冷敷？':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=220,drawtext=fontfile=${FONT}:text='骨科健康科普':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=320,subtitles=subtitles.srt:force_style='FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF&,Outline=1,Shadow=0,Alignment=2,MarginV=120'" \
  -c:v libx264 -pix_fmt yuv420p -r 30 -movflags +faststart \
  -an "$OUT"
echo "Rendered: $OUT"

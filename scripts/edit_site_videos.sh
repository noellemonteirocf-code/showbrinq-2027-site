#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$ROOT/public/assets"
SOURCES="$ROOT/materials/video-sources"
WORK="${TMPDIR:-/tmp}/showbrinq-video-edits"
mkdir -p "$WORK"

# Demonstração de produto: a fala já começa em andamento e termina; suavizar as bordas.
ffmpeg -hide_banner -y -i "$SOURCES/event-clip-02.mp4" \
  -vf "scale=720:1280:flags=lanczos,setsar=1,fps=30,fade=t=in:st=0:d=0.15,fade=t=out:st=14.55:d=0.32" \
  -af "afade=t=in:st=0:d=0.12,afade=t=out:st=14.55:d=0.42" \
  -c:v libx264 -preset medium -crf 23 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart "$ASSETS/event-product-demo-edited.mp4"

# Depoimento: retirar 4s de instruções/espera, estabilizar suavemente e dar respiro no final.
ffmpeg -hide_banner -y -i "$SOURCES/event-hero-player.mp4" \
  -vf "trim=start=4:end=15.033,setpts=PTS-STARTPTS,vidstabdetect=shakiness=4:accuracy=15:result=$WORK/stabilization.trf" \
  -an -f null -
ffmpeg -hide_banner -y -i "$SOURCES/event-hero-player.mp4" \
  -vf "trim=start=4:end=15.033,setpts=PTS-STARTPTS,vidstabtransform=input=$WORK/stabilization.trf:smoothing=10:zoom=0:optzoom=1,scale=720:1280:flags=lanczos,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=0.45,fade=t=in:st=0:d=0.15,fade=t=out:st=10.98:d=0.45" \
  -af "atrim=start=4:end=15.033,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.15,apad=pad_dur=0.45,afade=t=out:st=10.98:d=0.45" \
  -c:v libx264 -preset medium -crf 23 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest -movflags +faststart "$ASSETS/event-representative-testimonial-edited.mp4"

# Generate posters after the awkward opening cuts.
ffmpeg -hide_banner -y -i "$ASSETS/event-product-demo-edited.mp4" -ss 0.8 -frames:v 1 \
  -vf "scale=540:960:force_original_aspect_ratio=decrease:flags=lanczos,pad=540:960:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:v libwebp -quality 82 "$ASSETS/event-product-demo-poster.webp"
ffmpeg -hide_banner -y -i "$ASSETS/event-representative-testimonial-edited.mp4" -ss 0.8 -frames:v 1 \
  -vf "scale=540:960:force_original_aspect_ratio=decrease:flags=lanczos,pad=540:960:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:v libwebp -quality 82 "$ASSETS/event-representative-testimonial-poster.webp"

for output in "$ASSETS/event-product-demo-edited.mp4" "$ASSETS/event-representative-testimonial-edited.mp4"; do
  test -s "$output"
  ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact=p=0:nk=1 "$output"
done

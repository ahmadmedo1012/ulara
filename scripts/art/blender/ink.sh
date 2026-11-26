#!/bin/sh
# ink.sh raw.png out.webp : flatten on white, grayscale, grain, levels, webp
convert "$1" -background white -alpha remove -alpha off -colorspace Gray -level 6%,88% -sigmoidal-contrast 5,50% \
  \( +clone +noise Gaussian -attenuate 0.12 -colorspace Gray -blur 0x0.4 \) -compose Multiply -composite \
  -unsharp 0x1.1+1.4+0 -level 0%,86% -quality 62 -define webp:method=6 -define webp:auto-filter=true "$2"

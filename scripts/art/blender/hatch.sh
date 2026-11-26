#!/bin/sh
# hatch.sh in.png out.webp W H : adds diagonal hatching that deepens shaded tones (hand-inked feel), then webp
convert "$1" -colorspace Gray /tmp/_hb.png
convert -size ${3}x${4} pattern:left45 -colorspace Gray -filter point -resize 150% -crop ${3}x${4}+0+0 +repage /tmp/_hp.png
convert /tmp/_hb.png /tmp/_hp.png -fx 'u*(1-0.8*(1-u)*(1-v))' -quality 62 -define webp:method=6 "$2"

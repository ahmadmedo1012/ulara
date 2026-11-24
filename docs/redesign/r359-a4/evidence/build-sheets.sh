#!/usr/bin/env bash
# r359 A4 — build the fidelity SHEETS: one mobile screenshot next to its
# matching reference mobile shot (docs/redesign/r350/reference/shots/m-*.webp),
# scaled to a common height, hairline divider, mono captions. Output: WebP.
#
# Usage: build-sheets.sh <shots-dir> <out-dir>
#   <shots-dir>  the maestro screenshot PNGs (from the android-smoke artifact)
#   <out-dir>    docs/redesign/r359-a4/sheets
set -euo pipefail
SHOTS="$1"
OUT="$2"
REF="docs/redesign/r350/reference/shots"
mkdir -p "$OUT"

# Pairing: OUR screen → the reference mobile shot it competes with.
# (The reference is a marketing site's mobile pages; our mobile app's
# role homes carry the same flat drafting grammar — the pairing maps
# surfaces by ROLE IN THE PAGE, not by content.)
pair() {
  local ours="$1" ref="$2" name="$3"
  if [ ! -f "$SHOTS/$ours" ]; then echo "skip $name (missing $ours)"; return; fi
  if [ ! -f "$REF/$ref" ]; then echo "skip $name (missing $ref)"; return; fi
  ffmpeg -y -loglevel error \
    -i "$SHOTS/$ours" -i "$REF/$ref" \
    -filter_complex "[0:v]scale=-1:1334,drawtext=text='ULARA':x=12:y=24:fontsize=36:fontcolor=0x2540D9:box=1:boxcolor=white@0.9:boxborderw=8[a];[1:v]scale=-1:1334,drawtext=text='REFERENCE':x=12:y=24:fontsize=36:fontcolor=0x646464:box=1:boxcolor=white@0.9:boxborderw=8[b];[a][b]hstack=inputs=2" \
    -frames:v 1 -quality 80 "$OUT/$name.webp"
  echo "sheet $name: $(du -h "$OUT/$name.webp" | cut -f1)"
}

# Launch/boot surfaces ↔ the reference's hero/top and platform pages.
pair "ONBOARDING-1.png" "m-top.webp" "launch-onboarding1-vs-m-top"
pair "ONBOARDING-2.png" "m-platform1.webp" "onboarding2-role-vs-m-platform1"
pair "ONBOARDING-3.png" "m-platform2.webp" "onboarding3-notifications-vs-m-platform2"
pair "ONBOARDING-4.png" "m-cta.webp" "onboarding4-start-vs-m-cta"
# Role homes ↔ the reference's dense content pages.
pair "HOME-STUDENT.png" "m-problem.webp" "home-student-vs-m-problem"
pair "HOME-TEACHER.png" "m-intro.webp" "home-teacher-vs-m-intro"
pair "HOME-ADMIN.png" "m-usecase.webp" "home-admin-vs-m-usecase"
pair "HOME-QUALITY.png" "m-why.webp" "home-quality-vs-m-why"
pair "HOME-OWNER.png" "m-map1.webp" "home-owner-vs-m-map1"
pair "HOME-STUDENT-TOURED.png" "m-map2.webp" "home-student-toured-vs-m-map2"
# Size passes.
pair "HOME-STUDENT-320.png" "m-top.webp" "size320-student-vs-m-top"
pair "HOME-TEACHER-320.png" "m-footer.webp" "size320-teacher-vs-m-footer"
pair "HOME-STUDENT-TABLET.png" "m-cta.webp" "size768-student-vs-m-cta"

echo "done — sheets in $OUT"

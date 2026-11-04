#!/usr/bin/env bash
# side-by-side sheet: for each time, the reference after panel (left) and ours (right), 360 px wide each, in a row of pairs
# usage: recreate/ba4/sheet.sh <out.png> <reftime:ourtime> ...   (ours must already be grabbed into data/grabs/ba4)
out=$1; shift; args=(); fl=""; n=0
for pair in "$@"; do r=${pair%%:*}; o=${pair##*:}
  args+=(-ss "$r" -i data/refs/edit-ba4/after1080.mp4 -i "data/grabs/ba4/ours_$(printf %.2f $o).png")
  fl+="[$((2*n)):v]scale=360:640,setsar=1,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='ref $r':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6[r$n];[$((2*n+1)):v]scale=360:640,setsar=1,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='ours $o':x=6:y=6:fontsize=18:fontcolor=cyan:box=1:boxcolor=black@0.6[o$n];"
  n=$((n+1)); done
ins=""; for i in $(seq 0 $((n-1))); do ins+="[r$i][o$i]"; done
ffmpeg -v error -y "${args[@]}" -filter_complex "${fl}${ins}hstack=$((2*n))" -frames:v 1 "$out"

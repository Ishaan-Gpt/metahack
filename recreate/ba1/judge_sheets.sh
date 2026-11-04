#!/usr/bin/env bash
# Blind judge sheets: per window, two rows of frames at matched beats, the reference after panel and ours assigned to
# rows A/B at random (the key is written to data/grabs/ba1j/key.txt, never shown to the judge).
# usage: recreate/ba1/judge_sheets.sh   (ours must already be grabbed into data/grabs/ba1)
set -e
out=data/grabs/ba1j; mkdir -p $out; : > $out/key.txt
declare -A W
W[w00]="0.05:0.05 0.6:0.6 1.3:1.05 2.7:2.1 3.05:2.45 3.3:3.2"
W[w05]="4.5:4.0 5.5:4.5 7.1:4.9 7.3:5.32 7.6:5.56 9.2:7.0"
W[w10]="10.4:8.3 11.2:9.6 11.5:10.75 12.3:11.3 13.3:12.6 14.9:14.4"
W[w15]="15.4:14.7 16.03:15.03 16.3:15.32 17.0:16.2 18.5:17.9 19.5:19.2"
W[w20]="20.5:20.4 21.5:21.4 22.6:22.45"
for w in w00 w05 w10 w15 w20; do
  args=(); fr=""; fo=""; n=0
  for pair in ${W[$w]}; do r=${pair%%:*}; o=${pair##*:}
    args+=(-ss "$r" -i data/refs/edit-ba1/after1080.mp4 -i "data/grabs/ba1/ours_$(printf %.2f $o).png")
    fr+="[$((2*n)):v]scale=270:480,setsar=1[r$n];"; fo+="[$((2*n+1)):v]scale=270:480,setsar=1[o$n];"; n=$((n+1)); done
  rr=""; oo=""; for i in $(seq 0 $((n-1))); do rr+="[r$i]"; oo+="[o$i]"; done
  if (( RANDOM % 2 )); then top=ref; a="$rr"; b="$oo"; else top=ours; a="$oo"; b="$rr"; fi
  echo "$w A=$top" >> $out/key.txt
  ffmpeg -v error -y "${args[@]}" -filter_complex "${fr}${fo}${a}hstack=$n,pad=iw:ih+30:0:30,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='A':x=8:y=4:fontsize=24:fontcolor=white[A];${b}hstack=$n,pad=iw:ih+30:0:30,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='B':x=8:y=4:fontsize=24:fontcolor=white[B];[A][B]vstack" -frames:v 1 "$out/$w.png"
done
echo "sheets in $out"

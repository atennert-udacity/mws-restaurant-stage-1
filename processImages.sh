#!/bin/bash

rm public/img/*

for file in img/*.jpg; do
  name=${file%.*}
  convert "$file" -quality 70 "public/${name}-orig.jpg"
  convert "$file" -resize 500x375 -quality 70 "public/${name}-500.jpg"
  convert "$file" -resize 420x315 -quality 70 "public/${name}-420.jpg"
  convert "$file" -resize 320x240 -quality 70 "public/${name}-320.jpg"
  convert "$file" -resize 200x150 -quality 70 "public/${name}-200.jpg"
done

convert -background none -resize 192x192 -density 4800 img/icon.svg public/img/icon-192.png
convert -background none -resize 512x512 -density 4800 img/icon.svg public/img/icon-512.png

cp img/no-img-orig.svg public/img/

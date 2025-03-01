#!/bin/bash

# Create output directory if it doesn't exist
mkdir -p merged_output

# Colors/variants in the sprite sets
colors=("shadow" "gray" "yellow" "red" "green" "blue" "magenta" "white")

# Loop through each color
for i in {13..20}; do
  echo "Processing color ${colors[$i - 13]}. Color index: $i"
  color=${colors[$i - 13]}
  
  # Get left and right images (using the proper index values)
  left_image="./1/sysfld00_${i}.png"
  right_image="./2/sysfld01_${i}.png"
  
  # Only process if both files exist
  if [ -f "$left_image" ] && [ -f "$right_image" ]; then
    echo "Merging $left_image and $right_image to create merged_${color}.png"
    
    # Use ImageMagick to merge images horizontally
    convert "$left_image" "$right_image" +append "merged_output/merged_${color}.png"
  else
    echo "Warning: Could not find both $left_image and $right_image"
  fi
done

echo "Merge complete! Check the merged_output directory for results."
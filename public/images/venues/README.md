# Venue Images

This directory contains placeholder images for different sports venues.

## Required Images:

- `football-field.jpg` - Football/Soccer field
- `rugby-field.jpg` - Rugby field  
- `basketball-court.jpg` - Basketball court
- `futsal-court.jpg` - Futsal court
- `volleyball-court.jpg` - Volleyball court
- `field.jpg` - General field (for Frisbee)
- `hockey-field.jpg` - Hockey field
- `badminton-court.jpg` - Badminton court

## Image Specifications:

- **Aspect Ratio**: 16:9 or 4:3
- **Resolution**: Minimum 800x600px
- **Format**: JPG or PNG
- **File Size**: Under 500KB for optimal loading

## Usage:

These images are used as placeholders in the match cards when venue-specific images are not available. The system will automatically fall back to these default images based on the sport type.

## Adding New Images:

1. Add the image file to this directory
2. Update the `defaultVenueImages` mapping in the card components
3. Ensure the image follows the specifications above

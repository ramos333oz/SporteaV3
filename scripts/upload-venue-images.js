import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Venue images mapping
const venueImages = [
  {
    fileName: 'Court Pusat Sukan A (Futsal).jpeg',
    locationName: 'Court Pusat Sukan A (Futsal)',
    filePath: path.join(__dirname, '../venuespic/Court Pusat Sukan A (Futsal).jpeg')
  },
  {
    fileName: 'Court Pusat Sukan A (Basketball).jpeg',
    locationName: 'Court Pusat Sukan A (Basketball)',
    filePath: path.join(__dirname, '../venuespic/Court Pusat Sukan A (Basketball).jpeg')
  }
];

async function uploadVenueImages() {
  console.log('Starting venue image upload process...');

  for (const venue of venueImages) {
    try {
      console.log(`\nProcessing: ${venue.locationName}`);
      
      // Check if file exists
      if (!fs.existsSync(venue.filePath)) {
        console.error(`File not found: ${venue.filePath}`);
        continue;
      }

      // Read the file
      const fileBuffer = fs.readFileSync(venue.filePath);
      const fileExt = path.extname(venue.fileName);
      const fileName = `${venue.locationName.replace(/[^a-zA-Z0-9]/g, '_')}${fileExt}`;

      console.log(`Uploading ${fileName} to Supabase Storage...`);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(fileName, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`Upload error for ${venue.locationName}:`, uploadError);
        continue;
      }

      console.log(`✅ Successfully uploaded: ${fileName}`);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('venue-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      console.log(`Public URL: ${imageUrl}`);

      // Update the location record with the image URL
      console.log(`Updating location record for: ${venue.locationName}`);
      
      const { data: updateData, error: updateError } = await supabase
        .from('locations')
        .update({ image_url: imageUrl })
        .eq('name', venue.locationName);

      if (updateError) {
        console.error(`Database update error for ${venue.locationName}:`, updateError);
        continue;
      }

      console.log(`✅ Successfully updated location record for: ${venue.locationName}`);

    } catch (error) {
      console.error(`Error processing ${venue.locationName}:`, error);
    }
  }

  console.log('\n🎉 Venue image upload process completed!');
}

// Run the upload process
uploadVenueImages().catch(console.error);

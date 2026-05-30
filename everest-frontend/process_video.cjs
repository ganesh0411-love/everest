const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const fs = require('fs');

const inputPath = 'C:\\Users\\DELL\\Desktop\\Everest\\Everest splash video.mp4';
const outputPath = 'C:\\Users\\DELL\\Desktop\\Everest\\everest-frontend\\public\\splash.mp4';

console.log('Processing video...');

ffmpeg(inputPath)
  .setDuration(2) // isolate first 2 seconds
  // Watermark removal: Crop and remove bottom-right corner.
  // Using video filter crop to remove roughly 15% from right and bottom.
  // "crop=iw*0.85:ih*0.85:0:0" crops out 15% from the right and bottom.
  .videoFilters('crop=iw*0.80:ih*0.80:0:0')
  .on('end', () => {
    console.log('Video processing finished!');
  })
  .on('error', (err) => {
    console.error('Error processing video:', err);
  })
  .save(outputPath);

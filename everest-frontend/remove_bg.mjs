import { Jimp } from 'jimp';

async function makeTransparent(imgPath, outPath) {
  try {
    const image = await Jimp.read(imgPath);
    
    // Replace white-ish pixels with transparent
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If color is close to white
      if (red > 240 && green > 240 && blue > 240) {
        this.bitmap.data[idx + 3] = 0; // alpha to 0
      }
    });
    
    await image.write(outPath);
    console.log(`Saved transparent image to ${outPath}`);
  } catch (err) {
    console.error('Error processing ' + imgPath + ':', err);
  }
}

async function run() {
  await makeTransparent('src/assets/avatar-female.jpg', 'src/assets/avatar-female.png');
  await makeTransparent('src/assets/avatar-male.jpg', 'src/assets/avatar-male.png');
}

run();

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public'); // Assuming script is in scripts/

const files = ['logo.png', 'logo_dark.png'];

async function optimize() {
  for (const file of files) {
    const inputPath = path.join(publicDir, file);
    if (!fs.existsSync(inputPath)) {
      console.warn(`File not found: ${inputPath}`);
      continue;
    }

    const name = path.parse(file).name;
    const outputPathWebP = path.join(publicDir, `${name}.webp`);
    const outputPathPng = path.join(publicDir, file); // Overwrite optimized PNG? Or keep as is? User said "compress logos".

    console.log(`Optimizing ${file}...`);

    // Create WebP
    await sharp(inputPath).webp({ quality: 80 }).toFile(outputPathWebP);

    console.log(`Created ${name}.webp`);

    // optimizing original png
    // using temporary buffer to avoid locking issue
    const buffer = await sharp(inputPath).png({ compressionLevel: 9, quality: 80 }).toBuffer();

    fs.writeFileSync(outputPathPng, buffer);
    console.log(`Compressed ${file}`);
  }
}

optimize().catch(console.error);

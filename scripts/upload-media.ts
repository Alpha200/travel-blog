import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import heicConvert from 'heic-convert';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

interface StrapiFile {
  id: number;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: any;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const UPLOAD_DIR = path.join(process.cwd(), 'upload');
const TEMP_DIR = path.join(process.cwd(), '.tmp-upload');
const MAX_IMAGE_SIZE = 1920;

// Supported image formats
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heif', '.heic', '.gif', '.tiff', '.tif'];

async function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

async function getExistingFiles(): Promise<StrapiFile[]> {
  if (!STRAPI_TOKEN) {
    throw new Error('STRAPI_TOKEN environment variable is required');
  }

  try {
    const response = await fetch(`${STRAPI_URL}/api/upload/files?pagination[pageSize]=1000`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch existing files: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as StrapiFile[];
    return data;
  } catch (error) {
    console.error('Error fetching existing files:', error);
    throw error;
  }
}

async function convertHeifToJpeg(inputPath: string, outputPath: string): Promise<void> {
  console.log(`  Converting HEIF/HEIC to JPEG format`);

  const inputBuffer = fs.readFileSync(inputPath);

  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.9,
  });

  fs.writeFileSync(outputPath, Buffer.from(outputBuffer));
}

async function resizeImage(inputPath: string, outputPath: string): Promise<void> {
  const ext = path.extname(inputPath).toLowerCase();
  const isHeif = ext === '.heif' || ext === '.heic';

  let imageToProcess = inputPath;
  let tempHeifConversion: string | null = null;

  // If it's a HEIF/HEIC file, convert it to JPEG first
  if (isHeif) {
    tempHeifConversion = path.join(TEMP_DIR, `heif_temp_${Date.now()}.jpg`);
    await convertHeifToJpeg(inputPath, tempHeifConversion);
    imageToProcess = tempHeifConversion;
  }

  try {
    const image = sharp(imageToProcess);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(`Unable to get image dimensions for ${inputPath}`);
    }

    const maxDimension = Math.max(metadata.width, metadata.height);

    if (maxDimension > MAX_IMAGE_SIZE) {
      console.log(`  Resizing from ${metadata.width}x${metadata.height} to fit ${MAX_IMAGE_SIZE}px`);
      await image
        .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath);
    } else {
      console.log(`  Image already within size limits (${metadata.width}x${metadata.height})`);
      await image
        .jpeg({ quality: 90 })
        .toFile(outputPath);
    }
  } finally {
    // Clean up temporary HEIF conversion file
    if (tempHeifConversion && fs.existsSync(tempHeifConversion)) {
      fs.unlinkSync(tempHeifConversion);
    }
  }
}

async function uploadFile(
  filePath: string,
  fileName: string,
  folder: string | undefined
): Promise<void> {
  if (!STRAPI_TOKEN) {
    throw new Error('STRAPI_TOKEN environment variable is required');
  }

  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);

  // For HEIF/HEIC files, change the extension to .jpg
  let uploadFileName = fileName.replace(/\.(heif|heic)$/i, '.jpg');

  // Prefix with folder name if specified (e.g., Mallorca/photo.jpg becomes Mallorca-photo.jpg)
  if (folder && folder !== '.') {
    const folderPrefix = folder.replace(/\//g, '-');
    uploadFileName = `${folderPrefix}-${uploadFileName}`;
    console.log(`  Upload filename: ${uploadFileName}`);
  }

  // Create blob with proper MIME type for JPEG images
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

  formData.append('files', blob, uploadFileName);

  try {
    const response = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as any[];
    console.log(`  ✓ Uploaded successfully (ID: ${result[0]?.id})`);
  } catch (error) {
    console.error(`  ✗ Error uploading file:`, error);
    throw error;
  }
}

async function getAllFiles(dir: string, baseDir: string = dir): Promise<{ path: string; relativePath: string }[]> {
  const files: { path: string; relativePath: string }[] = [];
  const entries = await readdir(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (stats.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({ path: fullPath, relativePath });
      }
    }
  }

  return files;
}

function fileExistsInStrapi(fileName: string, folder: string | undefined, existingFiles: StrapiFile[]): boolean {
  // Normalize the filename - convert HEIF/HEIC to JPG for comparison since that's how they're uploaded
  let normalizedFileName = fileName.replace(/\.(heif|heic)$/i, '.jpg');

  // Add folder prefix if specified
  if (folder && folder !== '.') {
    const folderPrefix = folder.replace(/\//g, '-');
    normalizedFileName = `${folderPrefix}-${normalizedFileName}`;
  }

  return existingFiles.some(file => {
    return file.name === normalizedFileName;
  });
}

async function processFiles() {
  console.log('Starting media upload process...\n');
  console.log(`Strapi URL: ${STRAPI_URL}`);
  console.log(`Upload directory: ${UPLOAD_DIR}\n`);

  if (!fs.existsSync(UPLOAD_DIR)) {
    console.error(`Upload directory does not exist: ${UPLOAD_DIR}`);
    process.exit(1);
  }

  await ensureTempDir();

  console.log('Fetching existing files from Strapi...');
  const existingFiles = await getExistingFiles();
  console.log(`Found ${existingFiles.length} existing files in Strapi\n`);

  console.log('Scanning upload directory...');
  const files = await getAllFiles(UPLOAD_DIR);
  console.log(`Found ${files.length} image files\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const { path: filePath, relativePath } of files) {
    const fileName = path.basename(filePath);
    const folder = path.dirname(relativePath);

    console.log(`Processing: ${relativePath}`);

    if (fileExistsInStrapi(fileName, folder !== '.' ? folder : undefined, existingFiles)) {
      console.log(`  ⊘ Skipped (already exists in Strapi)`);
      skipped++;
      continue;
    }

    try {
      // Create a temporary resized file
      const tempFileName = `resized_${Date.now()}_${fileName.replace(/\.(heif|heic)$/i, '.jpg')}`;
      const tempFilePath = path.join(TEMP_DIR, tempFileName);

      await resizeImage(filePath, tempFilePath);
      await uploadFile(tempFilePath, fileName, folder !== '.' ? folder : undefined);

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      uploaded++;
    } catch (error) {
      console.error(`  ✗ Error processing file:`, error);
      errors++;
    }

    console.log('');
  }

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
  }

  console.log('\n=== Summary ===');
  console.log(`Total files: ${files.length}`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

// Run the script
processFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


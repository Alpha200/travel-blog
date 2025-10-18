# Media Upload Script

This script automatically processes images from the `upload/` directory and uploads them to your Strapi media library.

## Features

- 🔍 Scans all subdirectories in the `upload/` folder
- 📏 Automatically resizes images to a maximum of 1920px on the longest edge using Sharp
- ✅ Checks if files already exist in Strapi to avoid duplicates
- 📁 Preserves folder structure using filename prefixes (e.g., `Mallorca/photo.jpg` → `Mallorca-photo.jpg`)
- 🖼️ Supports multiple image formats: JPG, PNG, WebP, HEIF, HEIC, GIF, TIFF

## Setup

1. Create a `.env` file in the project root with your Strapi credentials:

```bash
STRAPI_URL=http://localhost:1337
STRAPI_TOKEN=your_api_token_here
```

### Getting a Strapi API Token

1. Start your Strapi instance
2. Go to Settings → API Tokens
3. Create a new API token with:
   - Name: "Media Upload Script"
   - Token type: "Full access" or "Custom" with `upload` permissions
   - Token duration: Choose based on your needs
4. Copy the generated token and add it to your `.env` file

## Usage

Run the script with:

```bash
npm run upload-media
```

The script will:
1. Connect to your Strapi instance
2. Fetch the list of existing media files
3. Scan the `upload/` directory
4. Process each image:
   - Resize if needed (max 1920px on longest edge)
   - Convert HEIF/HEIC to JPEG
   - Prefix filename with folder path (e.g., `Mallorca/photo.jpg` becomes `Mallorca-photo.jpg`)
   - Upload to Strapi if not already present
   - Skip if already exists

## Folder Structure Handling

Files are uploaded with their folder path as a prefix in the filename:

- `upload/Mallorca/beach.jpg` → `Mallorca-beach.jpg`
- `upload/Spain/Barcelona/park.heif` → `Spain-Barcelona-park.jpg`
- `upload/photo.jpg` → `photo.jpg`

This preserves your directory organization in a simple, searchable format within Strapi's media library.

## Example Output

```
Starting media upload process...

Strapi URL: http://localhost:1337
Upload directory: /path/to/upload

Fetching existing files from Strapi...
Found 42 existing files in Strapi

Scanning upload directory...
Found 15 image files

Processing: Mallorca/25-09-22 12-04-36 3954.heif
  Upload filename: Mallorca-25-09-22 12-04-36 3954.jpg
  Converting HEIF/HEIC to JPEG format
  Resizing from 4032x3024 to fit 1920px
  ✓ Uploaded successfully (ID: 123)

Processing: Spain/beach.jpg
  ⊘ Skipped (already exists in Strapi)

=== Summary ===
Total files: 15
Uploaded: 10
Skipped: 4
Errors: 1
```

## Notes

- HEIF/HEIC files are automatically converted to JPEG format
- The original files in the `upload/` directory are not modified
- Temporary resized files are created in `.tmp-upload/` and cleaned up automatically
- The script will skip files that already exist in Strapi (based on filename with folder prefix)
- Only the public upload API is used - no admin API access required

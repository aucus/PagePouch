// Icon generation script for LaterLens Chrome extension
// SVG to PNG conversion for different sizes

const fs = require('fs');
const path = require('path');

// Create placeholder PNG files with base64 data
const createPlaceholderIcon = (size) => {
  // Simple base64 encoded PNG for placeholder
  const canvas = `<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="60" fill="#4F46E5"/>
    <circle cx="52" cy="52" r="20" fill="none" stroke="#FFFFFF" stroke-width="4"/>
    <line x1="68" y1="68" x2="84" y2="84" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
    <rect x="72" y="32" width="24" height="32" rx="2" fill="#FFFFFF"/>
    <rect x="76" y="38" width="16" height="2" fill="#4F46E5"/>
    <rect x="76" y="42" width="12" height="2" fill="#4F46E5"/>
    <rect x="76" y="46" width="14" height="2" fill="#4F46E5"/>
    <path d="M88 24 L96 24 L96 40 L92 36 L88 40 Z" fill="#F59E0B"/>
  </svg>`;
  
  return canvas;
};

// Generate icons for different sizes
const sizes = [16, 32, 48, 128];
const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

sizes.forEach(size => {
  const svgContent = createPlaceholderIcon(size);
  const filename = `icon${size}.svg`;
  const filepath = path.join(assetsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Generated ${filename}`);
});

console.log('Icon generation completed!');
console.log('Note: For production, convert SVG files to PNG using a proper tool like Inkscape or online converters.');
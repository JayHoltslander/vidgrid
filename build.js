const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  const distDir = path.join(__dirname, 'dist');
  
  // Ensure the dist directory exists
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Minify JavaScript
  await esbuild.build({
    entryPoints: ['src/app.js'],
    outfile: 'dist/app.js',
    minify: true,
    bundle: false,
    target: ['es2020']
  });
  console.log('✔ Minified app.js');

  // 2. Minify CSS
  await esbuild.build({
    entryPoints: ['src/styles.css'],
    outfile: 'dist/styles.css',
    minify: true
  });
  console.log('✔ Minified styles.css');

  // 3. Compress and Copy HTML
  let html = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf8');
  
  // Clean HTML: Remove comments and collapse unnecessary whitespace
  html = html
    .replace(/<!--[\s\S]*?-->/g, '') 
    .replace(/\s+/g, ' ')           
    .replace(/>\s+</g, '><');        
     
  fs.writeFileSync(path.join(distDir, 'index.html'), html.trim(), 'utf8');
  console.log('✔ Minified and copied index.html');
  
  // 4. Generate Static Playlist JSON for GitHub Pages
  const videosDir = path.join(distDir, 'videos');
  const playlistPath = path.join(videosDir, 'playlist.json');
  const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.mkv', '.avi'];
  const playlist = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (videoExtensions.includes(ext)) {
          const relPath = path.relative(videosDir, fullPath).split(path.sep).join('/');
          playlist.push(relPath);
        }
      }
    }
  }

  if (fs.existsSync(videosDir)) {
    scanDir(videosDir);
    fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2), 'utf8');
    console.log(`✔ Generated playlist.json with ${playlist.length} videos`);
  }

  console.log('✔ Build completed successfully!');
}

build().catch(err => {
  console.error('✕ Build failed:', err);
  process.exit(1);
});

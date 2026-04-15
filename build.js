const esbuild = require('esbuild');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

// 1. Clean the old build directory
const outDir = './dist';
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir);

// 2. Bundle and Minify the JavaScript
esbuild.buildSync({
    entryPoints: ['./src/content.js'],
    bundle: true,
    minify: true,
    outfile: './dist/content.js',
});

// 3. Copy Manifest and Icons over to the dist folder
fs.copyFileSync('./src/manifest.json', './dist/manifest.json');
if (fs.existsSync('./src/icons')) {
    fs.cpSync('./src/icons', './dist/icons', { recursive: true });
}

// 4. (Optional) Copy popup files if you created them
if (fs.existsSync('./src/popup.html')) {
    fs.copyFileSync('./src/popup.html', './dist/popup.html');
}
if (fs.existsSync('./src/popup.css')) {
    fs.copyFileSync('./src/popup.css', './dist/popup.css');
}
if (fs.existsSync('./src/popup.js')) {
    esbuild.buildSync({
        entryPoints: ['./src/popup.js'],
        bundle: true,
        minify: true,
        outfile: './dist/popup.js',
    });
}

console.log('Bundling complete! Now creating zip...');

// 5. Create the final .zip file for the Chrome Web Store
const output = fs.createWriteStream(path.join(__dirname, 'extension-release.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(` Success! extension-release.zip is ready (${archive.pointer()} total bytes).`);
});

archive.pipe(output);
archive.directory('dist/', false);
archive.finalize();
const fs = require('fs-extra');
const path = require('path');

async function copyAndRename() {
  const buildDirJS = path.resolve(__dirname, 'build/static/js');
  const distDir = path.resolve(__dirname, '..', 'dist'); // Target the 'dist' folder

  try {
    // Ensure the build directory exists
    if (!fs.existsSync(buildDirJS)) {
      console.error('Build directory not found:', buildDirJS);
      return;
    }

    // Ensure the dist directory exists, create it if not
    await fs.ensureDir(distDir);

    // Get all files in the build/static/js directory
    const jsFiles = await fs.readdir(buildDirJS);
    let mainFile = null;

    // Find the main chunk file (look for one without a hyphenated hash)
    for (const file of jsFiles) {
      if (file.endsWith('.js') && !file.includes('-')) {
        mainFile = file;
        break;
      }
    }

    if (!mainFile) {
      // Fallback: find the first .js file if the above doesn't work
      const firstJsFile = jsFiles.find(file => file.endsWith('.js'));
      if (firstJsFile) {
        mainFile = firstJsFile;
        console.warn('Main chunk file naming convention not as expected. Using the first .js file:', mainFile);
      } else {
        console.error('Could not find any .js file in:', buildDirJS);
        return;
      }
    }

    const mainFilePath = path.join(buildDirJS, mainFile);
    const destPath = path.join(distDir, 'main.js'); // Copy to 'dist'

    // Copy and rename the main chunk
    await fs.copy(mainFilePath, destPath, { overwrite: true });
    console.log('Successfully copied and renamed:', mainFilePath, 'to', destPath);

    // Copy other chunk files
    for (const file of jsFiles) {
      if (file !== mainFile && file.endsWith('.js')) {
        const sourcePath = path.join(buildDirJS, file);
        const destinationPath = path.join(distDir, file); // Copy to 'dist'
        await fs.copy(sourcePath, destinationPath, { overwrite: true });
        console.log('Successfully copied:', sourcePath, 'to', destinationPath);
      }
    }

    // --- Copy the map file ---
    const mapFile = jsFiles.find(file => file.endsWith('.map'));

    if (mapFile) {
      // Delete any existing .map file in the dist directory
      const existingMapFiles = await fs.readdir(distDir);
      for (const file of existingMapFiles) {
        if (file.endsWith('.map')) {
          const existingMapPath = path.join(distDir, file);
          await fs.remove(existingMapPath);
          console.log('Deleted old map file:', existingMapPath);
        }
      }

      const sourceMapPath = path.join(buildDirJS, mapFile);
      // Determine the expected name of the map file in the dist folder
      const expectedMapFileName = mainFile.replace('.js', '.js.map');
      const destinationMapPath = path.join(distDir, expectedMapFileName);
      await fs.copy(sourceMapPath, destinationMapPath, { overwrite: true });
      console.log('Successfully copied map file:', sourceMapPath, 'to', destinationMapPath);
    } else {
      console.warn('No .map file found in:', buildDirJS);
    }
    // --- End of map file copy ---

    console.log('Build script finished successfully!');

  } catch (error) {
    console.error('Error during build script:', error);
  }
}

copyAndRename();
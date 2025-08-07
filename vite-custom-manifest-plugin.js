import { readdir, writeFile } from 'fs/promises';
import { join, relative } from 'path';


export function customManifestPlugin() {
  return {
    name: 'custom-manifest',
    apply: 'build', // Only run during build
    
    async closeBundle() {
      try {
        // Get the output directory from Vite config
        const outputDir = this.getModuleInfo ? 
          // For newer versions of Vite/Rollup
          process.cwd() + '/dist' : 
          // Fallback
          'dist';
        
        console.log('Generating custom manifest...');
        
        // Recursively collect all file paths
        const filePaths = await collectFilePaths(outputDir, outputDir);
        
        // Write the manifest file
        const manifestPath = join(outputDir, 'custom-manifest.json');
        await writeFile(manifestPath, JSON.stringify(filePaths, null, 2));
        
        console.log(`Custom manifest created with ${filePaths.length} files`);
        
      } catch (error) {
        console.error('Error generating custom manifest:', error);
      }
    }
  };
}

async function collectFilePaths(dir, baseDir) {
  const filePaths = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subPaths = await collectFilePaths(fullPath, baseDir);
        filePaths.push(...subPaths);
      } else {
        // Add file path (relative to build output directory)
        const relativePath = relative(baseDir, fullPath);
        filePaths.push(relativePath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error.message);
  }
  
  return filePaths.sort(); // Sort for consistent output
}
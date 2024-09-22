import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update this path to the folder containing your JSON files
const jsonFolderPath = path.join(__dirname, '../public/output'); // Replace '../json' with your folder path

// The output file path
const outputFilePath = path.join(__dirname, '../src', 'exits.ts');

(async () => {
  try {
    // Read all files in the JSON folder
    const files = await fs.readdir(jsonFolderPath);

    // Initialize data structures
    const dataById = {}; // { id: { exits: [...], entrances: [...] } }
    const exitsList = []; // List of all exits with source id

    // Read and parse all JSON files
    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(jsonFolderPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(content);
        const id = jsonData.id;
        const exits = jsonData.exits;

        dataById[id] = {
          exits: exits || [],
          entrances: [] // To be filled
        };

        // Collect all exits with their source IDs
        if (exits && Array.isArray(exits)) {
          for (const exit of exits) {
            exitsList.push({
              sourceId: id,
              exit: exit
            });
          }
        }
      }
    }

    // For each ID, find entrances
    for (const [id, data] of Object.entries(dataById)) {
      const entrances = exitsList
        .filter(e => e.exit.fieldId === id)
        .map(e => ({
          ...e.exit,
          sourceId: e.sourceId
        }));
      data.entrances = entrances;
    }

    // Generate TypeScript output
    const output = `const exits = ${JSON.stringify(dataById, null, 2)} as const;\n\nexport default exits;\n`;

    // Write to exits.ts
    await fs.writeFile(outputFilePath, output, 'utf-8');

    console.log('exits.ts has been generated successfully.');
  } catch (error) {
    console.error('Error generating exits.ts:', error);
  }
})();

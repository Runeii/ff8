// Import necessary modules
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the directory where the JSON files are stored
const inputDir = path.join(__dirname, '../public/output'); // Ensure 'json' is inside the same directory as the script
const outputFile = path.join(__dirname, '../src/gateways.ts');

import ExampleJson from '../public/output/bghall_5.json';

type InputFile = typeof ExampleJson;

type Gateway = InputFile['gateways'][0] & {
  id: string,
  source?: string
};

// Process each file to map its ID to exits and entrances
const processFiles = (jsonFiles: InputFile[]) => {
  const gateways: Record<string, {
    exits: Gateway[]
    entrances: (Gateway)[],
    orientation: number,
  }> = Object.fromEntries(jsonFiles.map(({ controlDirection, gateways, id }) => [
    id,
    {
      exits: gateways.map((gateway, index) => ({
        ...gateway,
        id: `exit-${index}`,
      })),
      entrances: [],
      orientation: controlDirection,
    }
  ]));

  jsonFiles.forEach((file, fileIndex) => file.gateways.forEach((gateway, index) => {
    if (gateways[gateway.target].exits.some(({ target }) => target === file.id)) {
      return;
    }
    gateways[gateway.target].entrances.push({
      ...gateway,
      id: `entrance-${fileIndex}-${index}`,
      target: file.id,
    });
  }))

  return gateways;
};


// Helper functions
const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to parse JSON in file: ${filePath}`);
    console.error(error);
    throw error;  // Rethrow error after logging it
  }
};

const writeTsFile = async (filePath, content) => {
  await fs.writeFile(filePath, content, 'utf-8');
};

// Read all JSON files in the directory
const readAllFiles = async (dir) => {
  const files = await fs.readdir(dir);
  return Promise.all(files.filter(file => file.includes('.json')).map(file => readJsonFile(path.join(dir, file))));
};

// Generate the TypeScript output as a string
const generateTsOutput = (exitsMap) => {
  return `export const exits = ${JSON.stringify(exitsMap, null, 2)} as const;\nexport default exits;`;
};

// Main function to execute the process
const main = async () => {
  try {
    // Step 1: Read all JSON files
    const jsonFiles = await readAllFiles(inputDir);

    // Step 2: Process the files to get exits and entrances
    const exitsMap = processFiles(jsonFiles);

    // Step 3: Generate the TypeScript file content
    const tsOutput = generateTsOutput(exitsMap);

    // Step 4: Write the TypeScript file
    await writeTsFile(outputFile, tsOutput);

    console.log('exits.ts file has been generated successfully!');
  } catch (error) {
    console.error('Error processing files:', error);
  }
};

// Run the script
main();

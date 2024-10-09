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

type VectorLike = {
  x: number,
  y: number,
  z: number
}

type OutputGateway = {
  id: string,
  source: string
  target: string;
  sourceLine: VectorLike[],
  outPoint: VectorLike;
  sourceRot: number;
  destRot: number;
}

// Process each file to map its ID to exits and entrances
const processFiles = (jsonFiles: InputFile[]): OutputGateway[] =>
  jsonFiles.flatMap(({ controlDirection, gateways, id }) =>
    gateways.map((gateway, index) => {
      const targetFile = jsonFiles.find(file => file.id === gateway.target);
      if (!targetFile) {
        console.error(`Target file not found for gateway: ${gateway.target}`);
      }
      return {
        id: `${id}_${index}`,
        source: id,
        target: gateway.target,
        sourceLine: gateway.sourceLine,
        outPoint: gateway.destinationPoint,
        sourceRot: controlDirection,
        destRot: targetFile?.controlDirection ?? 0
      }
    })
  );



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

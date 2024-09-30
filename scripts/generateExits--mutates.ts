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

type Gateway = InputFile['gateways'][0];

interface VectorLike {
  x: number;
  y: number;
  z: number;
}

function getMidpoint(v1: VectorLike, v2: VectorLike): VectorLike {
  return {
    x: (v1.x + v2.x) / 2,
    y: (v1.y + v2.y) / 2,
    z: (v1.z + v2.z) / 2
  };
}

function transposeLineToMidpoint(sourceLine: [VectorLike, VectorLike], destinationPoint: VectorLike): [VectorLike, VectorLike] {
  const midpoint = getMidpoint(sourceLine[0], sourceLine[1]);

  const translation = {
    x: destinationPoint.x - midpoint.x,
    y: destinationPoint.y - midpoint.y,
    z: destinationPoint.z - midpoint.z
  };

  const newPoint1 = {
    x: sourceLine[0].x + translation.x,
    y: sourceLine[0].y + translation.y,
    z: sourceLine[0].z + translation.z
  };

  const newPoint2 = {
    x: sourceLine[1].x + translation.x,
    y: sourceLine[1].y + translation.y,
    z: sourceLine[1].z + translation.z
  };

  return [newPoint1, newPoint2];
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function rotateAroundMidpoint(line: [VectorLike, VectorLike], angleDegrees: number): [VectorLike, VectorLike] {
  const angleRadians = degreesToRadians(angleDegrees);

  const midpoint = {
    x: (line[0].x + line[1].x) / 2,
    y: (line[0].y + line[1].y) / 2,
    z: (line[0].z + line[1].z) / 2
  };

  function rotatePoint(point: VectorLike, origin: VectorLike, angle: number): VectorLike {
    const translatedX = point.x - origin.x;
    const translatedY = point.y - origin.y;

    const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
    const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);

    return {
      x: rotatedX + origin.x,
      y: rotatedY + origin.y,
      z: point.z // Keeping Z-axis the same as rotation is in 2D (XY plane)
    };
  }

  const rotatedPoint1 = rotatePoint(line[0], midpoint, angleRadians);
  const rotatedPoint2 = rotatePoint(line[1], midpoint, angleRadians);

  return [rotatedPoint1, rotatedPoint2];
}

// Process each file to map its ID to exits and entrances
const processFiles = (jsonFiles: InputFile[]) => {
  const gateways: Record<string, {
    exits: Gateway[]
    entrances: (Gateway)[],
    orientation: number,
  }> = Object.fromEntries(jsonFiles.map(({ controlDirection, gateways, id }) => [
    id,
    {
      exits: gateways,
      entrances: [],
      orientation: controlDirection,
    }
  ]));

  jsonFiles.forEach(file => file.gateways.forEach((gateway) => {
    const sourceId = file.id;

    const orientation = gateways[gateway.target].orientation;
    gateways[gateway.target].entrances.push(gateway);
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

import { promises as fs } from 'fs';
import path from 'path';
import { OPCODES } from './opcodes.js';

const folderPath = './public/output'; // Replace with the path to your JSON files folder
const outputFile = './scripts/opcodes.js';

// Helper function to read all JSON files in the folder
const readJSONFiles = async (folder) => {
  const files = await fs.readdir(folder);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  return Promise.all(jsonFiles.map(file => fs.readFile(path.join(folder, file), 'utf-8').then(JSON.parse)));
};

// Helper function to count opcodes
const countOpcodes = (data) => {
  return data.reduce((accumulator, { scripts }) => {
    scripts.forEach(script => {
      script.methods.forEach(method => {
        method.opcodes.forEach(opcodeObj => {
          const { name } = opcodeObj;
          accumulator[name] = (accumulator[name] || 0) + 1;
        });
      });
    });
    return accumulator;
  }, {});
};

// Main function to generate the opcode count and save it
const main = async () => {
  try {
    const data = await readJSONFiles(folderPath);
    const opcodeCount = countOpcodes(data);

    // Sort the opcodeCount object to match OPCODES order
    const sortedOpcodeCount = Object.keys(OPCODES).reduce((acc, opcode) => {
      acc[opcode] = opcodeCount[opcode] || 0;
      return acc;
    }, {});

    // Format and save the result as a pretty JS file
    const output = `export const opcodeCount = ${JSON.stringify(sortedOpcodeCount, null, 2)};\n`;
    await fs.writeFile(outputFile, output, 'utf-8');
    console.log('Opcode count saved to', outputFile);
  } catch (error) {
    console.error('Error processing files:', error);
  }
};

main();

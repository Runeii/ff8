import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

type PseudoCodeEntry = string[][];
type ParsedMethod = { pseudoCode: string };
type Script = { methods: ParsedMethod[] };
type InputFile = { scripts: Script[] };

type CumulativeResult = {
  [key: string]: {
    arg: number; stack: { [key: number]: number };
  };
}

// Helper function to format and parse pseudoCode as JSON array of arrays
const parsePseudoCode = (pseudoCode: string, file: string, scriptLabel: number): PseudoCodeEntry | null => {
  const formattedCode = `[${pseudoCode}]`.replaceAll('\n', '').replaceAll('\t', '').replaceAll("'", '"').replaceAll(' ', '').replaceAll(',,', ',').replaceAll(',,', ',').replaceAll(',,', ',').replaceAll(',,', ',').replaceAll(']104[', '],[').replaceAll(']240[', '],[').replaceAll(',-,', ',').replaceAll(',-,', ',').replaceAll(',,', ',').replaceAll(',,', ',').replaceAll(',]', ']').replaceAll('][', '],[').replaceAll('[,[', '[[');
  try {
    return JSON.parse(formattedCode);
  } catch (error) {
    console.warn(`Failed to parse pseudoCode ${file} ${scriptLabel}: ${formattedCode}`);
    return null;
  }
};

// Function to process each pseudoCode entry, returning a cumulative count object
const processPseudoCode = (entries: PseudoCodeEntry, cumulative: CumulativeResult): CumulativeResult => {
  return entries.reduce((result, entry) => {
    const [key, ...args] = entry;
    const argCount = args.filter(item => item === 'arg').length;
    const stackCount = args.filter(item => item === 'stack').length;

    result[key] = result[key] || { arg: 0, stack: {} };

    result[key].arg = argCount;

    // Odd case
    if (key === 'ladderanime') {
      result['ladderanime'].arg = 1;
    }

    result[key].stack[stackCount] = (result[key].stack[stackCount] ?? 0) + 1;

    return result;
  }, cumulative);
};

// Main function to iterate through files, accumulate results, and save to output file
const processFolder = async (folderPath: string, outputFilePath: string) => {
  const cumulativeResult: CumulativeResult = {};

  try {
    const files = await readdir(folderPath);

    await Promise.all(
      files.filter(file => file.endsWith('.json')).map(async (file, fileIndex) => {
        const filePath = join(folderPath, file);
        const fileContent = await readFile(filePath, 'utf-8');
        const data: InputFile = JSON.parse(fileContent);

        data.scripts.flatMap(script => script.methods).forEach(({ pseudoCode, scriptLabel }) => {
          const parsedEntries = parsePseudoCode(pseudoCode, file, scriptLabel);
          if (parsedEntries) {
            try {
              processPseudoCode(parsedEntries, cumulativeResult);
            } catch (error) {
              console.error(`Error processing pseudoCode for ${file} ${scriptLabel}: ${error}`);
            }
          }
        });
      })
    );

    await writeFile(outputFilePath, JSON.stringify(cumulativeResult, null, 2), 'utf-8');
    console.log(`Cumulative data saved to ${outputFilePath}`);
  } catch (error) {
    console.error(`Error processing folder: ${error}`);
  }
};

// Run the function with specified folder and output paths
processFolder('../public/output', './opcodeOutput.json');

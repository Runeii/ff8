import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update this path to the folder containing your JSON files
const jsonFolderPath = path.join(__dirname, '../public/output'); // Replace '../json' with your folder path

(async () => {
  try {
    // Read all files in the JSON folder
    const files = await fs.readdir(jsonFolderPath);

    // Initialize data structures
    const dataById = {}; // { id: { gateways: [...], controlDirection: number, jsonData: original JSON data } }
    const gatewaysList = []; // List of all gateways with source id
    let gatewayIdCounter = 1; // Initialize gateway ID counter

    // Read and parse all JSON files
    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(jsonFolderPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(content);
        const id = jsonData.id;
        const gateways = jsonData.gateways || [];
        const controlDirection = jsonData.controlDirection || 0; // Default to 0 if not present

        // Assign IDs to existing gateways (exits)
        for (const gateway of gateways) {
          if (!gateway.id) {
            gateway.id = `exit-${gatewayIdCounter}`;
            gatewayIdCounter++;
          }
        }

        dataById[id] = {
          id: id,
          gateways: gateways,
          controlDirection: controlDirection,
          jsonData: jsonData // Store the original JSON data for modification
        };

        // Collect all gateways with their source IDs
        for (const gateway of gateways) {
          gatewaysList.push({
            sourceId: id,
            gateway: gateway
          });
        }
      }
    }

    // For each ID, find entrances
    for (const [id, data] of Object.entries(dataById)) {
      const currentFieldExitsTo = new Set(
        data.gateways.map(gateway => gateway.target)
      );

      const entrances = gatewaysList
        .filter(e => e.gateway.target === id && e.sourceId !== id)
        .filter(e => !currentFieldExitsTo.has(e.sourceId)) // Only add if current field doesn't have an exit to sourceId
        .map(e => {
          const { destinationPoint, sourceLine } = e.gateway;

          // Exclude sourceLine, include entranceLine
          let entranceLine = null;
          if (sourceLine && destinationPoint) {
            // Compute the midpoint of the sourceLine
            const midpoint = {
              x: (sourceLine[0].x + sourceLine[1].x) / 2,
              y: (sourceLine[0].y + sourceLine[1].y) / 2,
              z: (sourceLine[0].z + sourceLine[1].z) / 2
            };

            // Compute the vector to shift the line so that the destinationPoint becomes the center
            const shiftVector = {
              x: destinationPoint.x - midpoint.x,
              y: destinationPoint.y - midpoint.y,
              z: destinationPoint.z - midpoint.z
            };

            // Apply the shift vector to both points of the sourceLine
            entranceLine = [
              {
                x: sourceLine[0].x + shiftVector.x,
                y: sourceLine[0].y + shiftVector.y,
                z: sourceLine[0].z + shiftVector.z
              },
              {
                x: sourceLine[1].x + shiftVector.x,
                y: sourceLine[1].y + shiftVector.y,
                z: sourceLine[1].z + shiftVector.z
              }
            ];

            // Now rotate the entranceLine around the destinationPoint
            const sourceControlDirection = dataById[e.sourceId].controlDirection || 0;
            const currentControlDirection = data.controlDirection || 0;
            const angleDifferenceDegrees = currentControlDirection - sourceControlDirection;
            const angleDifferenceRadians = (angleDifferenceDegrees * Math.PI) / 180;

            // Rotate each point
            entranceLine = entranceLine.map(point => {
              // Translate point to origin (destinationPoint at origin)
              const translatedPoint = {
                x: point.x - destinationPoint.x,
                y: point.y - destinationPoint.y,
                z: point.z - destinationPoint.z
              };

              // Apply rotation around Z-axis (assuming rotation in X-Y plane)
              const rotatedPoint = {
                x:
                  translatedPoint.x * Math.cos(angleDifferenceRadians) -
                  translatedPoint.y * Math.sin(angleDifferenceRadians),
                y:
                  translatedPoint.x * Math.sin(angleDifferenceRadians) +
                  translatedPoint.y * Math.cos(angleDifferenceRadians),
                z: translatedPoint.z // Keep z-coordinate relative
              };

              // Translate back to original position
              return {
                x: rotatedPoint.x + destinationPoint.x,
                y: rotatedPoint.y + destinationPoint.y,
                z: rotatedPoint.z + destinationPoint.z
              };
            });
          }

          // Assign a unique ID to the entrance
          const entranceId = `entrance-${gatewayIdCounter}`;
          gatewayIdCounter++;

          // Construct the entrance gateway
          return {
            id: entranceId,
            target: e.sourceId,
            destinationPoint: destinationPoint,
            sourceLine: entranceLine
          };
        });

      // Append the entrances to the gateways array in the jsonData
      data.jsonData.gateways.push(...entrances);
    }

    // Write the modified JSON data back to the files
    for (const [id, data] of Object.entries(dataById)) {
      const filePath = path.join(jsonFolderPath, `${id}.json`);
      const updatedContent = JSON.stringify(data.jsonData, null, 2);
      await fs.writeFile(filePath, updatedContent, 'utf-8');
    }

    console.log('JSON files have been updated with entrances and unique IDs successfully.');
  } catch (error) {
    console.error('Error updating JSON files:', error);
  }
})();
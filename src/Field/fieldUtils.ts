import { RawFieldData } from "./Field";
import { OPCODES } from "./Scripts/constants";
import { Opcode, OpcodeObj, ScriptType } from "./Scripts/types";

type UnmappedOpcodes = [number, number] | [string, number];
const getMappedOpcodes = (opcodes: UnmappedOpcodes[]): OpcodeObj[] => {
  return opcodes.map(opcode => {
    const [name, param] = opcode;

    return {
      name: (typeof name === 'string' ? name : OPCODES[name]) as Opcode,
      code: name,
      param,
    };
  });
}

const getFormattedTiles = (tiles: RawFieldData['tiles']) => {
  return tiles.map(tile => {
    return {
      index: tile[0],
      X: tile[1],
      Y: tile[2],
      Z: tile[3],
      texID: tile[4],
      isBlended: tile[5],
      depth: tile[6],
      palID: tile[7],
      layerID: tile[8],
      blendType: tile[9],
      parameter: tile[10],
      state: tile[11],
    };
  })
}

export const getFieldData = async (fieldId: string) => {
  const response = await fetch(`/output/${fieldId}.json`);
  const data = await response.json() as RawFieldData;

  const withMappedOpcodes = {
    ...data,
    tiles: getFormattedTiles(data.tiles),
    scripts: data.scripts.map(script => {
      return {
        ...script,
        type: script.type as ScriptType,
        methods: script.methods.map(method => {
          return {
            ...method,
            opcodes: getMappedOpcodes(method.opcodes as [number, number][])
          };
        })
      };
    })
  };

  return withMappedOpcodes;
}
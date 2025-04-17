import { Scene, Vector3 } from "three";
import useGlobalStore from "../store";
import { RawFieldData } from "./Field";
import { OPCODES } from "./Scripts/constants";
import { MEMORY, restoreMemory } from "./Scripts/Script/handlers";
import { Opcode, OpcodeObj, ScriptType } from "./Scripts/types";
import MAP_NAMES from "../constants/maps";

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

type SaveData = {
  MEMORY: typeof MEMORY,
  fieldId: typeof MAP_NAMES[number],
  characterPosition: VectorLike,
  party: number[],
  availableCharacters: number[],
}

export const saveGame = (scene: Scene) => {
  const { fieldId, party, availableCharacters } = useGlobalStore.getState();
  const player = scene.getObjectByName("character")
  if (!player) {
    console.warn('Player not found');
    return;
  }
  const position = new Vector3();
  player.getWorldPosition(position);

  const saveData: SaveData = {
    MEMORY: MEMORY,
    fieldId,
    characterPosition: position,
    party,
    availableCharacters,
  }
  console.log('Saving game', saveData);
  window.localStorage.setItem('saveData', JSON.stringify(saveData));
}

export const loadGame = () => {
  const saveData = window.localStorage.getItem('saveData');
  if (!saveData) {
    console.warn('No save data found');
    return;
  }
  const parsedData = JSON.parse(saveData) as SaveData;
  console.log('Loading game', parsedData);
  const { fieldId, characterPosition, party, availableCharacters } = parsedData;

  useGlobalStore.setState({
    fieldId: undefined,
    pendingFieldId: fieldId,
    pendingCharacterPosition: new Vector3(characterPosition.x, characterPosition.y, characterPosition.z),
    party,
    availableCharacters,
  });

  restoreMemory(parsedData.MEMORY);
}
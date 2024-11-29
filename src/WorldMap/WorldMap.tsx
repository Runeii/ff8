import { useEffect } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import MAP_NAMES from "../constants/maps";
import useGlobalStore from "../store";
import { fadeInMap } from "../Field/Scripts/Script/common";

const points: Record<string, typeof MAP_NAMES[number]> = {
  "Balamb Garden": 'bghall_1',
  "Balamb": 'bcgate_1',
  "Dollet Town": 'dosea_1',
  "Timber": 'tigate1',
  "Deling City": 'glsta1',
  "Fisherman's Horizon": 'fhwisef2',
  "Esthar": 'ecpview1',
  "Winhill": 'gflain1a',
  "Trabia Garden": 'tgfront1',
  "Deep Sea Research Centre": 'sdisle1',
  "Tear's Point": 'eeview1',
  "Shumi Village": 'tmdome1',
  "Lab": 'edview1b',
}

const WorldMap = () => {
  useEffect(() => {
    fadeInMap();
  
    const text = `Select destination:\n${Object.keys(points).join('\n')}`;
    openMessage('worldMap', [text], { x: 0,  y: 0 }, {
      first: 1,
      default: 1,
      cancel: undefined
    }).then((selectedOption) => {
      console.log('Selected:', selectedOption);
      useGlobalStore.setState({
        fieldId: undefined,
        pendingFieldId: Object.values(points)[selectedOption],
      })
    });
  }, []);

  return null;
}

export default WorldMap;
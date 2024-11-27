import { useEffect, useState } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import MAP_NAMES from "../constants/maps";
import useGlobalStore from "../store";
import { fadeInMap } from "../Field/Scripts/Script/common";

const points: Record<string, typeof MAP_NAMES[number]> = {
  "Balamb Garden": 'bghall_1',
  "Balamb": 'bcgate_1',
  "Trabia Garden": 'tgcourt2',
  "Esthar": 'ecpview1',
  "Deling City": 'glform1',
  "Timber": 'titown3',
  "Dollet Town": 'dogate_2',
  "Deep Sea Research Centre": 'sdisle1',
  "Lab": 'edview1b',
  "Tear's Point": 'eeview1',
  "Winhill": 'gflain1a',
  "Fisherman's Horizon": 'fhwisef2',
  "Shumi Village": 'tmdome1',
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
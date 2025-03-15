import { useEffect } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import MAP_NAMES from "../constants/maps";
import { fadeInMap } from "../Field/Scripts/Script/common";

const points: Record<string, typeof MAP_NAMES[number]> = {
  "Balamb Garden": 'bghall_1',
  "Balamb": 'bcgate_1',
  "Dollet Town": 'dosea_1',
  "Timber": 'tigate1',
  //"Deling City": 'glsta1',
  //"Fisherman's Horizon": 'fhwisef2',
  //"Esthar": 'ecpview1',
  //"Winhill": 'gflain1a',
  //"Trabia Garden": 'tgfront1',
  //"Deep Sea Research Centre": 'sdisle1',
  //"Tear's Point": 'eeview1',
  //"Shumi Village": 'tmdome1',
  //"Lab": 'edview1b',
}

const Onboarding = () => {
  useEffect(() => {
    fadeInMap();

    openMessage('welcome', ['Welcome'], { x: 0,  y: 0 }, false);
  
    openMessage('menu', ['New Game\nResume Game\nControls'], { x: 100,  y: 80 }, true, {
      first: 0,
      default: 0,
      cancel: undefined
    });

  }, []);

  return null;
}

export default Onboarding;
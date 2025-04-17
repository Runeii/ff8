import { useEffect } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import MAP_NAMES from "../constants/maps";
import { fadeInMap } from "../Field/Scripts/Script/common";
import useGlobalStore from "../store";
import { loadGame } from "../Field/fieldUtils";

const points: Record<string, typeof MAP_NAMES[number]> = {
  "Balamb Garden": 'bghall_1',
  "Balamb": 'bcgate_1',
  "Dollet Town": 'dosea_1',
  "Timber": 'tigate1',
  "Deling City": 'glsta1',
  "Fisherman's Horizon": 'fhwisef2',
  "Esthar": 'ecpview1',
  "Winhill": 'gflain1a',
  "Deep Sea Research Centre": 'sdisle1',
  "Tear's Point": 'eeview1',
  "Shumi Village": 'tmdome1',
  "Lab": 'edview1b',
}

const closeAllWindows = () => {
  useGlobalStore.setState({
    currentMessages: []
  });
}

const hasSavedData = !!(window.localStorage.getItem('saveData'));

const fieldSelect = async (set = 0) => {
  const options = Object.keys(points).slice(set * 8, set * 8 + 8);
  const isFirstPage = set === 0;
  const selectedOption = await openMessage('fieldSelect', [`Field Select\n${options.join('\n')}\n{Blue}${isFirstPage ? 'Next Page' : 'Previous Page'}{White}\nCancel`], { x: 0,  y:15 }, true, {
    first: 1,
    default: 1,
    cancel: Object.keys(points).length - 1
   });

   if (selectedOption === options.length + 1) {
    mainMenuSelect(2);
    return;
  }

  if (selectedOption === options.length) {
    closeAllWindows();
    fieldSelect(isFirstPage ? 1 : 0);
    return;
  }

  useGlobalStore.setState({
    fieldId: undefined,
    pendingFieldId: Object.values(points)[selectedOption + set * 8],
  })
}

const mainMenuSelect = async (defaultValue = hasSavedData ? 1 : 0) => {
  openMessage('welcome', ['Welcome'], { x: 0,  y: 0 }, false);
  
  const option = await openMessage('menu', [`New Game\n${hasSavedData ? '' : '{Gray}'}Resume Game{White}\nField Select\nControls`], { x: 100,  y: 80 }, true, {
    first: 0,
    default: defaultValue,
    cancel: undefined
  });

  closeAllWindows();

  if (option === 0) {
    useGlobalStore.setState({
      pendingFieldId: 'start0',
    });
    return;
  }

  if (option === 1) {
    loadGame();
    
    return;
  }

  if (option === 2) {
    fieldSelect();
    return;
  }

  if (option === 3) {
    await openMessage('controls', [`Controls
     {Yellow}Move{White} - [Arrows]
     {Yellow}Interact{White} - [Space]

     {Yellow}Dev Mode{White} - [Esc]
     {Yellow}Reset{White} - [Backspace]`], { x: 70,  y: 50 }, true);

    mainMenuSelect(3);
  }
}
const Onboarding = () => {
  useEffect(() => {
    fadeInMap();
    mainMenuSelect();

    return () => {
      closeAllWindows();
    }
  }, []);

  return null;
}

export default Onboarding;
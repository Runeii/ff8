import { useEffect } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import MAP_NAMES from "../constants/maps";
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
  const selectedOption = await openMessage('fieldSelect', [`Field Select\n${options.join('\n')}\n{Blue}${isFirstPage ? 'Next Page' : 'Previous Page'}{White}\nCancel`], { channel: 1, x: 0,  y:15 }, true, {
    first: 1,
    default: 1,
    cancel: Object.keys(points).length - 1
   });

   if (selectedOption === options.length + 1) {
    mainMenuSelect(3);
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

const mainMenuSelect = async (defaultValue = hasSavedData ? 2 : 0) => {
  const {fadeSpring} = useGlobalStore.getState();
  openMessage('welcome', ['Welcome'], { channel: 0, x: 0,  y: 0 }, false);

  const option = await openMessage('menu', [`Controls\nNew Game\n${hasSavedData ? '' : '{Grey}'}Resume Game{White}\nField Select`], { channel: 1, x: 100,  y: 80 }, true, {
    first: 0,
    default: defaultValue,
    cancel: undefined,
    blocked: hasSavedData ? [] : [1],
  });

  closeAllWindows();

  if (option === 0) {
    await openMessage('controls', [`Controls
     {Yellow}Move{White} - [Arrows]
     {Yellow}Interact{White} - [Space]

     {Yellow}Dev Mode{White} - [Esc]
     {Yellow}Reset{White} - [Backspace]`], { x: 70,  y: 50 }, true);

    mainMenuSelect(0);
  }

  if (option === 1) {
    await fadeSpring.start(0);
    closeAllWindows();
    useGlobalStore.getState().systemSfxController.play(37, 0, 255, 128);
    useGlobalStore.setState({
      pendingFieldId: 'start0',
    });
    return;
  }

  if (option === 2) {
    await fadeSpring.start(0);
    closeAllWindows();
    loadGame();
    useGlobalStore.getState().systemSfxController.play(37, 0, 255, 128);
    
    return;
  }

  if (option === 3) {
    fieldSelect();
    return;
  }
}
const Onboarding = () => {
  useEffect(() => {
    mainMenuSelect();
  }, []);

  return null;
}

export default Onboarding;
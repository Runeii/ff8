import { useEffect } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import MAP_NAMES from "../constants/maps";
import useGlobalStore from "../store";
import { loadGame } from "../Field/fieldUtils";
import { offlineController } from "../OfflineController";

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
  const selectedOption = await openMessage('fieldSelect', [`Field Select\n${options.join('\n')}\n{Blue}${isFirstPage ? 'Next Page' : 'Previous Page'}{White}\nCancel`], { channel: 1, x: 0,  y:15, width: undefined, height: undefined }, true, {
    first: 1,
    default: 1,
    cancel: Object.keys(points).length - 1,
    last: undefined,
    blocked: undefined
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

const optionsSelect = async () => {
  openMessage('optionsTitle', ['Options'], { channel: 0, x: 0,  y: 0, width: undefined, height: undefined }, false, undefined);
  const { isOfflineEnabled, isEnablingOffline } = offlineController.getState()
  console.log('isOfflineEnabled', isOfflineEnabled, 'isEnablingOffline', isEnablingOffline);

  let offlineOptionMessage = `{Green}Enable Offline (2GB){White}`;
  if (isEnablingOffline) {
    offlineOptionMessage = `{YellowBlink}Enabling offline{White}`;
  }
  if (isOfflineEnabled) {
    offlineOptionMessage = `{Red}Disable offline{White}`;
  }

  const optionsOption = await openMessage('options', [`Controls\n${offlineOptionMessage}\nBack`], { channel: 1, x: 100,  y: 80, width: undefined, height: undefined }, true, {
    first: 0,
    default: 0,
    cancel: 2,
    last: undefined,
    blocked: undefined,
  });

  if (optionsOption === 0) {
    await openMessage('controls', [`Controls
      {Yellow}Move{White} - [Arrows]
      {Yellow}Interact{White} - [Space]

      {Yellow}Dev Mode{White} - [Esc]
      {Yellow}Reset{White} - [Backspace]`], { x: 70,  y: 50, width: undefined, height: undefined, channel: 1 }, true, undefined);
      closeAllWindows();
      optionsSelect();
  }

  if (optionsOption === 1) {
    if (isOfflineEnabled || isEnablingOffline) {
      await offlineController.disableOfflineMode();
    } else {
      await offlineController.enableOfflineMode();
    }
    closeAllWindows();
    mainMenuSelect();
  }
}

const mainMenuSelect = async (defaultValue = hasSavedData ? 1 : 0) => {
  const {fadeSpring} = useGlobalStore.getState();
  openMessage('welcome', ['Welcome'], { channel: 0, x: 0,  y: 0, width: undefined, height: undefined }, false, undefined);

  const option = await openMessage('menu', [`New Game\n${hasSavedData ? '' : '{Grey}'}Resume Game{White}\nField Select\nOptions`], { channel: 1, x: 100,  y: 80, width: undefined, height: undefined }, true, {
    first: 0,
    default: defaultValue,
    cancel: undefined,
    last: undefined,
    blocked: hasSavedData ? [] : [1],
  });

  closeAllWindows();

  if (option === 0) {
    await fadeSpring.start(0);
    closeAllWindows();
    useGlobalStore.getState().systemSfxController.play(37, 0, 255, 128);
    useGlobalStore.setState({
      pendingFieldId: 'start0',
    });
    return;
  }

  if (option === 1) {
    await fadeSpring.start(0);
    closeAllWindows();
    loadGame();
    useGlobalStore.getState().systemSfxController.play(37, 0, 255, 128);
    
    return;
  }

  if (option === 2) {
    fieldSelect();
    return;
  }

  if (option === 3) {
    await optionsSelect();
    mainMenuSelect(0);
  }
}
const Onboarding = () => {
  useEffect(() => {
    mainMenuSelect();
  }, []);

  return null;
}

export default Onboarding;
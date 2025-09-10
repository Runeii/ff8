import { useEffect } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import useGlobalStore from "../store";
import { loadGame } from "../Field/fieldUtils";
import { offlineController } from "../OfflineController";
import { CHAPTERS } from "./CHAPTERS";
import { MEMORY } from "../Field/Scripts/Script/handlers";
import MAP_NAMES from "../constants/maps";

const closeAllWindows = () => {
  useGlobalStore.setState({
    currentMessages: []
  });
}

const hasSavedData = !!(window.localStorage.getItem('saveData'));

const fieldSelect = async (set = 0) => {
  const options = Object.keys(CHAPTERS).slice(set * 8, set * 8 + 8);
  const isFirstPage = set === 0;
  const selectedOption = await openMessage('fieldSelect', [`Field Select\n${options.join('\n')}\n{Blue}${isFirstPage ? 'Next Page' : 'Previous Page'}{White}\nCancel`], { channel: 1, x: 0,  y:15, width: undefined, height: undefined }, true, {
    first: 1,
    default: 1,
    cancel: Object.keys(CHAPTERS).length - 1,
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

  const selection = Object.values(CHAPTERS)[selectedOption + set * 8];
  if (!selection) {
    mainMenuSelect(3);
    return;
  }

  useGlobalStore.setState(state => ({
    fieldId: undefined,
    pendingFieldId: selection.fieldId! as typeof MAP_NAMES[number],
    // @ts-expect-error Not sepecified in all chapters
    party: selection.party ?? state.party
  }));

  MEMORY[256] = selection.progress;
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
      {Yellow}Confirm{White} - [Z]
      {Yellow}Cancel{White} - [X]
      {Yellow}Card/Run{White} - [A]
      {Yellow}Menu{White} - [S]

      {Yellow}Dev Mode{White} - [Esc]`], { x: 70,  y: 50, width: undefined, height: undefined, channel: 1 }, true, undefined);
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
    await fadeSpring.start(0, 500);
    closeAllWindows();
    useGlobalStore.getState().systemSfxController.play(37, 0, 127, 128);
    useGlobalStore.setState({
      pendingFieldId: 'start0',
    });
    return;
  }

  if (option === 1) {
    await fadeSpring.start(0, 500);
    closeAllWindows();
    loadGame();
    useGlobalStore.getState().systemSfxController.play(37, 0, 127, 128);
    
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
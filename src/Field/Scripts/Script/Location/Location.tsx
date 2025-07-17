import { Mesh } from "three";
import { useCallback, useMemo, useRef } from "react";
import { ScriptStateStore } from "../state";
import useGlobalStore from "../../../../store";
import useIntersection from "../useIntersection";
import LineBlock from "../../../LineBlock/LineBlock";
import createScriptController from "../ScriptController/ScriptController";

type LocationProps = {
  scriptController: ReturnType<typeof createScriptController>;
  useScriptStateStore: ScriptStateStore;
}

const Location = ({ scriptController, useScriptStateStore }: LocationProps) => {
  const isLineOn = useScriptStateStore(state => state.isLineOn);
  const linePoints = useScriptStateStore(state => state.linePoints);

  const lineRef = useRef<Mesh>(null);

  const talkMethod = scriptController.script.methods.find(method => method.methodId === 'talk');

  const hasValidTalkMethod = useMemo(() => {
    if (!talkMethod) {
      return false;
    }
    return talkMethod.opcodes.filter(opcode => !opcode.name.startsWith('LABEL') && opcode.name !== 'LBL' && opcode.name !== 'RET').length > 0;
  }, [talkMethod]);

  
  
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const { currentMessages, isUserControllable, hasActiveTalkMethod  } = useGlobalStore.getState();
    const isTalkable = useScriptStateStore.getState().isTalkable;
    const hasActiveText = currentMessages.length > 0;

    const isPlayerAbleToTalk = isUserControllable && isTalkable && !hasActiveTalkMethod && hasValidTalkMethod && !hasActiveText;
    console.log('isPlayerAbleToTalk', isPlayerAbleToTalk, 'hasValidTalkMethod', hasValidTalkMethod, 'hasActiveText', hasActiveText);
    if (!isPlayerAbleToTalk || !lineRef.current) {
      return;
    }

    event.stopImmediatePropagation();
    if (event.key !== ' ') {
      return;
    }

    useGlobalStore.setState({ hasActiveTalkMethod: true });
    scriptController.triggerMethod('talk').then(() => {
      useGlobalStore.setState({ hasActiveTalkMethod: false });
    });
  }, [hasValidTalkMethod, scriptController, useScriptStateStore]);

  const isUserControllable = useGlobalStore(state => state.isUserControllable);

  useIntersection(lineRef.current, isLineOn && isUserControllable, {
    onTouchOn: () => {
      console.log('onTouchOn', scriptController.script.groupId)
      window.addEventListener('keydown', onKeyDown);
      scriptController.triggerMethod('touchon');
    },
    onTouch: () => {
      console.log('onTouch', scriptController.script.groupId)
       scriptController.triggerMethod('touch');
    },
    onTouchOff: () => {
      console.log('onTouchOff', scriptController.script.groupId)
      window.removeEventListener('keydown', onKeyDown);
       scriptController.triggerMethod('touchoff');
    },
    onAcross: () => {
      console.log('onAcross', scriptController.script.groupId)
       scriptController.triggerMethod('across');
    },
  }, linePoints ?? []);

  if (!linePoints || !isLineOn) {
    return null;
  }

  return (
    <LineBlock
      color={isLineOn ? 'blue' : 'grey'}
      lineBlockRef={lineRef}
      points={linePoints}
      renderOrder={0}
      />
  );
}

export default Location;
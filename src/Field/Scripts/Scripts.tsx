import { useCallback, useMemo, useState } from "react";
import { FieldData } from "../Field";
import Script from "./Script/Script";
import { Script as ScriptType } from "./types";
import useGlobalStore from "../../store";
import { sendToDebugger } from "../../Debugger/debugUtils";

type ScriptsProps = {
  doors: FieldData['doors'],
  models: string[],
  scripts: ScriptType[]
  sounds: FieldData['sounds'],
};


const Scripts = ({ doors, models, scripts, sounds }: ScriptsProps) => {
  const fieldId = useGlobalStore(state => state.fieldId);

  const formattedDoors: Door[] = useMemo(() => {
    const doorScripts = scripts.filter(script => script.name.startsWith('Door'));

    return doors.map((door, index) => ({
        ...door,
        name: doorScripts[index]?.name || `UNMATCHED_DOOR`
    }))
  }, [doors, scripts]);

  const [mainScripts, ...otherScripts] = useMemo(() => {
    const mainScripts = scripts.filter(script => script.type === 'main');
    const otherScripts = scripts.filter(script => script.type !== 'main');
    return [mainScripts, ...otherScripts];
  }, [scripts]);

  const [scriptsMounted, setScriptsMounted] = useState<number>(0);
  const handleScriptSetupCompleted = useCallback(() => {
    setScriptsMounted((prev) => {
      sendToDebugger('setup-state', JSON.stringify({
        state: 'scripts-mounted',
        value: prev + 1
      }))
      return prev + 1
    });
  }, []);
  
  const [runningScripts, setRunningScripts] = useState<number>(0);
  const onStarted = useCallback(() => {
    setRunningScripts(prev => {
      sendToDebugger('setup-state', JSON.stringify({
        state: 'running-scripts',
        value: prev + 1
      }))
      return prev + 1
    });
  }, []);

  const [hasMountedMainScripts, setHasMountedMainScripts] = useState<boolean>(false);

  const handleMainScriptMounted = useCallback(() => {
    setHasMountedMainScripts(true);
    sendToDebugger('setup-state', JSON.stringify({
      state: 'main-script-mounted',
      value: true
    }));
  }, []);

  const handleStartedMain = useCallback(() => {
    const {fieldId, fadeSpring} = useGlobalStore.getState();
    sendToDebugger('setup-state', JSON.stringify({
      state: 'main-script-started',
      value: true
    }));
    if (fieldId === 'bghoke_2') {
      fadeSpring.start(1, 10);
    }
  }, []);

  return (
    <>
      {otherScripts.map((script) => (
        <Script 
          doors={formattedDoors}
          key={`${fieldId}--${script.exec}`}
          isActive={scriptsMounted === otherScripts.length}
          models={models}
          script={script}
          onSetupCompleted={handleScriptSetupCompleted}
          onStarted={onStarted}
          sounds={sounds}
        />
      ))}
      {runningScripts === otherScripts.length && mainScripts.map(mainScript => (
        <Script
          doors={formattedDoors}
          key={`${fieldId}--${mainScript.exec}`}
          isActive={hasMountedMainScripts}
          models={models}
          script={mainScript}
          onSetupCompleted={handleMainScriptMounted}
          onStarted={handleStartedMain}
          sounds={sounds}
        />
      ))}
    </>
  );
}

export default Scripts;
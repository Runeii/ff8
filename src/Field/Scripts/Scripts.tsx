import { useCallback, useState } from "react";
import { FieldData } from "../Field";
import Script from "./Script/Script";
import { Script as ScriptType } from "./types";
import useGlobalStore from "../../store";

export type ScriptsProps = {
  doors: FieldData['doors'],
  models: string[],
  scripts: ScriptType[]
};


const Scripts = ({ doors, models, scripts }: ScriptsProps) => {
  const fieldId = useGlobalStore(state => state.fieldId);
  const [activeScripts, setActiveScripts] = useState<ScriptType[]>([scripts[0]]);

  const handleScriptSetupCompleted = useCallback(() => {
    const currentScriptIdx = scripts.findIndex(script => script === activeScripts[activeScripts.length - 1]);

    if (currentScriptIdx === scripts.length - 1) {
      return;
    }

    setActiveScripts([...activeScripts, scripts[currentScriptIdx + 1]]);
  }, [activeScripts, scripts]);

  return activeScripts.map(script => <Script doors={doors} key={`${fieldId}--${script.exec}`} models={models} script={script} onSetupCompleted={handleScriptSetupCompleted} />  )
}

export default Scripts;
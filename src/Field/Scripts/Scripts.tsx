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
  const [activeExec, setActiveExec] = useState<number>(0);

  const handleScriptSetupCompleted = useCallback(() => {
    setActiveExec((prev) => prev + 1);
  }, []);

  return scripts.map(script => <Script doors={doors} key={`${fieldId}--${script.exec}`} isActive={script.exec <= activeExec} models={models} script={script} onSetupCompleted={handleScriptSetupCompleted} /> )
}

export default Scripts;
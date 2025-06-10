import { useCallback, useMemo, useState } from "react";
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

  const formattedDoors: Door[] = useMemo(() => {
    const doorScripts = scripts.filter(script => script.name.startsWith('Door'));

    return doors.map((door, index) => ({
        ...door,
        name: doorScripts[index]?.name || `UNMATCHED_DOOR`
    }))
  }, [doors, scripts]);

  return scripts.map(script => <Script doors={formattedDoors} key={`${fieldId}--${script.exec}`} isActive={activeExec === scripts.length} models={models} script={script} onSetupCompleted={handleScriptSetupCompleted} /> )
}

export default Scripts;
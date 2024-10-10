import { useMemo } from "react";
import Location from "./Location/Location";
import { Script, ScriptType } from "./types";
import Background from "./Background/Background";

export type ScriptsProps = {
  scripts: Script[];
};


const Scripts = ({ scripts }: ScriptsProps) => {
  const groupedScripts = useMemo(() => {
    const result: Record<ScriptType, Script[]> = {
      location: [],
      model: [],
      background: [],
      unknown: [],
      door: [],
    };

    // Group scripts by script[number].type
    scripts.forEach((script) => {
      result[script.type as ScriptType].push(script);
    })

    return result;
  }, [scripts]);

  return (
    <>
      {groupedScripts.location.map((script) => <Location key={script.name} script={script} />)}
      {groupedScripts.background.map((script) => <Background key={script.name} script={script} />)}
    </>
  );
}

export default Scripts;
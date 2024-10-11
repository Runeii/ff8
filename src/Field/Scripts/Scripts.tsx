import { useMemo } from "react";
import Location from "./Location/Location";
import { Script, ScriptType } from "./types";
import Background from "./Background/Background";
import Plane from "./Plane/Plane";

export type ScriptsProps = {
  scripts: Script[];
};


const Scripts = ({ scripts }: ScriptsProps) => {
  const groupedScripts = useMemo(() => {
    const result: Record<ScriptType | '_planes', Script[]> = {
      location: [],
      model: [],
      background: [],
      unknown: [],
      door: [],
      // Custom groupings
      _planes: [],
    };

    // Group scripts by script[number].type
    scripts.forEach((script) => {
      result[script.type as ScriptType].push(script);
    })

    result.unknown.forEach((script) => {
      const planeNames = ['view1', 'plane', 'plane1']
      if (planeNames.includes(script.name)) {
        result._planes.push(script);
        result.unknown = result.unknown.filter((s) => s !== script);
      }
    })
    return result;
  }, [scripts]);

  return (
    <>
      {groupedScripts.location.map((script) => <Location key={script.name} script={script} />)}
      {groupedScripts.background.map((script) => <Background key={script.name} script={script} />)}
      {groupedScripts._planes.map((script) => <Plane key={script.name} script={script} />)}
    </>
  );
}

export default Scripts;
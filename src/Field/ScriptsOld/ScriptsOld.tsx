import { useEffect, useMemo } from "react";
import Location from "./Location/Location";
import { Script, ScriptType } from "./types";
import Background from "../Scripts/Script/Background/Background";
import Plane from "./Plane/Plane";
import Unknown from "./Unknown/Unknown";
import Model from "./Model/Model";
import { FieldData } from "../Field";
import useGlobalStore from "../../store";

export type ScriptsProps = {
  scripts: FieldData['scripts']
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
      result[script.type as ScriptType].push(script as Script);
    })

    result.unknown.forEach((script) => {
      const isAScrollScript = script.methods.find(method => method.methodId === 'default')?.opcodes.some(opcode => opcode.name === 'SCROLLMODE2');
      if (isAScrollScript) {
        result._planes.push(script);
        result.unknown = result.unknown.filter((s) => s !== script);
      }
    })
    return result;
  }, [scripts]);

  useEffect(() => {
    useGlobalStore.setState({
      fieldScripts: scripts as Script[],
    })

    return () => {
      useGlobalStore.setState({
        fieldScripts: [],
      })
    }
  }, [scripts]);

  return (
    <>
      {groupedScripts.location.map((script) => <Location key={script.name} script={script} />)}
      {groupedScripts.background.map((script) => <Background key={script.name} script={script} />)}
      {groupedScripts._planes.map((script) => <Plane key={script.name} script={script} />)}
      {groupedScripts.unknown.map((script) => <Unknown key={script.name} script={script} />)}
      {groupedScripts.model.map((script) => <Model key={script.name} script={script} />)}
    </>
  );
}

export default Scripts;
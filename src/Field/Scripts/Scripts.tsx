import { FieldData } from "../Field";
import Script from "./Script/Script";
import { Script as ScriptType } from "./types";

export type ScriptsProps = {
  doors: FieldData['doors'],
  models: string[],
  scripts: ScriptType[]
};


const Scripts = ({ doors, models, scripts }: ScriptsProps) => {
  return scripts.map(script => <Script doors={doors} key={script.exec} models={models} script={script} />)
}

export default Scripts;
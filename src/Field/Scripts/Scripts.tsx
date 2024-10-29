import Script from "./Script/Script";
import { Script as ScriptType } from "./types";

export type ScriptsProps = {
  models: string[],
  scripts: ScriptType[]
};


const Scripts = ({ models, scripts }: ScriptsProps) => {
  return scripts.map(script => <Script key={script.exec} models={models} script={script} />)
}

export default Scripts;
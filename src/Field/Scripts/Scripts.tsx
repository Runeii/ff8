import Script from "./Script/Script";
import { Script as ScriptType } from "./types";

export type ScriptsProps = {
  scripts: ScriptType[]
};


const Scripts = ({ scripts }: ScriptsProps) => {
  return scripts.map(script => <Script key={script.exec} script={script} />)
}

export default Scripts;
import { FieldData } from "../Field";
import Script from "./Script/Script";

export type ScriptsProps = {
  scripts: FieldData['scripts']
};


const Scripts = ({ scripts }: ScriptsProps) => {
  return scripts.map(script => <Script key={script.exec} script={script} />)
}

export default Scripts;
import { useMemo } from "react";
import { FieldData } from "../Field";

type ScriptsProps = {
  data: FieldData;
};

const Scripts = ({ data }: ScriptsProps) => {
  const groupedScripts = useMemo(() => {
    const result = {};
    // Group scripts by script[number].type
    data.scripts.forEach((script: FieldData['scripts'][number]) => {
      if (!result[script.type]) {
        result[script.type] = [];
      }
      result[script.type].push(script);
    })
  }, [data]);
}

export default Scripts;
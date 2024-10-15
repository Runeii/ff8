import { Script } from "../types";
import useScript from "../useScript";

const Unknown = ({ script }: { script: Script }) => {
  const hasCompletedConstructor = useScript(script, 'constructor?', () => null, { once: true });

  useScript(script, 'default', () => null, {
    condition: hasCompletedConstructor,
  })

  return null;
}

export default Unknown;
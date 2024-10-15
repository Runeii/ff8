import { Script } from "../types";
import useScript from "../useScript";

const Plane = ({ script }: { script: Script }) => {
  const hasCompletedConstructor = useScript<{controlledScroll: {mode: number, x: number, y: number}}>(script, 'constructor?', () => null, {
    once: true
  });

  useScript<{controlledScroll: {mode: number, x: number, y: number}}>(script, 'default',  () => null, {
    condition: hasCompletedConstructor
  })

  return null;
}

export default Plane;
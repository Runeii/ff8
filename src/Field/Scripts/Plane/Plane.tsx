import useGlobalStore from "../../../store";
import { Script } from "../types";
import useScript from "../useScript";

const Plane = ({ script }: { script: Script }) => {
  useScript<{controlledScroll: {mode: number, x: number, y: number}}>(script, 'constructor?', {
    once: true
  });

  useScript<{controlledScroll: {mode: number, x: number, y: number}}>(script, 'default')

  return null;
}

export default Plane;
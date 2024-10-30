import { useEffect } from "react";
import { Script } from "../types";

const useTriggerEvent = (methodId: string, script: Script, setActiveMethodId: (methodId: string) => void, condition: boolean) => {
  useEffect(() => {
    const matchingMethodId = script.methods.find(method => method.methodId === methodId)?.methodId;

    if (!matchingMethodId || !condition) {
      return;
    }
    setActiveMethodId(matchingMethodId);
  }, [condition, methodId, script.methods, setActiveMethodId]);
}

export default useTriggerEvent;
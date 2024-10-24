import { useEffect } from "react";
import { Script } from "../types";

const useTriggerEvent = (eventName: string, script: Script, setActiveMethodId: (methodId: number) => void, condition: boolean) => {
  const matchingMethodId = script.methods.find(method => method.methodId === eventName)?.scriptLabel;

  useEffect(() => {
    if (!matchingMethodId || !condition) {
      return;
    }

    setActiveMethodId(matchingMethodId);
  }, [condition, matchingMethodId, setActiveMethodId]);
}

export default useTriggerEvent;
import {  useThree } from "@react-three/fiber";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

const KEY_MAP: Record<string, keyof MovementFlags> = {
  ArrowUp: "forward",
  KeyW: "forward",
  ArrowDown: "backward",
  KeyS: "backward",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const onMovementKeyPress = (
  invalidate: (frames?: number) => void,
  setMovementFlags: Dispatch<SetStateAction<MovementFlags>>,
  value: boolean
) => (event: KeyboardEvent) => {
  invalidate()
  const movementKey = KEY_MAP[event.code];

  setMovementFlags((movementFlags: MovementFlags) => {
    const currentFlags: MovementFlags = { ...movementFlags };
    if (Object.keys(movementFlags).includes(movementKey)) {
      currentFlags[movementKey] = value;
    }
    currentFlags.isWalking = event.shiftKey;
    return currentFlags;
  });
};

const useKeyboardControls = () => {
  const invalidate = useThree(({ invalidate }) => invalidate);
  const [movementFlags, setMovementFlags] = useState<MovementFlags>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    isWalking: false,
  });

  useEffect(() => {
    const handleKeyDown = onMovementKeyPress(invalidate, setMovementFlags, true);
    const handleKeyUp = onMovementKeyPress(invalidate, setMovementFlags, false);
    const clearMovementFlags = () => {
      setMovementFlags({
        forward: false,
        backward: false,
        left: false,
        right: false,
        isWalking: false,
      });
    };
    window.addEventListener("blur", clearMovementFlags);
    window.addEventListener("focus", clearMovementFlags);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearMovementFlags);
      window.removeEventListener("focus", clearMovementFlags);
    };
  }, [invalidate]);

  return movementFlags;
};

export default useKeyboardControls;
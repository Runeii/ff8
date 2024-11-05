import { useEffect, useRef } from "react";

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

export const onMovementKeyPress = (
  movementFlags: React.MutableRefObject<MovementFlags>,
  value: boolean
) => (event: KeyboardEvent) => {
  const movementKey = KEY_MAP[event.code];

  if (movementKey) {
    movementFlags.current[movementKey] = value;
  }

  movementFlags.current.isWalking = event.shiftKey;
};

const useKeyboardControls = () => {
  const movementFlagsRef = useRef<MovementFlags>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    isWalking: false,
  });

  useEffect(() => {
    const handleKeyDown = onMovementKeyPress(movementFlagsRef, true);
    const handleKeyUp = onMovementKeyPress(movementFlagsRef, false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return movementFlagsRef.current;
};

export default useKeyboardControls;
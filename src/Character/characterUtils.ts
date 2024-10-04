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
};

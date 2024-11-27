import { SpringRef } from "@react-spring/web";
import useGlobalStore from "../../../store";
import { Vector3 } from "three";
import { clamp } from "three/src/math/MathUtils.js";

export const KEYS: Record<number, string> = {
  192: 'Space'
}

export const dummiedCommand = () => { }

export const unusedCommand = () => { }

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForKeyPress = (key: number) => {
  return new Promise<void>((resolve) => {
    const handleKeyPress = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.code === KEYS[key]) {
        window.removeEventListener('keydown', handleKeyPress);
        resolve();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
  });
}

type PossibleState = Record<string, unknown> & {
  immediate?: boolean;
  config?: Record<string, unknown>;
}
export function asyncSetSpring<T extends object>(setSpring: SpringRef<T>, state: PossibleState) {
  return new Promise<void>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { config, immediate, ...values } = state;
    if (JSON.stringify(setSpring.current[0].get()) === JSON.stringify(values)) {
      resolve();
      return;
    }
    setSpring({
      ...state,
      onRest: () => resolve(),
    });
  });
}

export const remoteExecute = (scriptLabel: number, source: string, partyMemberId?: number) => new Promise<void>((resolve) => {
  const key = Math.random().toString(36).substring(7);
  document.addEventListener('scriptFinished', ({ detail }) => {
    if (detail.key !== key) {
      return;
    }

    resolve();
  });

  document.dispatchEvent(new CustomEvent('executeScript', {
    detail: {
      key,
      scriptLabel,
      partyMemberId,
      source,
    } as ExecuteScriptEventDetail
  }));
})

export const openMessage = (id: string, text: string[], placement: MessagePlacement, askOptions?: AskOptions) => new Promise<number>((resolve) => {
  const { currentMessages } = useGlobalStore.getState();

  document.addEventListener('messageClosed', ({ detail }) => {
    if (detail.id !== id) {
      return;
    }

    resolve(detail.selectedOption);
  });

  useGlobalStore.setState({
    currentMessages: [
      ...currentMessages,
      {
        id,
        text,
        placement,
        askOptions,
      }
    ]
  });
})

export const getRotationAngleToDirection = (
  currentDirection: Vector3,
  targetDirection: Vector3,
  rotationAxis: Vector3 = new Vector3(0, 0, 1)
) => {
  // Normalize the input vectors
  const currentDirNormalized = currentDirection.clone().normalize();
  const targetDirNormalized = targetDirection.clone().normalize();

  // Compute the dot product and clamp to avoid precision errors
  const dot = clamp(
    currentDirNormalized.dot(targetDirNormalized),
    -1,
    1
  );

  // Calculate the angle in radians
  const angle = Math.acos(dot);

  // Determine the sign of the angle using the cross product
  const cross = new Vector3().crossVectors(currentDirNormalized, targetDirNormalized);

  // If the cross product points in the same direction as the rotation axis, the angle is positive
  const sign = cross.dot(rotationAxis) >= 0 ? 1 : -1;

  return angle * sign; // Return the signed angle
}

export const convert255ToRadians = (value: number) => {
  if (value < 0 || value > 255) {
    throw new Error("Value must be in the range 0-255.");
  }
  return value * (2 * Math.PI / 255);
}

export const convertRadiansTo255 = (radians: number) => {
  if (radians < 0 || radians > 2 * Math.PI) {
    throw new Error("Radians must be in the range 0 to 2π.");
  }
  return Math.round(radians * (255 / (2 * Math.PI)));
}

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

  const { party } = useGlobalStore.getState();

  document.dispatchEvent(new CustomEvent('executeScript', {
    detail: {
      key,
      scriptLabel,
      partyMemberId: partyMemberId ? party[partyMemberId] : undefined,
      source,
    } as ExecuteScriptEventDetail
  }));
})

export const remoteExecuteOnPartyEntity = (partyMemberId: number, methodIndex: number, source: string) => new Promise<void>((resolve) => {
  const key = Math.random().toString(36).substring(7);

  document.addEventListener('scriptFinished', ({ detail }) => {
    if (detail.key !== key) {
      return;
    }

    resolve();
  });

  const { party } = useGlobalStore.getState();

  document.dispatchEvent(new CustomEvent('executeScriptOnPartyEntity', {
    detail: {
      key,
      methodIndex,
      partyMemberId: party[partyMemberId],
      source,
    } as ExecutePartyEntityScriptEventDetail
  }));
})

export const openMessage = (id: string, text: string[], placement: MessagePlacement, isCloseable = true, askOptions?: AskOptions) => new Promise<number>((resolve) => {
  const { currentMessages } = useGlobalStore.getState();

  document.addEventListener('messageClosed', ({ detail }) => {
    console.log(detail)
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
        isCloseable,
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


export const hasCrossedLine = (vector1: Vector3, vector2: Vector3, linePoint1: Vector3, linePoint2: Vector3) => {
  // Create line direction vector
  const lineDirection = new Vector3()
      .subVectors(linePoint2, linePoint1)
      .normalize();

  // Create vectors from line start to each point
  const toVector1 = new Vector3().subVectors(vector1, linePoint1);
  const toVector2 = new Vector3().subVectors(vector2, linePoint1);

  // Calculate cross products
  const cross1 = new Vector3().crossVectors(lineDirection, toVector1);
  const cross2 = new Vector3().crossVectors(lineDirection, toVector2);

  // Calculate dot product of the cross products
  // If negative, points are on opposite sides
  const dotProduct = cross1.dot(cross2);

  return dotProduct < 0;
}
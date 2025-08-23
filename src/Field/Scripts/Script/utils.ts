import { SpringRef } from "@react-spring/web";
import useGlobalStore from "../../../store";
import { Scene, Vector3 } from "three";
import createScriptController from "./ScriptController/ScriptController";
import { getPartyMemberModelComponent } from "./Model/modelUtils";

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

export const remoteExecute = async (scriptLabel: number, priority = 10) => new Promise<void>((resolve) => {
  const key = Math.random().toString(36).substring(7);

  const handler = ({ detail }: { detail: { key: string }}) => {
    if (detail.key !== key) {
      return;
    }
    document.removeEventListener('scriptFinished', handler);
    resolve();
  }

  document.addEventListener('scriptFinished', handler);

  document.dispatchEvent(new CustomEvent('executeScript', {
    detail: {
      key,
      scriptLabel,
      priority,
    } as ExecuteScriptEventDetail
  }));
});

export const remoteExecutePartyMember = async (scene: Scene, partyMemberIndex: number, scriptLabel: number, priority = 10) => {
  const actor = getPartyMemberModelComponent(scene, partyMemberIndex);
  if (!actor) {
    console.warn(`Party member index ${partyMemberIndex} not found`);
    return;
  }
  
  const scriptController = actor.userData.scriptController as ReturnType<typeof createScriptController>;

  if (!scriptController) {
    console.warn(`Script controller not found for party member ${partyMemberIndex}`);
    return;
  }
  console.log(`Executing script ${scriptLabel} on party member ${partyMemberIndex} ${partyMemberIndex}`);
  await scriptController.triggerMethodByIndex(scriptLabel, priority);
}

export const openMessage = (id: string, text: string[], placement: MessagePlacement, isCloseable = true, askOptions: AskOptions | undefined) => new Promise<number>((resolve) => {
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
        isCloseable,
        askOptions,
      }
    ]
  });
})

export const closeMessage = (id: string, selectedOptionIndex?: number) => {
  useGlobalStore.setState(state => {
    const currentMessages = state.currentMessages.filter(message => message.id !== id);
    return {
      ...state,
      currentMessages
    };
  });

  document.dispatchEvent(new CustomEvent('messageClosed', {
    detail: {
      id,
      selectedOption: selectedOptionIndex,
    }
  }));
}

export const enableMessageToClose = (id: string) => {
  useGlobalStore.setState(state => {
    const currentMessages = state.currentMessages.map(message => {
      if (message.id === id) {
        return {
          ...message,
          isCloseable: true
        };
      }
      return message;
    });
    return {
      ...state,
      currentMessages
    };
  });
}

export const getRotationAngleToDirection = (
  currentDirection: Vector3,
  targetDirection: Vector3,
  rotationAxis: Vector3 = new Vector3(0, 0, 1)
) => {
  // Normalize the vectors and rotation axis
  const currentDirNormalized = currentDirection.clone().normalize();
  const targetDirNormalized = targetDirection.clone().normalize();
  const axisNormalized = rotationAxis.clone().normalize();
  
  // Project both vectors onto the plane perpendicular to the rotation axis
  const currentProj = currentDirNormalized.clone().sub(
    axisNormalized.clone().multiplyScalar(currentDirNormalized.dot(axisNormalized))
  ).normalize();
  
  const targetProj = targetDirNormalized.clone().sub(
    axisNormalized.clone().multiplyScalar(targetDirNormalized.dot(axisNormalized))
  ).normalize();
  
  // Calculate the angle between the projected vectors
  const dot = Math.max(-1, Math.min(1, currentProj.dot(targetProj)));
  const angle = Math.acos(dot);
  
  // Determine the sign of rotation
  const cross = new Vector3().crossVectors(currentProj, targetProj);
  const sign = Math.sign(cross.dot(axisNormalized));
  
  return angle * sign;
};

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

export const convert256ToRadians = (value: number) => (value % 256 / 256) * 2 * Math.PI;

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
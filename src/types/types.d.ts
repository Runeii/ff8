import { useAnimations } from "@react-three/drei";

declare global {
  interface ExecuteScriptEventDetail {
    scriptLabel: number;
    partyMemberId?: number;
    key: string
  }

  // Extend the existing DocumentEventMap interface
  interface DocumentEventMap {
    'executeScript': CustomEvent<ExecuteScriptEventDetail>;
    'scriptFinished': CustomEvent<{ key: string }>;
    'messageClosed': CustomEvent<{ id: string, selectedOption: number }>;
  }
  type MovementFlags = {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    isWalking: boolean;
  };


  type CameraPanAngle = {
    yaw: number,
    pitch: number
    cameraZoom: number
    boundaries: {
      left: number,
      right: number,
      top: number,
      bottom: number
    } | null
  }

  type VectorLike = {
    x: number,
    y: number,
    z: number
  }

  type Gateway = {
    id: string,
    source: string
    target: string;
    sourceLine: VectorLike[],
    destinationPoint: VectorLike;
  }


  type FormattedGateway = {
    target: string;
    sourceLine: Vector3[]
    destination: Vector3;
  }

  type Option = {
    text: string;
    event: string;
  }

  type Message = {
    id: string;
    text: string[];
    x: number;
    y: number;
    askOptions?: AskOptions
  }

  type AskOptions = {
    first: number;
    last?: number;
    default?: number;
    cancel?: number;
  }

  type useAnimationsReturn = ReturnType<typeof useAnimations>
  type GltfHandle = {
    animations: useAnimationsReturn
    group: MutableRef<Group>
    nodes: {
      [key: string]: THREE.SkinnedMesh
    }
    materials: {
      [key: string]: MeshStandardMaterial
    }
  }
}

export { };
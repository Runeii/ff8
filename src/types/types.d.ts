import { useAnimations } from "@react-three/drei";

declare global {
  interface ExecuteScriptEventDetail {
    scriptLabel: number;
    key: string
    source: string
  }

  interface ExecutePartyEntityScriptEventDetail {
    methodIndex: number;
    partyMemberId: number;
    key: string
    source: string
  }

  type RemoteExecutionRequest = {
    key: string;
    methodId: string;
  }

  // Extend the existing DocumentEventMap interface
  interface DocumentEventMap {
    'executeScript': CustomEvent<ExecuteScriptEventDetail>;
    'executeScriptOnPartyEntity': CustomEvent<ExecutePartyEntityScriptEventDetail>;
    handlePartyEntityExecutionRequest
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
    boundaries: {
      left: number,
      right: number,
      bottom: number,
      top: number,
    },
    panX: number,
    panY: number
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
    placement: MessagePlacement;
    askOptions?: AskOptions
  }

  type MessagePlacement = {
    x: number;
    y: number;
    width?: number;
    height?: number;
    channel?: number;
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

  type CongaHistory = {
    position: Vector3;
    angle: number;
  }


}

export { };
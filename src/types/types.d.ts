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

type GeneratedGateway = {
  id: string,
  source: string
  target: string;
  sourceLine: VectorLike[],
  outPoint: VectorLike;
  sourceRot: number;
  destRot: number;
}

type FormattedGateway = {
  id: string;
  source: string;
  target: string;
  sourceLine: Vector3[]
  targetLine: Vector3[]
}

type SimpleGateway = {
  id: string;
  target: string;
  sourceLine: Vector3[]
  destination: Vector3
}
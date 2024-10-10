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
  text: string;
  x: number;
  y: number;
  options?: Option[]
}
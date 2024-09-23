type MovementFlags = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
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
  }
}

import { Camera, OrthographicCamera, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export const renderSceneWithLayers = (scene: Scene, camera: Camera, gl: WebGLRenderer) => {
  const orthoCamera = scene.getObjectByName('orthoCamera') as OrthographicCamera;
  const perspectiveCamera = camera as PerspectiveCamera;

  if (!orthoCamera) {
    return;
  }

  gl.clear()
  gl.autoClear = false;

  gl.clearDepth();
  orthoCamera.layers.set(3);
  gl.render(scene, orthoCamera);

  gl.clearDepth();
  orthoCamera.layers.set(1);
  gl.render(scene, orthoCamera);

  gl.clearDepth();
  perspectiveCamera.layers.set(0);
  gl.render(scene, perspectiveCamera);

  gl.clearDepth();
  orthoCamera.layers.set(2);
  gl.render(scene, orthoCamera);
}
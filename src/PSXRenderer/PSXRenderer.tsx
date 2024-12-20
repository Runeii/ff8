import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, RGBFormat, WebGLRenderTarget } from 'three';
import { OrthographicCamera } from 'three';

const PSXRenderer = () => {
  const WIDTH = 320;
  const HEIGHT = 240;

  const { gl, scene, camera } = useThree();
  const renderTarget = useRef(new WebGLRenderTarget(WIDTH, HEIGHT, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBFormat,
  }));

  const geometry = new PlaneGeometry(WIDTH, HEIGHT);
  const material = new MeshBasicMaterial({
      map: renderTarget.current.texture,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;

  const fullscreenQuad = useRef(mesh);

  const orthoCamera = useRef(
      new OrthographicCamera(-WIDTH / 2, WIDTH / 2, HEIGHT / 2, -HEIGHT / 2, 0.1, 10)
  );
  orthoCamera.current.position.z = 1; // Place the camera at z=1

  useFrame(() => {
    gl.clear()
    gl.autoClear = false;

    gl.setRenderTarget(renderTarget.current);
    gl.clearColor();
    gl.clear(true, true, true);
    gl.render(scene, camera);

    mesh.setRotationFromQuaternion(camera.quaternion);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(fullscreenQuad.current, orthoCamera.current);
  }, 1);

  return null;
}

export default PSXRenderer
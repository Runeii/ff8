import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, RGBFormat, WebGLRenderTarget } from 'three';
import { OrthographicCamera } from '@react-three/drei';

const PSXRenderer = () => {
  const WIDTH = 640;
  const HEIGHT = 480;

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

  const orthoCameraRef = useRef(null);

  useFrame(() => {
    if (!orthoCameraRef.current) {
      return;
    }
    gl.clear()
    gl.autoClear = false;

    gl.setRenderTarget(renderTarget.current);
    gl.clearColor();
    gl.clear(true, true, true);
    gl.render(scene, camera);

    mesh.setRotationFromQuaternion(camera.quaternion);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(fullscreenQuad.current, orthoCameraRef.current);
  }, 1);

  return <OrthographicCamera args={[-WIDTH / 2, WIDTH / 2, HEIGHT / 2, -HEIGHT / 2]} near={0.1} far={10} ref={orthoCameraRef} position={[0,0,1]} />;
}

export default PSXRenderer
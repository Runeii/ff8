import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, Mesh, SpriteMaterial, SubtractiveBlending, Vector3 } from "three";
import useGlobalStore from "../store";
import { useSpring } from "@react-spring/web";

const ColorOverlay = () => {
  const overlayRef = useRef<Mesh>(null);
  
  const colorOverlay = useGlobalStore(state => state.colorOverlay)
  const [spring] = useSpring(() => ({
    from: {
      red: colorOverlay.startRed,
      green: colorOverlay.startGreen,
      blue: colorOverlay.startBlue,
    },
    to: {
      red: colorOverlay.endRed,
      green: colorOverlay.endGreen,
      blue: colorOverlay.endBlue,
    },
    config: {
      duration: (1000 / 30) * colorOverlay.duration,
    },
    onRest: () => {
      console.log('Color overlay transition finished');
      useGlobalStore.setState({
        isTransitioningColorOverlay: false,
      });
    }
  }), [colorOverlay])

  useFrame(({ camera }) => {
    if (!overlayRef.current) {
      return;
    }
    
    const cameraDirection = camera.getWorldDirection(new Vector3());
    const cameraPosition = camera.position.clone();
    overlayRef.current.position.copy(cameraPosition.add(cameraDirection.multiplyScalar(0.1)));

    if (spring.red.get() === undefined) {
      return;
    }

    const material = overlayRef.current.material as SpriteMaterial;
    
    material.blending = colorOverlay.type === 'additive' ? AdditiveBlending : SubtractiveBlending;
    material.color.setRGB(
      spring.red.get() / 255,
      spring.green.get() / 255,
      spring.blue.get() / 255
    );
  });
  
  return (
    <sprite scale={[1,1,1]} position={[0, 0, 0.1]} rotation={[0, 0, 0]} ref={overlayRef} renderOrder={25}>
      <spriteMaterial color="black" blending={AdditiveBlending} depthTest={false} />
    </sprite>
  )
}

export default ColorOverlay;
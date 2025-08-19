import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import useGlobalStore from "../store";
import { useSpring } from "@react-spring/web";
import { ColorBlendEffectImpl } from "./ColorBlendEffect";


const ColorOverlay = () => {
  const colorOverlay = useGlobalStore(state => state.colorOverlay)
  console.log(colorOverlay)
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
      duration: (1000 / 25) * colorOverlay.duration,
    },
    onRest: () => {
      useGlobalStore.setState({
        isTransitioningColorOverlay: false,
      });
    }
  }), [colorOverlay])

  const [effect] = useState(new ColorBlendEffectImpl())

  useFrame(() => {
    const red = spring.red.get();
    const green = spring.green.get();
    const blue = spring.blue.get();

    if (red === undefined) {
      return;
    }

    effect.updateValues({
      color: [red / 255, green / 255, blue / 255],
      blendMode: colorOverlay.type,
      intensity: 1.0
    })
  });

  return <primitive object={effect} dispose={null} />
}

export default ColorOverlay;
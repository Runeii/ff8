import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import useGlobalStore from "../store";
import { ColorBlendEffectImpl } from "./ColorBlendEffect";
import LerpValue from "../LerpValue";

const ColorOverlay = () => {
  const colorOverlay = useGlobalStore(state => state.colorOverlay)

  const [red] = useState(new LerpValue(undefined));
  const [green] = useState(new LerpValue(undefined));
  const [blue] = useState(new LerpValue(undefined));

  useEffect(() => {
    let isRunning = true;
    red.set(colorOverlay.startRed);
    green.set(colorOverlay.startGreen);
    blue.set(colorOverlay.startBlue);

    const duration = red.calculateDuration(colorOverlay.duration);

    Promise.all([
      red.start(colorOverlay.endRed, duration),
      green.start(colorOverlay.endGreen, duration),
      blue.start(colorOverlay.endBlue, duration),
    ]).then(() => {
      if (!isRunning) {
        return;
      }
      useGlobalStore.setState({
        isTransitioningColorOverlay: false,
      });
    });

    return () => {
      isRunning = false;
    };
  }, [blue, colorOverlay, green, red]);

  const [effect] = useState(new ColorBlendEffectImpl())

  useFrame(() => {
    const redValue = red.get();
    const greenValue = green.get();
    const blueValue = blue.get();

    if (redValue === undefined) {
      return;
    }

    const intensity = (redValue + greenValue + blueValue) / 3 / 255;
    effect.updateValues({
      color: [redValue / 255, greenValue / 255, blueValue / 255],
      blendMode: colorOverlay.type === 'additive' ? 'ps1_additive' : 'ps1_subtractive',
      intensity
    })
  });

  return <primitive object={effect} dispose={null} />
}

export default ColorOverlay;
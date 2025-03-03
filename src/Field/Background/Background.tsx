import { MutableRefObject } from "react";
import { FieldData } from "../Field";
import useLayeredTiles from "./useLayeredTiles";
import Layer from "./Layer/Layer";

type BackgroundProps = {
  backgroundPanRef: MutableRefObject<CameraPanAngle>;
  data: FieldData;
};

const Background = ({ backgroundPanRef, data }: BackgroundProps) => {
  const { backgroundDetails, limits, tiles } = data;

  const width = Math.abs(limits.cameraRange.left) + Math.abs(limits.cameraRange.right);
  const height = Math.abs(limits.cameraRange.top) + Math.abs(limits.cameraRange.bottom);

  const layers = useLayeredTiles(tiles, backgroundDetails.sprite, width, height);

  return layers.map((layer) => <Layer key={layer.id} layer={layer} backgroundPanRef={backgroundPanRef} />);
}

export default Background;
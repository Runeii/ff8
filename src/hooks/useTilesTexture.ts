import { useLoader } from "@react-three/fiber";
import { ClampToEdgeWrapping, NearestFilter, RGBAFormat, TextureLoader } from "three";
import { FieldData } from "../Field/Field";

const useTilesTexture = (backgroundDetails: FieldData['backgroundDetails']) => {
  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${backgroundDetails.sprite}`);
  tilesTexture.format = RGBAFormat;
  tilesTexture.generateMipmaps = false;
  tilesTexture.wrapS = ClampToEdgeWrapping;
  tilesTexture.wrapT = ClampToEdgeWrapping;
  tilesTexture.magFilter = NearestFilter;
  tilesTexture.minFilter = NearestFilter;

  return tilesTexture;
}

export default useTilesTexture;
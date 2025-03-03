import { useLoader } from "@react-three/fiber";
import { ClampToEdgeWrapping, NearestFilter, RGBAFormat, TextureLoader } from "three";
import { useMemo } from "react";

const useTilesTexture = (filename: string) => {
  const tilesTexture = useLoader(TextureLoader, `/output/sprites/${filename}`);

  return useMemo(() => {
    tilesTexture.format = RGBAFormat;
    tilesTexture.generateMipmaps = false;
    tilesTexture.wrapS = ClampToEdgeWrapping;
    tilesTexture.wrapT = ClampToEdgeWrapping;
    tilesTexture.magFilter = NearestFilter;
    tilesTexture.minFilter = NearestFilter;

    return tilesTexture;
  }, [tilesTexture]);
}

export default useTilesTexture;
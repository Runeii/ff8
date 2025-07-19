import { useGLTF } from "@react-three/drei";
import gltfIndex from './gltf_index.json';

const typedGltfIndex: GLTFIndex = gltfIndex as GLTFIndex;
type GLTFIndex = {
  [fieldName: string]: {
    [baseGltf: string]: string;
  };
}
export const useFragmentedGLTFLoader = (baseGltf: string, fieldName: string) => {
  const gltfFilename = typedGltfIndex[fieldName]?.[baseGltf];
  const [baseName, hashedName] = gltfFilename.split('_')

  const result = useGLTF(`/models/optimized/${baseName}/${hashedName}`);

  if (!gltfFilename) {
    console.warn(`GLTF file not found for baseGltf: ${baseGltf} in field: ${fieldName}`);
    return null;
  }
  return result;
}

useFragmentedGLTFLoader.preload = () => null

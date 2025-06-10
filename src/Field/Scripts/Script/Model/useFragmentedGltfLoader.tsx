import { useGLTF } from "@react-three/drei";

export const useFragmentedGLTFLoader = (baseGltf: string, fieldName: string) => {
  const result = useGLTF(`/models/complete/${fieldName}/${baseGltf}.gltf`);
  return result;
}

useFragmentedGLTFLoader.preload = () => null
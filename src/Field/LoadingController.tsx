import { useEffect } from "react";
import useGlobalStore from "../store";

const LoadingController = () => {
  useEffect(() => {
    useGlobalStore.setState({ isLoading: true });
    return () => {
      useGlobalStore.setState({ isLoading: false });
    };
  }, []);

  return null;
}

export default LoadingController;
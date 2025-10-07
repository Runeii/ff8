import styles from './Loading.module.css';
import useGlobalStore from "../store";

const Loading = () => {
  const isLoading = useGlobalStore(state => state.isLoading);

  if (!isLoading) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
    </div>
  );
}

export default Loading;
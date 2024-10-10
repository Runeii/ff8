import { CSSProperties } from 'react';
import styles from './Text.module.css';

type TextProps = {
  text: string;
  x: number;
  y: number;
};

const Text = ({ text, x, y }: TextProps) => {
  return (
    <div className={styles.text} style={{'--x': x, '--y': y} as CSSProperties}>
      {text}
    </div>
  );
}

export default Text;
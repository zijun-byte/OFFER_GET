import type { CSSProperties, ElementType, ReactNode } from 'react';
import styles from './StarBorder.module.css';

type StarBorderProps = {
  as?: ElementType;
  className?: string;
  color?: string;
  speed?: string;
  thickness?: number;
  children: ReactNode;
  style?: CSSProperties;
};

export default function StarBorder({
  as: Component = 'button',
  className = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  children,
  style,
  ...rest
}: StarBorderProps) {
  return (
    <Component
      className={`${styles.container} ${className}`}
      style={
        {
          '--star-border-color': color,
          '--star-border-speed': speed,
          '--star-border-thickness': `${thickness}px`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      <div className={styles.gradientBottom} />
      <div className={styles.gradientTop} />
      <div className={styles.innerContent}>{children}</div>
    </Component>
  );
}

import { getLayeredGradientBackground } from './utils';

type GradientBackgroundProps = {
  children?: React.ReactNode;
};

const BACKGROUND_GRADIENT = getLayeredGradientBackground([
  [
    [
      {
        color: 'transparent',
        opacityPercentage: 0,
        stopPosition: 0,
      },
      {
        color: '#C8C8F1',
        opacityPercentage: 20,
        stopPosition: 100,
      },
    ],
    296.82,
  ],
  [
    [
      {
        color: '#E3BFFE',
        opacityPercentage: 20,
        stopPosition: 0,
      },
      {
        color: 'transparent',
        opacityPercentage: 0,
        stopPosition: 100,
      },
    ],
    360,
  ],
  [
    [
      {
        color: '#FFE0B2',
        opacityPercentage: 20,
        stopPosition: 0,
      },
      {
        color: 'transparent',
        opacityPercentage: 0,
        stopPosition: 100,
      },
    ],
    296.82,
  ],
]);

export function GradientBackground({ children }: GradientBackgroundProps) {
  return <div style={{ background: BACKGROUND_GRADIENT }}>{children}</div>;
}

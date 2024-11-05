/**
 * Add opacity to a hex color.
 *
 * @param color - The hex color to add opacity to.
 * @param opacityPercentage - The opacity percentage to add.
 * @returns A string representing the hex color with the opacity added.
 */
export const getColorWithOpacity = (color: string, opacityPercentage: number) => {
  if (color.startsWith('#')) {
    let hexOpacity = '';

    if (opacityPercentage < 100) {
      // Convert the opacityPercentage value to a hex value
      const alphaValue = Math.round((opacityPercentage / 100) * 255);
      hexOpacity = alphaValue.toString(16).padStart(2, '0');
    }

    return `${color}${hexOpacity}`.toUpperCase();
  }
  return color;
};

export type GetGradientBackgroundColor = {
  color: string;
  opacityPercentage?: number;
  stopPosition?: number;
};

/**
 * Get a gradient background color for a given list of colors.
 *
 * @param colors - The list of colors to use in the gradient.
 * @param angle - The angle of the gradient in degrees.
 * @returns A string representing the gradient background color.
 */
export const getGradientBackground = (colors: GetGradientBackgroundColor[], angle: number) => {
  if (colors.length === 0) {
    return 'transparent';
  }
  return (
    `${colors.reduce((acc, { color, opacityPercentage = 100, stopPosition }) => {
      const colorWithOpacity = getColorWithOpacity(color, opacityPercentage);
      return `${acc}, ${colorWithOpacity}${stopPosition !== undefined ? ` ${stopPosition}%` : ''}`;
    }, `linear-gradient(${angle}deg`)  })`
  );
};

export type GetLayeredGradientBackgroundConfiguration = Parameters<typeof getGradientBackground>[];

/**
 * Get a layered gradient background color for a given list of linear gradient configurations.
 *
 * @param linearGradientConfigurations - The list of linear gradients to combine.
 * @returns A string representing the layered linear gradients.
 */
export const getLayeredGradientBackground = (
  linearGradientConfigurations: Parameters<typeof getGradientBackground>[]
) => {
  if (linearGradientConfigurations.length === 0) {
    return 'transparent';
  }

  return linearGradientConfigurations.reduce((acc, [colors, angle], index, { length }) => {
    return acc + getGradientBackground(colors, angle) + (index === length - 1 ? '' : ', ');
  }, '');
};

// Shared paper-size math for invoice preview, print, PDF and image export.
// Keeping this in one place guarantees the settings preview and the actual
// print/PDF output always agree on physical dimensions.

const MM_PER_INCH = 25.4;

// Only 'custom' width/height can make a page landscape independent of its
// paperSize keyword - A4_LANDSCAPE/A5_LANDSCAPE already encode orientation.
export const isLandscapePaper = (
  paperSize?: string,
  customWidth?: number,
  customHeight?: number
): boolean => {
  if (paperSize === 'A4_LANDSCAPE' || paperSize === 'A5_LANDSCAPE') return true;
  if (paperSize === 'custom' && customWidth && customHeight) return customWidth > customHeight;
  return false;
};

export const getPaperDimensions = (
  paperSize: string = 'A4',
  isLandscape: boolean = false,
  customWidth?: number,
  customHeight?: number,
  unit?: string
): { width: number; height: number } => {
  switch (paperSize) {
    case 'A5':
      return isLandscape ? { width: 210, height: 148 } : { width: 148, height: 210 };
    case 'A5_LANDSCAPE':
      return { width: 210, height: 148 };
    case 'A4_LANDSCAPE':
      return { width: 297, height: 210 };
    case 'Thermal80':
      return { width: 80, height: 297 };
    case 'Thermal58':
      return { width: 58, height: 297 };
    case '4x3':
      return { width: 101.6, height: 76.2 };
    case '4x6':
      return { width: 101.6, height: 152.4 };
    case 'custom': {
      const factor = unit === 'mm' ? 1 : MM_PER_INCH;
      return { width: (customWidth || 4) * factor, height: (customHeight || 3) * factor };
    }
    case 'A4':
    default:
      return isLandscape ? { width: 297, height: 210 } : { width: 210, height: 297 };
  }
};

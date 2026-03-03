export interface LayoutOption {
  id: string;
  name: string;
  positions: Array<{ x: number; y: number; width: number; height: number }>;
}

const PAGE_WIDTH = 831;
const PAGE_HEIGHT = 1141;

// Calcular el grosor del borde basado en la cantidad de fotos
const getBorderWidth = (count: number): number => {
  if (count > 20) {
    return 18.9; // ~0.5cm para más de 20 fotos
  }
  return 37.8; // ~1cm para 20 o menos fotos
};

// Layouts predefinidos para cada cantidad
export const getLayoutsForCount = (count: number, borderWidth?: number): LayoutOption[] => {
  const BORDER_WIDTH = borderWidth !== undefined ? borderWidth : getBorderWidth(count);
  const layouts: LayoutOption[] = [];
  
  switch(count) {
    case 1:
      layouts.push({
        id: '1-full',
        name: 'Completa',
        positions: [{ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }]
      });
      break;
      
    case 2:
      layouts.push({
        id: '2-horizontal',
        name: 'Horizontal',
        positions: [
          { x: 0, y: 0, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      layouts.push({
        id: '2-vertical',
        name: 'Vertical',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: PAGE_HEIGHT },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: PAGE_HEIGHT }
        ]
      });
      break;
      
    case 3:
      layouts.push({
        id: '3-top2',
        name: '2 arriba + 1',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      layouts.push({
        id: '3-bottom2',
        name: '1 + 2 abajo',
        positions: [
          { x: 0, y: 0, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      layouts.push({
        id: '3-horizontal',
        name: '3 Filas',
        positions: [
          { x: 0, y: 0, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 }
        ]
      });
      break;
      
    case 4:
      layouts.push({
        id: '4-grid',
        name: 'Cuadrícula',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      layouts.push({
        id: '4-top3',
        name: '3 arriba + 1',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: PAGE_WIDTH, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      break;
      
    case 6:
      layouts.push({
        id: '6-grid',
        name: 'Cuadrícula 3x2',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      layouts.push({
        id: '6-grid-alt',
        name: 'Cuadrícula 2x3',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 }
        ]
      });
      break;
      
    case 8:
      layouts.push({
        id: '8-grid',
        name: 'Cuadrícula 4x2',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, y: (PAGE_HEIGHT - BORDER_WIDTH) / 2 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH) / 2 }
        ]
      });
      layouts.push({
        id: '8-grid-alt',
        name: 'Cuadrícula 2x4',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH) / 2 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, width: (PAGE_WIDTH - BORDER_WIDTH) / 2, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 }
        ]
      });
      break;
      
    case 9:
      layouts.push({
        id: '9-grid',
        name: 'Cuadrícula 3x3',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 }
        ]
      });
      break;
      
    case 12:
      layouts.push({
        id: '12-grid',
        name: 'Cuadrícula 4x3',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, y: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, y: ((PAGE_HEIGHT - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 3) / 4, height: (PAGE_HEIGHT - BORDER_WIDTH * 2) / 3 }
        ]
      });
      layouts.push({
        id: '12-grid-alt',
        name: 'Cuadrícula 3x4',
        positions: [
          { x: 0, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: 0, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: 0, y: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 + BORDER_WIDTH, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 2 + BORDER_WIDTH * 2, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: 0, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3 + BORDER_WIDTH, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 },
          { x: ((PAGE_WIDTH - BORDER_WIDTH * 2) / 3) * 2 + BORDER_WIDTH * 2, y: ((PAGE_HEIGHT - BORDER_WIDTH * 3) / 4) * 3 + BORDER_WIDTH * 3, width: (PAGE_WIDTH - BORDER_WIDTH * 2) / 3, height: (PAGE_HEIGHT - BORDER_WIDTH * 3) / 4 }
        ]
      });
      break;
      
    default:
      // Cuadrícula automática para otros números
      const padding = 20;
      const spacing = BORDER_WIDTH;
      let cols = Math.ceil(Math.sqrt(count));
      let rows = Math.ceil(count / cols);
      const availableWidth = PAGE_WIDTH - (padding * 2);
      const availableHeight = PAGE_HEIGHT - (padding * 2);
      const totalSpacingX = (cols - 1) * spacing;
      const totalSpacingY = (rows - 1) * spacing;
      const photoWidth = (availableWidth - totalSpacingX) / cols;
      const photoHeight = (availableHeight - totalSpacingY) / rows;
      
      const positions = [];
      let index = 0;
      for (let row = 0; row < rows && index < count; row++) {
        for (let col = 0; col < cols && index < count; col++) {
          const x = padding + col * (photoWidth + spacing);
          const y = padding + row * (photoHeight + spacing);
          positions.push({
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(photoWidth),
            height: Math.round(photoHeight),
          });
          index++;
        }
      }
      
      layouts.push({
        id: `${count}-auto`,
        name: 'Auto',
        positions
      });
  }
  
  return layouts;
};

// Obtener un layout específico por ID
export const getLayoutById = (layoutId: string, count: number, borderWidth?: number): LayoutOption | null => {
  const layouts = getLayoutsForCount(count, borderWidth);
  return layouts.find(l => l.id === layoutId) || layouts[0] || null;
};

// Exportar la función para obtener el ancho del borde
export { getBorderWidth };

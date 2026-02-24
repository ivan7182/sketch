const canvasSketch = require('canvas-sketch');
const { Pane } = require('tweakpane');

const settings = {
  dimensions: [1080, 1080],
  animate: true
};

const params = {
  cols: 6,
  rows: 6,
  gap: 0.03,
  lineWidth: 0.004,
  shapeScale: 0.3,
  pulseSpeed: 1,
  colorSpeed: 60,
  glowStrength: 40,
  rotationSpeed: 2,
  depthAmount: 0.4,
  alternateRotation: true,
  interactive: true,
  bgColor: '#050510',
  polygonSides: 3
};

let activeCells = {};

const sketch = ({ context, width, height, canvas }) => {
  const pane = new Pane();
  pane.addInput(params, 'cols', { min: 2, max: 15, step: 1 });
  pane.addInput(params, 'rows', { min: 2, max: 15, step: 1 });
  pane.addInput(params, 'gap', { min: 0.01, max: 0.1 });
  pane.addInput(params, 'lineWidth', { min: 0.002, max: 0.02 });
  pane.addInput(params, 'shapeScale', { min: 0.1, max: 0.5 });
  pane.addInput(params, 'pulseSpeed', { min: 0.1, max: 5 });
  pane.addInput(params, 'colorSpeed', { min: 10, max: 200 });
  pane.addInput(params, 'glowStrength', { min: 0, max: 100 });
  pane.addInput(params, 'rotationSpeed', { min: 0, max: 10 });
  pane.addInput(params, 'depthAmount', { min: 0, max: 1 });
  pane.addInput(params, 'alternateRotation');
  pane.addInput(params, 'interactive');
  pane.addInput(params, 'bgColor');
  pane.addInput(params, 'polygonSides', { min: 3, max: 8, step: 1 });
  pane.addButton({ title: 'Reset Active Cells' }).on('click', () => {
    activeCells = {};
  });

  const getGridDimensions = () => {
    const cols = params.cols;
    const rows = params.rows;
    const gap = width * params.gap;
    const w = width / (cols + 2);
    const h = w;
    const totalW = cols * w + (cols - 1) * gap;
    const totalH = rows * h + (rows - 1) * gap;
    const startX = (width - totalW) / 2;
    const startY = (height - totalH) / 2;
    return { w, h, gap, startX, startY, cols, rows };
  };

  canvas.addEventListener('mousedown', (e) => {
    if (!params.interactive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const { w, h, gap, startX, startY, cols, rows } = getGridDimensions();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = startX + i * (w + gap);
        const y = startY + j * (h + gap);
        if (mx > x && mx < x + w && my > y && my < y + h) {
          const key = `${i}-${j}`;
          activeCells[key] = !activeCells[key];
        }
      }
    }
  });

  const drawPolygon = (ctx, sides, radius) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };

  return ({ time }) => {
    context.fillStyle = params.bgColor;
    context.fillRect(0, 0, width, height);

    const { w, h, gap, startX, startY, cols, rows } = getGridDimensions();

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = startX + i * (w + gap);
        const y = startY + j * (h + gap);
        const offset = (i + j) * 0.5;

        const key = `${i}-${j}`;
        const isActive = activeCells[key];

        // scale pulsasi hanya kalau sel TIDAK aktif
        const depth = isActive ? 0 : Math.sin(time * params.pulseSpeed + offset);
        const scale = 1 + depth * params.depthAmount;

        const hue = (time * params.colorSpeed + i * 25 + j * 25) % 360;
        const saturation = 80 + 20 * Math.sin(time + offset);
        const lightness = 50 + 10 * Math.sin(time * 2 + offset);
        const neonColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        context.save();
        context.translate(x + w / 2, y + h / 2);

        const direction = params.alternateRotation ? ((i + j) % 2 === 0 ? 1 : -1) : 1;
        if (!params.interactive || isActive) {
          context.rotate(time * params.rotationSpeed * direction);
        }

        context.scale(scale, scale);
        context.lineWidth = width * params.lineWidth * scale;
        context.strokeStyle = neonColor;
        context.shadowBlur = params.glowStrength * scale;
        context.shadowColor = neonColor;

        // rectangle
        context.beginPath();
        context.rect(-w / 2, -h / 2, w, h);
        context.stroke();

        // circle
        const radius = w * params.shapeScale * Math.abs(Math.sin(time * params.pulseSpeed + offset));
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();

        // polygon hanya sel aktif
        if (isActive) {
          drawPolygon(context, params.polygonSides, radius);
        }

        context.restore();
      }
    }
  };
};

canvasSketch(sketch, settings);
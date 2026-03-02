const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random');
const { Pane } = require('tweakpane');

random.setSeed(random.getRandomSeed());

const settings = {
  dimensions: [1080, 1080],
  animate: true
};

const params = {
  text: 'PSYTRANCE',
  rings: 120,
  speed: 0.6,
  waveAmp: 15,
  rotation: 0.3,
  fontSize: 20,
  trail: 0.08,
  glow: 12,
  zoom: 1,
  accentHue: 0 // 0 = putih, 200 = biru dingin, 180 = cyan
};

const pane = new Pane();
pane.addInput(params, 'text');
pane.addInput(params, 'rings', { min: 40, max: 300 });
pane.addInput(params, 'speed', { min: 0.1, max: 2 });
pane.addInput(params, 'waveAmp', { min: 0, max: 40 });
pane.addInput(params, 'rotation', { min: 0, max: 2 });
pane.addInput(params, 'fontSize', { min: 12, max: 50 });
pane.addInput(params, 'trail', { min: 0.01, max: 0.3 });
pane.addInput(params, 'glow', { min: 0, max: 30 });
pane.addInput(params, 'zoom', { min: 0.8, max: 1.5 });
pane.addInput(params, 'accentHue', { min: 0, max: 360 });

const sketch = () => {
  return ({ context, width, height, time }) => {

    const cx = width * 0.5;
    const cy = height * 0.5;

    // Deep black background
    context.fillStyle = `rgba(0,0,0,${params.trail})`;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'lighter';

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${params.fontSize}px monospace`;

    context.save();
    context.translate(cx, cy);
    context.scale(params.zoom, params.zoom);
    context.translate(-cx, -cy);

    for (let i = 0; i < params.rings; i++) {

      const progress = i / params.rings;

      const spiral = progress * 10; // lebih rapat & clean
      const angle = spiral + time * params.speed;

      const wave =
        Math.sin(progress * 8 + time * 2) * params.waveAmp;

      const radius = progress * width * 0.42 + wave;

      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      // subtle brightness variation
      const light = 60 + Math.sin(time * 2 + progress * 10) * 15;

      context.save();
      context.translate(x, y);
      context.rotate(angle + time * params.rotation);

      context.fillStyle = `hsl(${params.accentHue}, 20%, ${light}%)`;
      context.shadowColor = `hsl(${params.accentHue}, 40%, 70%)`;
      context.shadowBlur = params.glow;

      const char = params.text[i % params.text.length];
      context.fillText(char, 0, 0);

      context.restore();
    }

    context.restore();
    context.globalCompositeOperation = 'source-over';
  };
};

canvasSketch(sketch, settings);
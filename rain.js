const canvasSketch = require('canvas-sketch');
const { Pane } = require('tweakpane');

const settings = {
  dimensions: [800, 600], // ukuran canvas tetap sesuai kode awalmu
  animate: true
};

let video;
let offCanvas;
let offCtx;

let cols, rows;
let rainDrops = [];

const asciiChars = " .:-=+*#%@";

const params = {
  fontSize: 10,        // font size ASCII gelap
  rainFontSize: 14,    // font size hujan
  asciiColor: "#ffffff",
  rainColor: "#00ff88",
  threshold: 120,
  rainDensity: 2,
  rainChars: "01",
  rainSpeed: 1,
  rainShadowBlur: 3    // nilai default shadow hujan
};

const sketch = ({ context, width, height }) => {

  // ==== WEBCAM ====
  video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error(err));

  // ==== OFFSCREEN ====
  offCanvas = document.createElement('canvas');
  offCtx = offCanvas.getContext('2d');

  // ==== Tweakpane ====
  const pane = new Pane();
  const folder = pane.addFolder({ title: 'ASCII & Rain Settings' });
  folder.addInput(params, 'fontSize', { min: 5, max: 30, step: 1 });
  folder.addInput(params, 'rainFontSize', { min: 5, max: 40, step: 1 });
  folder.addInput(params, 'asciiColor');
  folder.addInput(params, 'rainColor');
  folder.addInput(params, 'threshold', { min: 50, max: 200, step: 1 });
  folder.addInput(params, 'rainDensity', { min: 0.1, max: 5, step: 0.1 });
  folder.addInput(params, 'rainChars');
  folder.addInput(params, 'rainSpeed', { min: 0.1, max: 10, step: 0.1 });
  folder.addInput(params, 'rainShadowBlur', { min: 0, max: 10, step: 1 }); // slider untuk tipis/tebal bayangan

  function resetColsRows() {
    cols = Math.floor(width / params.fontSize);
    rows = Math.floor(height / params.fontSize);
    offCanvas.width = cols;
    offCanvas.height = rows;

    // Rain drops array
    rainDrops = [];
    const count = Math.floor(cols * params.rainDensity);
    for (let i = 0; i < count; i++) {
      rainDrops.push({
        x: Math.floor(Math.random() * cols),
        y: Math.random() * rows,
        speed: 1 + Math.random() * 2
      });
    }
  }

  resetColsRows();

  folder.on('change', e => {
    if (e.presetKey === 'fontSize' || e.presetKey === 'rainDensity') {
      resetColsRows();
    }
  });

  return ({ context, width, height }) => {

    context.fillStyle = "rgba(0,0,0,0.2)";
    context.fillRect(0, 0, width, height);

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      offCtx.drawImage(video, 0, 0, cols, rows);
    }

    const frame = offCtx.getImageData(0, 0, cols, rows).data;

    // ==== ASCII area gelap ====
    context.font = `${params.fontSize}px monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = (y * cols + x) * 4;
        const r = frame[index];
        const g = frame[index + 1];
        const b = frame[index + 2];

        const brightness = (r + g + b) / 3;

        if (brightness < params.threshold) {
          const charIndex = Math.floor((brightness / 255) * asciiChars.length);
          const char = asciiChars[charIndex];
          context.fillStyle = params.asciiColor;
          context.fillText(char, x * params.fontSize + params.fontSize / 2, y * params.fontSize + params.fontSize / 2);
        }
      }
    }

    // ==== Rain area terang ====
    context.shadowColor = params.rainColor;
    context.shadowBlur = params.rainShadowBlur; // <-- bayangan hujan diatur sesuai slider

    rainDrops.forEach(drop => {
      const x = drop.x;
      const y = Math.floor(drop.y);

      if (y < rows) {
        const index = (y * cols + x) * 4;
        const r = frame[index];
        const g = frame[index + 1];
        const b = frame[index + 2];

        const brightness = (r + g + b) / 3;

        if (brightness > params.threshold + 30) {
          const char = params.rainChars[Math.floor(Math.random() * params.rainChars.length)];
          const alpha = (brightness - (params.threshold + 30)) / (255 - (params.threshold + 30));
          context.fillStyle = `${params.rainColor}${Math.floor(alpha*255).toString(16).padStart(2,'0')}`;

          // gunakan font size khusus hujan
          context.font = `${params.rainFontSize}px monospace`;
          context.fillText(char, x * params.fontSize + params.fontSize / 2, y * params.fontSize + params.fontSize / 2);
        }
      }

      // update posisi hujan sesuai speed
      drop.y += drop.speed * params.rainSpeed;
      if (drop.y > rows) {
        drop.y = 0;
        drop.x = Math.floor(Math.random() * cols);
      }
    });

    context.shadowBlur = 0;
  };
};

canvasSketch(sketch, settings);
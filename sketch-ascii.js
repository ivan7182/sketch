const canvasSketch = require('canvas-sketch');

const settings = {
  dimensions: [1080, 1080],
  animate: true
};

let video;

const cell = 15;
const threshold = 70; // atur sesuai kebutuhan

const sketch = ({ width, height }) => {

  const cols = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  const numCells = cols * rows;

  const typeCanvas = document.createElement('canvas');
  const typeContext = typeCanvas.getContext('2d');

  typeCanvas.width = cols;
  typeCanvas.height = rows;

  return ({ context }) => {

    if (!video) return;

    // 🔥 CLEAR CANVAS (bukan hitam)
    context.clearRect(0, 0, width, height);

    // gambar webcam ke canvas kecil
    typeContext.drawImage(video, 0, 0, cols, rows);
    const imageData = typeContext.getImageData(0, 0, cols, rows).data;

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${cell * 1.4}px monospace`;

    for (let i = 0; i < numCells; i++) {

      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = col * cell;
      const y = row * cell;

      const r = imageData[i * 4 + 0];
      const g = imageData[i * 4 + 1];
      const b = imageData[i * 4 + 2];

      const brightness = (r + g + b) / 5;

      // 🔥 hanya gambar yang terang
      if (brightness < threshold) {

        const glyph = getGlyph(brightness);

        context.fillStyle = `black`;
        context.save();
        context.translate(x + cell / 2, y + cell / 2);
        context.fillText(glyph, 0, 0);
        context.restore();
      }
    }
  };
};

const getGlyph = (v) => {
  const glyphs = "アイウエオカキクケコサシスセソ0123456789".split('');
  const index = Math.floor((v / 255) * (glyphs.length - 1));
  return glyphs[index];
};

// setup webcam
const setupWebcam = async () => {
  video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  });

  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
};

const start = async () => {
  await setupWebcam();
  await canvasSketch(sketch, settings);
};

start();
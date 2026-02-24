const canvasSketch = require('canvas-sketch');
const { Pane } = require('tweakpane');

const settings = {
  dimensions: [1080, 1080],
  animate: true
};

let video;
let pane;
let mediaRecorder;
let recordedChunks = [];
let canvasElement;

const params = {
  threshold: 70,
  ascii: "@#$%&?アイウエオカキクケコ",
  asciiColor: "#ffffff",
  noiseIntensity: 30,
  glitchChance: 0.1,
  fps: 60,
  resolution: "1080p"
};

const cell = 15;

const sketch = ({ canvas, width, height }) => {

  canvasElement = canvas;

  // 🎛 UI
  pane = new Pane();
  const folder = pane.addFolder({ title: 'ASCII Settings' });

  folder.addInput(params, 'threshold', { min: 0, max: 255 });
  folder.addInput(params, 'ascii');
  folder.addInput(params, 'asciiColor');
  folder.addInput(params, 'noiseIntensity', { min: 0, max: 100 });
  folder.addInput(params, 'glitchChance', { min: 0, max: 1, step: 0.01 });

  folder.addInput(params, 'fps', {
    options: { "30 FPS": 30, "60 FPS": 60 }
  });

  folder.addInput(params, 'resolution', {
    options: {
      "1080p": "1080p",
      "4K": "4K"
    }
  });

  folder.addButton({ title: '🎥 Record' }).on('click', startRecording);
  folder.addButton({ title: '⏹ Stop' }).on('click', stopRecording);

  const cols = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  const numCells = cols * rows;

  const typeCanvas = document.createElement('canvas');
  const typeContext = typeCanvas.getContext('2d');

  typeCanvas.width = cols;
  typeCanvas.height = rows;

  return ({ context }) => {

    if (!video) return;

    drawHorrorBackground(context, width, height);

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

      const brightness = (r + g + b) / 3;

      if (brightness < params.threshold) {
        const glyph = getGlyph(brightness);
        context.fillStyle = params.asciiColor;
        context.fillText(glyph, x + cell / 2, y + cell / 2);
      }
    }
  };
};

function drawHorrorBackground(ctx, width, height) {

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  const imageData = ctx.createImageData(width, height);
  const buffer = imageData.data;

  for (let i = 0; i < buffer.length; i += 4) {
    const noise = Math.random() * params.noiseIntensity;
    buffer[i] = noise;
    buffer[i + 1] = noise;
    buffer[i + 2] = noise;
    buffer[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  if (Math.random() > 0.9) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (Math.random() < params.glitchChance) {
    const glitchY = Math.random() * height;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(0, glitchY, width, 8);
  }

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
}

const getGlyph = (v) => {
  const glyphs = params.ascii.split('');
  const index = Math.floor((v / 255) * (glyphs.length - 1));
  return glyphs[index];
};

// 🎥 RECORDING
function startRecording() {

  if (!canvasElement) return;

  // 🔥 Resize resolution
  if (params.resolution === "4K") {
    canvasElement.width = 3840;
    canvasElement.height = 2160;
  } else {
    canvasElement.width = 1080;
    canvasElement.height = 1080;
  }

  const stream = canvasElement.captureStream(params.fps);

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  recordedChunks = [];

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ascii-horror-${params.resolution}-${params.fps}fps.webm`;
    a.click();
  };

  mediaRecorder.start();
  console.log(`Recording ${params.resolution} ${params.fps}FPS`);
}

function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
}

// 🎥 WEBCAM
const setupWebcam = async () => {
  video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => resolve(video);
  });
};

const start = async () => {
  await setupWebcam();
  await canvasSketch(sketch, settings);
};

start();
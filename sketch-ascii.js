const canvasSketch = require('canvas-sketch');
const { Pane } = require('tweakpane');

const settings = {
  dimensions: [1080, 1080],
  animate: true
};

let video;
let previousFrame = null;
let trackedBlobs = [];

const asciiChars = " .:カキク@!ケコ";
const asciiScale = 10;

const params = {
  motionThreshold: 60,
  minBlobSize: 800,

  asciiColor: "#00ff88",
  asciiOpacity: 1
};

const sketch = ({ width, height }) => {

  const pane = new Pane();

  pane.addInput(params, 'motionThreshold', { min: 0, max: 200 });
  pane.addInput(params, 'minBlobSize', { min: 100, max: 5000 });

  const asciiFolder = pane.addFolder({ title: "ASCII Settings" });

  asciiFolder.addInput(params, 'asciiColor');
  asciiFolder.addInput(params, 'asciiOpacity', { min: 0, max: 1 });

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');

  return ({ context }) => {

    if (!video) return;

    offCtx.drawImage(video, 0, 0, width, height);
    const frame = offCtx.getImageData(0, 0, width, height);
    const data = frame.data;

    if (!previousFrame) {
      previousFrame = new Uint8ClampedArray(data);
    }

    // =============================
    // MOTION DETECTION
    // =============================
    const motionPixels = [];

    for (let i = 0; i < data.length; i += 4) {

      const motion =
        Math.abs(data[i] - previousFrame[i]) +
        Math.abs(data[i + 1] - previousFrame[i + 1]) +
        Math.abs(data[i + 2] - previousFrame[i + 2]);

      if (motion > params.motionThreshold) {

        const index = i / 4;

        motionPixels.push({
          x: index % width,
          y: Math.floor(index / width)
        });

      }

    }

    previousFrame = new Uint8ClampedArray(data);

    // =============================
    // BLOB GROUPING
    // =============================
    const blobs = [];

    motionPixels.forEach(p => {

      let added = false;

      for (let blob of blobs) {

        if (
          p.x >= blob.minX - 5 &&
          p.x <= blob.maxX + 5 &&
          p.y >= blob.minY - 5 &&
          p.y <= blob.maxY + 5
        ) {

          blob.minX = Math.min(blob.minX, p.x);
          blob.maxX = Math.max(blob.maxX, p.x);
          blob.minY = Math.min(blob.minY, p.y);
          blob.maxY = Math.max(blob.maxY, p.y);
          blob.size++;

          added = true;
          break;

        }

      }

      if (!added) {

        blobs.push({
          minX: p.x,
          maxX: p.x,
          minY: p.y,
          maxY: p.y,
          size: 1
        });

      }

    });

    trackedBlobs = blobs.filter(b => b.size > params.minBlobSize);

    // =============================
    // ASCII BACKGROUND
    // =============================
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);

    context.globalAlpha = params.asciiOpacity;
    context.fillStyle = params.asciiColor;
    context.font = `${asciiScale}px monospace`;

    for (let y = 0; y < height; y += asciiScale) {

      for (let x = 0; x < width; x += asciiScale) {

        let insideBlob = false;

        for (let blob of trackedBlobs) {

          if (
            x > blob.minX &&
            x < blob.maxX &&
            y > blob.minY &&
            y < blob.maxY
          ) {
            insideBlob = true;
            break;
          }

        }

        if (insideBlob) continue;

        const i = (y * width + x) * 4;

        const brightness =
          (data[i] + data[i + 1] + data[i + 2]) / 3;

        const charIndex = Math.floor(
          brightness / 255 * (asciiChars.length - 1)
        );

        const char = asciiChars[charIndex];

        context.fillText(char, x, y);

      }

    }

    context.globalAlpha = 1;

    // =============================
    // THERMAL BLOBS
    // =============================
    trackedBlobs.forEach(blob => {

      const w = blob.maxX - blob.minX;
      const h = blob.maxY - blob.minY;

      if (w <= 0 || h <= 0) return;

      const imageData = offCtx.getImageData(blob.minX, blob.minY, w, h);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {

        const brightness =
          (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

        let tr = 0;
        let tg = 0;
        let tb = 0;

        if (brightness < 85) {
          tb = brightness * 3;
        } else if (brightness < 170) {
          tr = (brightness - 85) * 3;
          tb = 255 - (brightness - 85) * 3;
        } else {
          tr = 255;
          tg = (brightness - 170) * 3;
        }

        pixels[i] = tr;
        pixels[i + 1] = tg;
        pixels[i + 2] = tb;

      }

      context.putImageData(imageData, blob.minX, blob.minY);

      context.strokeStyle = "#00ff88";
      context.lineWidth = 2;
      context.strokeRect(blob.minX, blob.minY, w, h);

    });

  };

};

const setupVideo = async () => {

  video = document.createElement('video');

  video.src = './video/kuda2.mp4';
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;

  return new Promise(resolve => {

    video.onloadeddata = () => {

      video.play();
      resolve(video);

    };

  });

};

const start = async () => {

  await setupVideo();
  await canvasSketch(sketch, settings);

};

start();
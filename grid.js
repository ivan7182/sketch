const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random');
const { Pane } = require('tweakpane');

const settings = {
  dimensions: [576, 1024],
  animate: true,
  fps: 30,
  duration: 30
};

let video1, video2;
let blocks = [];

let params = {
  switchProbability: 0.05, // kecepatan random ganti video
  cols: 4,
  rows: 5
};

function loadVideo(url) {
  return new Promise((resolve) => {
    const vid = document.createElement('video');
    vid.src = url;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = true;
    vid.onloadeddata = () => {
      vid.play();
      resolve(vid);
    };
  });
}

class Block {
  constructor(x, y, w, h, cellW, cellH, offsetX, offsetY) {
    this.x = offsetX + x * cellW;
    this.y = offsetY + y * cellH;
    this.w = w * cellW;
    this.h = h * cellH;
    this.videoType = 1;
    this.alpha = 1;
  }

  update() {
    if (Math.random() < params.switchProbability) {
      this.videoType = this.videoType === 1 ? 2 : 1;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const vid = this.videoType === 1 ? video1 : video2;
    ctx.drawImage(vid, this.x, this.y, this.w, this.h, this.x, this.y, this.w, this.h);
    ctx.restore();
  }
}

const sketch = async ({ width, height }) => {
  video2 = await loadVideo('./ascii/bmth.mp4');
  video1 = await loadVideo('./ascii/oli.mp4');

  const pane = new Pane();
  pane.addInput(params, 'switchProbability', { min: 0, max: 1, step: 0.01, label: 'Random Speed' });
  pane.addInput(params, 'cols', { min: 1, max: 10, step: 1, label: 'Columns' }).on('change', rebuildGrid);
  pane.addInput(params, 'rows', { min: 1, max: 10, step: 1, label: 'Rows' }).on('change', rebuildGrid);

  const offsetX = 0;
  const offsetY = 0;

  let cellW = width / params.cols;
  let cellH = height / params.rows;

  function rebuildGrid() {
    cellW = width / params.cols;
    cellH = height / params.rows;
    blocks = [];

    for (let y = 0; y < params.rows; y++) {
      for (let x = 0; x < params.cols; x++) {
        const w = random.pick([1, 1, 2]);
        const h = random.pick([1, 1, 2]);
        const finalW = (x + w > params.cols) ? params.cols - x : w;
        const finalH = (y + h > params.rows) ? params.rows - y : h;
        blocks.push(new Block(x, y, finalW, finalH, cellW, cellH, offsetX, offsetY));
      }
    }
  }

  rebuildGrid(); // build grid awal

  return ({ context }) => {
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    if (video1.readyState >= 2 && video2.readyState >= 2) {
      blocks.forEach(block => {
        block.update();
        block.draw(context);
      });
    }

    // Grid lines
    context.strokeStyle = 'rgba(255,255,255,0.15)';
    context.lineWidth = 1;
    for (let i = 0; i <= params.cols; i++) {
      const x = offsetX + i * cellW;
      context.beginPath();
      context.moveTo(x, offsetY);
      context.lineTo(x, offsetY + height);
      context.stroke();
    }
    for (let i = 0; i <= params.rows; i++) {
      const y = offsetY + i * cellH;
      context.beginPath();
      context.moveTo(offsetX, y);
      context.lineTo(offsetX + width, y);
      context.stroke();
    }
  };
};

canvasSketch(sketch, settings);
const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random');
const math = require('canvas-sketch-util/math');
const eases = require('eases');

const settings = {
  dimensions: [1080, 1080],
  animate: true
};

const particles = [];
const cursor = { x: 9999, y: 9999 };

let imgA, imgB;
let elCanvas;



const lerp = (a, b, t) => a + (b - a) * t;

const createColorInterpolator = (r1, g1, b1, r2, g2, b2) => {
  return (t) => {
    const r = Math.round(lerp(r1, r2, t));
    const g = Math.round(lerp(g1, g2, t));
    const b = Math.round(lerp(b1, b2, t));
    return `rgb(${r}, ${g}, ${b})`;
  };
};


const sketch = ({ width, height, canvas }) => {
  elCanvas = canvas;

  const offA = document.createElement('canvas');
  const offB = document.createElement('canvas');

  offA.width = imgA.width;
  offA.height = imgA.height;
  offB.width = imgB.width;
  offB.height = imgB.height;

  const ctxA = offA.getContext('2d');
  const ctxB = offB.getContext('2d');

  ctxA.drawImage(imgA, 0, 0);
  ctxB.drawImage(imgB, 0, 0);

  const dataA = ctxA.getImageData(0, 0, imgA.width, imgA.height).data;
  const dataB = ctxB.getImageData(0, 0, imgB.width, imgB.height).data;

  const numCircles = 28;
  const gapCircle = 2;
  const gapDot = 2;
  let dotRadius = 12;
  let cirRadius = 0;
  const fitRadius = dotRadius;

  canvas.addEventListener('mousedown', onMouseDown);

  for (let i = 0; i < numCircles; i++) {

    const circumference = Math.PI * 2 * cirRadius;
    const numFit = i ? Math.floor(circumference / (fitRadius * 2 + gapDot)) : 1;
    const slice = Math.PI * 2 / numFit;

    for (let j = 0; j < numFit; j++) {

      const theta = slice * j;

      let x = Math.cos(theta) * cirRadius + width * 0.5;
      let y = Math.sin(theta) * cirRadius + height * 0.5;

      let ix = Math.floor((x / width) * imgA.width);
      let iy = Math.floor((y / height) * imgA.height);

      ix = math.clamp(ix, 0, imgA.width - 1);
      iy = math.clamp(iy, 0, imgA.height - 1);

      const idx = (iy * imgA.width + ix) * 4;

      const r1 = dataA[idx];
      const g1 = dataA[idx + 1];
      const b1 = dataA[idx + 2];

      const r2 = dataB[idx];
      const g2 = dataB[idx + 1];
      const b2 = dataB[idx + 2];

      const radius = math.mapRange(r1, 0, 255, 1, 12);

      const colMap = createColorInterpolator(r1, g1, b1, r2, g2, b2);

      particles.push(
        new Particle({
          x,
          y,
          radius,
          colMap
        })
      );
    }

    cirRadius += fitRadius * 2 + gapCircle;
    dotRadius = (1 - eases.quadOut(i / numCircles)) * fitRadius;
  }

  return ({ context, width, height }) => {
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    particles.forEach(p => {
      p.update();
      p.draw(context);
    });
  };
};


function onMouseDown(e) {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  onMouseMove(e);
}

function onMouseMove(e) {
  const rect = elCanvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * elCanvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * elCanvas.height;

  cursor.x = x;
  cursor.y = y;
}

function onMouseUp() {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  cursor.x = 9999;
  cursor.y = 9999;
}


function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function start() {
  imgA = await loadImage('./image/images-01.png');
  imgB = await loadImage('./image/images-02.png');
  canvasSketch(sketch, settings);
}

start();



class Particle {
  constructor({ x, y, radius, colMap }) {
    this.x = x;
    this.y = y;

    this.ix = x;
    this.iy = y;

    this.vx = 0;
    this.vy = 0;

    this.radius = radius;
    this.scale = 1;

    this.colMap = colMap;
    this.color = colMap(0);

    this.minDist = random.range(100, 180);
    this.pushFactor = random.range(0.01, 0.02);
    this.pullFactor = random.range(0.002, 0.005);
    this.dampFactor = random.range(0.90, 0.95);
  }

  update() {

    let dx = this.ix - this.x;
    let dy = this.iy - this.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    let ax = dx * this.pullFactor;
    let ay = dy * this.pullFactor;

    this.scale = math.mapRange(dist, 0, 200, 1, 4, true);
    this.color = this.colMap(math.mapRange(dist, 0, 200, 0, 1, true));

    dx = this.x - cursor.x;
    dy = this.y - cursor.y;
    dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

    if (dist < this.minDist) {
      const force = (this.minDist - dist) * this.pushFactor;
      ax += (dx / dist) * force;
      ay += (dy / dist) * force;
    }

    this.vx += ax;
    this.vy += ay;

    this.vx *= this.dampFactor;
    this.vy *= this.dampFactor;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);

    context.fillStyle = this.color;
    context.beginPath();
    context.arc(0, 0, this.radius * this.scale, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }
}

const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random');
const math = require('canvas-sketch-util/math');
const eases = require('eases');

const settings = {
  dimensions: [1080, 1080],
  animate: true,
  fps: 10,
  duration: 30
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

function drawStar(ctx, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(0, -outerRadius);

  for (let i = 0; i < spikes; i++) {
    let x = Math.cos(rot) * outerRadius;
    let y = Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = Math.cos(rot) * innerRadius;
    y = Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.closePath();
}

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

      const radius = math.mapRange(r1, 0, 255, 1, 10);
      const colMap = createColorInterpolator(r1, g1, b1, r2, g2, b2);

      particles.push(new Particle({ x, y, radius, colMap }));
    }

    cirRadius += fitRadius * 2 + gapCircle;
    dotRadius = (1 - eases.quadOut(i / numCircles)) * fitRadius;
  }

  return ({ context, width, height, time }) => {

    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    particles.forEach(p => {
      p.update(time);
      p.draw(context);
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 60) {
          const nearCursor =
            Math.hypot(particles[i].x - cursor.x, particles[i].y - cursor.y) < 150;

          context.globalAlpha = 1 - dist / 60;
          context.strokeStyle = nearCursor ? 'white' : particles[i].color;
          context.lineWidth = nearCursor ? 1.5 : 0.5;

          context.beginPath();
          context.moveTo(particles[i].x, particles[i].y);
          context.lineTo(particles[j].x, particles[j].y);
          context.stroke();
        }
      }
    }

    context.globalAlpha = 1;
  };
};

function onMouseDown(e) {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  onMouseMove(e);

  particles.forEach(p => {
    const angle = Math.random() * Math.PI * 2;
    const force = random.range(8, 20);
    p.vx += Math.cos(angle) * force;
    p.vy += Math.sin(angle) * force;
  });
}

function onMouseMove(e) {
  const rect = elCanvas.getBoundingClientRect();
  cursor.x = ((e.clientX - rect.left) / rect.width) * elCanvas.width;
  cursor.y = ((e.clientY - rect.top) / rect.height) * elCanvas.height;
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

    this.rotation = random.range(0, Math.PI * 2);
    this.spin = random.range(-0.03, 0.03);

    this.minDist = 150;
    this.pushFactor = 0.02;
    this.pullFactor = 0.004;
    this.dampFactor = 0.92;
  }

  update(time) {

    let dx = this.ix - this.x;
    let dy = this.iy - this.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    let ax = dx * this.pullFactor;
    let ay = dy * this.pullFactor;

    const wave = Math.sin(time * 2 + this.ix * 0.01) * 0.3;
    ax += wave;
    ay += wave;

    const cursorDist = Math.hypot(this.x - cursor.x, this.y - cursor.y);

    if (cursorDist < 150) {
      this.scale = 3;
      this.spin *= 1.05;
      this.color = 'white';
    } else {
      this.scale = math.mapRange(dist, 0, 200, 1, 3, true);
      this.color = this.colMap(math.mapRange(dist, 0, 200, 0, 1, true));
    }

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

    this.rotation += this.spin;
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation);

    context.shadowColor = this.color;
    context.shadowBlur = 30;
    context.fillStyle = this.color;

    const spikes = 5;
    const outer = this.radius * this.scale;
    const inner = outer * 0.5;

    drawStar(context, spikes, outer, inner);
    context.fill();

    context.restore();
  }
}

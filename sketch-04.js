const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random'); 
const math = require('canvas-sketch-util/math');
const Tweakpane = require('tweakpane');
const Color = require('canvas-sketch-util/color');

const settings = {
  dimensions: [1080, 1080],
  animate: true,
  fps: 10,
  duration: 30
};


const params = {
  cols: 20,
  rows: 20,
  scaleMin: 2,
  scaleMax: 40,
  freq: 0.002,
  amp: 1,
  background: '#000000',
  foreground: '#ff0040',
  audioReactive: true,
  audioStrength: 2,
  lineCap: 'round', // default lineCap
};

let audioContext, analyser, dataArray;

const createAudio = async () => {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  const response = await fetch('music.mp3'); // ganti file sendiri
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.loop = true;

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);

  source.start();
};

window.addEventListener('click', () => {
  if (!audioContext) createAudio();
});

const sketch = () => {
  return ({ context, width, height, frame }) => {

    context.fillStyle = params.background;
    context.fillRect(0, 0, width, height);

    let audioLevel = 0;

    if (params.audioReactive && analyser) {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      audioLevel = sum / dataArray.length / 255; // normalize 0-1
    }

    const cols = params.cols;
    const rows = params.rows;

    const gridw = width * 0.8;
    const gridh = height * 0.8;
    const cellw = gridw / cols;
    const cellh = gridh / rows;
    const margx = (width - gridw) * 0.5;
    const margy = (height - gridh) * 0.5;

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {

        const x = col * cellw + margx;
        const y = row * cellh + margy;

        const n = random.noise3D(x, y, frame * 0.02, params.freq);

        const angle = n * Math.PI * params.amp + audioLevel * 5;

        const scale = math.mapRange(
          n + audioLevel * params.audioStrength,
          -1, 1,
          params.scaleMin,
          params.scaleMax
        );

        context.save();
        context.translate(x + cellw * 0.5, y + cellh * 0.5);
        context.rotate(angle);

        context.lineWidth = scale;
        context.lineCap = params.lineCap; // <-- lineCap dari Tweakpane

        const dynamicColor = Color.offsetHSL(
          params.foreground,
          audioLevel * 0.3,
          0,
          0
        );

        context.strokeStyle = dynamicColor.hex;

        context.beginPath();
        context.moveTo(cellw * -0.4, 0);
        context.lineTo(cellw * 0.4, 0);
        context.stroke();

        context.restore();
      }
    }
  };
};

const createPane = () => {
  const pane = new Tweakpane.Pane();

  pane.addInput(params, 'cols', { min: 5, max: 100, step: 1 });
  pane.addInput(params, 'rows', { min: 5, max: 100, step: 1 });
  pane.addInput(params, 'audioReactive');
  pane.addInput(params, 'audioStrength', { min: 0, max: 5 });
  pane.addInput(params, 'background');
  pane.addInput(params, 'foreground');
  pane.addInput(params, 'lineCap', { options: { butt: 'butt', round: 'round', square: 'square' } }); // <-- add lineCap
};

createPane();
canvasSketch(sketch, settings);

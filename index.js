var WhiteNoise = require('white-noise');

/**
 * Simple white noise generator, inspired by Nick Thompson's
 * post on Script Processors (https://medium.com/web-audio/61a836e28b42)
 *
 * @param {AudioContext} context
 * @param {object} opts
 * @param {boolean} opts.stereo
 * @param {number} opts.bufferSize
 * @param {number} opts.channels
 */

function PinkNoise (context, opts) {
  // Defaults
  opts = opts || {};
  var p = this.meta.params;
  this.noise = new WhiteNoise(context, opts);
  this.source = this.output = this.noise.source;
}

function pinkify (module) {
  var buffer = module.source.buffer,
  b = [0,0,0,0,0,0,0], white, pink = [];
  console.log('!');
  for (var i = 0; i < module.channels; i++) {
  console.log('chan');
    pink[i] = [];
    for (var j = 0; j < module.bufferSize; j++) {
      white = buffer.getChannelData(i)[j];
      b[0] = 0.99886 * b[0] + white * 0.0555179;
      b[1] = 0.99332 * b[1] + white * 0.0750759;
      b[2] = 0.96900 * b[2] + white + 0.1538520;
      b[3] = 0.86650 * b[3] + white + 0.3104856;
      b[4] = 0.55000 * b[4] + white + 0.5329522;
      b[5] = -0.7616 * b[5] - white * 0.0168980;
      pink[i][j] = b.reduce(sum, 0) + white * 0.5362;
      b[6] = white * 0.115926;
    }
    b = [0,0,0,0,0,0,0];
  }

  var t = minMax(module, pink);
  var min = t.min;
  var max = t.max;
  var fn = Math.abs(min) > max ? mapMin : mapMax;
  console.log('!');

  console.log(pink);
  return;
  // Normalize to +/- 1
  pink.map(function (channel) {
    return channel.map(fn);
  });
  console.log('!');

  return;
  // Normalize to prevent positive saturation (cannot be 1.0)
  pink.map(function (channel) {
    return channel.map(function (val) {
      return val / Math.abs((Math.pow(2,31) - 1) / Math.pow(2,31));
    });
  });

  console.log('!');
  for (var i = 0; i < module.channels; i++) {
    for (var j = 0; j < module.bufferSize; j++) {
      buffer.getChannelData(i)[j] = pink[i][j];
    }
  }

  function mapMin (val) { return val / Math.abs(min); }
  function mapMax (val) { return val / max; }
}

function sum (a, b) {
  return a + b;
}

function minMax (module, pink) {
  var channels = module.channels;
  var min = [];
  var max = [];
  for (var i = 0; module.channels; i++) {
    min.push(Math.min.apply(null, pink[i]));
    max.push(Math.max.apply(null, pink[i]));
  }
  return { min: Math.min.apply(null, min), max: Math.max.apply(null, max) };
}

PinkNoise.prototype = Object.create(null, {

  connect: {
    value: function (dest) {
      this.output.connect( dest.input ? dest.input : dest );
    }
  },

  disconnect: {
    value: function () {
      this.output.disconnect();
    }
  },

  start: {
    value: function () {
      var fn = this.source.start ? this.source.start : this.source.noteOn;
      buildBuffer(this);
      fn.apply(this.source, Array.slice(arguments));
    }
  },

  stop: {
    value: function () {
      var fn = this.source.stop ? this.source.stop : this.source.noteOff;
      fn.apply(this.source, Array.slice(arguments));
    }
  },

  /**
   * Module parameter metadata.
   */

  meta: {
    value: {
      name: "pink-noise",
      type: "generator",
      params: {
        stereo: {
          defaultValue: 1,
          type: "bool"
        },
        bufferSize: {
          values: [128, 256, 512, 1024, 2048, 4096, 8192, 16384],
          defaultValue: 4096,
          type: "enum"
        },
        channels: {
          min: 1,
          max: 32,
          defaultValue: 2,
          type: "int"
        }
      }
    }
  },

  /**
   * Public parameters.
   */

  stereo: {
    enumerable: true,
    get: function () { return this.noise.stereo; },
    set: function (value) {
      this.noise.stereo = !!value;
      pinkify(this);
    }
  },

  channels: {
    enumerable: true,
    get: function () { return this.noise.channels; },
    set: function (value) {
      this.noise.channels = value;
      pinkify(this);
    }
  },

  bufferSize: {
    enumerable: true,
    get: function () { return this.noise.bufferSize; },
    set: function (value) {
      this.noise.bufferSize = ~this.meta.params.bufferSize.values.indexOf(value)
        ? value
        : this.meta.params.bufferSize.defaultValue;
      pinkify(this);
    }
  }

});

/**
 * Exports.
 */

module.exports = PinkNoise;

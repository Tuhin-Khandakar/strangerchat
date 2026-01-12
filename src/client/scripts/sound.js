export const SoundManager = {
  ctx: null,
  muted: localStorage.getItem('strngr_muted') === 'true',
  volume: 0.5,

  init() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      } else {
        if (import.meta.env.DEV) {
          console.warn('AudioContext not supported in this browser');
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('Failed to initialize AudioContext:', e.message);
      }
      this.ctx = null;
    }
  },

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('strngr_muted', muted);
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  play(type) {
    const dnd = localStorage.getItem('strngr_dnd') === 'true';
    if (this.muted || dnd || !this.ctx) {
      return;
    }
    this.resume();

    switch (type) {
      case 'match':
        this._playMatch();
        break;
      case 'message':
        this._playMessage();
        break;
      case 'disconnect':
        this._playDisconnect();
        break;
    }
  },

  _osc(freq, type, duration, startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);

    gain.gain.setValueAtTime(this.volume * 0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.stop(startTime + duration);
  },

  _playMatch() {
    const now = this.ctx.currentTime;
    // Ascending chime
    this._osc(440, 'sine', 0.1, now);
    this._osc(554, 'sine', 0.1, now + 0.1);
    this._osc(659, 'sine', 0.2, now + 0.2); // A4, C#5, E5
  },

  _playMessage() {
    const now = this.ctx.currentTime;
    // Simple pop
    this._osc(800, 'sine', 0.1, now);
  },

  _playDisconnect() {
    const now = this.ctx.currentTime;
    // Descending
    this._osc(400, 'triangle', 0.1, now);
    this._osc(300, 'triangle', 0.2, now + 0.1);
  },
};

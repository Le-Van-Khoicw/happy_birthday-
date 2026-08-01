document.addEventListener('DOMContentLoaded', () => {
  const scenes = [...document.querySelectorAll('.scene')];
  const canvas = document.getElementById('heartCanvas');
  const ctx = canvas.getContext('2d');
  const finalCopy = document.getElementById('finalCopy');
  const replayButton = document.getElementById('replayButton');
  const soundButton = document.getElementById('soundButton');
  const birthdayTrack = document.getElementById('birthdayTrack');
  const lyricOverlay = document.getElementById('lyricOverlay');
  const lyricOriginal = document.getElementById('lyricOriginal');
  const lyricTranslation = document.getElementById('lyricTranslation');
  let particles = [];
  let animationId = null;
  let audio = null;
  let musicTimer = null;
  let muted = false;
  let finaleStartedAt = 0;
  let lyricTimer = null;
  let lyricStartedAt = 0;
  let scrapbookPage = 0;
  let scrapbookTimer = null;
  let scrapbookTransitioning = false;
  const scrapbookPages = [...document.querySelectorAll('.scrap-page')];
  const scrapbookDots = document.getElementById('scrapDots');
  const scrapbook = document.getElementById('scrapbook');

  buildQrHeart();
  buildScrapbookDots();

  document.getElementById('startButton').addEventListener('click', () => {
    transition('memoryScene');
  });

  document.querySelectorAll('[data-next]').forEach(button => {
    button.addEventListener('click', () => transition(button.dataset.next));
  });

  document.getElementById('finaleButton').addEventListener('click', () => {
    transition('finaleScene');
    setTimeout(startFinale, 250);
  });

  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    particles.forEach(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      const distance = Math.max(20, Math.hypot(dx, dy));
      if (distance < 190) {
        p.vx += dx / distance * (190 - distance) * .055;
        p.vy += dy / distance * (190 - distance) * .055;
      }
    });
    playSparkle();
  });

  soundButton.addEventListener('click', () => {
    muted = !muted;
    soundButton.classList.toggle('muted', muted);
    if (audio?.track) audio.track.muted = muted;
    if (audio?.gain) audio.gain.gain.setTargetAtTime(muted ? 0 : .09, audio.context.currentTime, .08);
  });

  replayButton.addEventListener('click', () => {
    cancelAnimationFrame(animationId);
    finalCopy.classList.remove('show');
    replayButton.classList.remove('show');
    transition('introScene');
  });

  window.addEventListener('resize', () => {
    if (document.getElementById('finaleScene').classList.contains('active')) setupParticles();
  });

  function transition(id) {
    lyricOverlay.classList.toggle('suppressed', id === 'finaleScene' || id === 'introScene');
    const current = document.querySelector('.scene.active');
    if (current) {
      current.classList.add('leaving');
      current.classList.remove('active');
      setTimeout(() => current.classList.remove('leaving'), 750);
    }
    const next = document.getElementById(id);
    setTimeout(() => {
      next.classList.add('active');
      if (id === 'memoryScene') {
        startMusic();
        startScrapbook();
      }
      else stopScrapbook();
    }, 180);
  }

  function buildScrapbookDots() {
    scrapbookPages.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Xem trang album ${index + 1}`);
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => {
        showScrapbookPage(index);
        startScrapbook();
      });
      scrapbookDots.appendChild(dot);
    });
  }

  function showScrapbookPage(index) {
    if (scrapbookTransitioning) return;
    const nextIndex = (index + scrapbookPages.length) % scrapbookPages.length;
    if (nextIndex === scrapbookPage) return;

    scrapbookTransitioning = true;
    const oldPage = scrapbookPages[scrapbookPage];
    const newPage = scrapbookPages[nextIndex];

    scrapbook.classList.remove('circle-reveal');
    void scrapbook.offsetWidth;
    scrapbook.classList.add('circle-reveal');
    oldPage.classList.add('zoom-away');
    newPage.classList.remove('exit-left', 'zoom-away', 'reveal-page');

    setTimeout(() => {
      oldPage.classList.remove('active', 'zoom-away');
      scrapbookPage = nextIndex;
      newPage.classList.add('active', 'reveal-page');
      [...scrapbookDots.children].forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === scrapbookPage));
    }, 390);

    setTimeout(() => {
      newPage.classList.remove('reveal-page');
      scrapbook.classList.remove('circle-reveal');
      scrapbookTransitioning = false;
    }, 1050);
  }

  function startScrapbook() {
    stopScrapbook();
    scrapbookTimer = setInterval(() => showScrapbookPage(scrapbookPage + 1), 3600);
  }

  function stopScrapbook() {
    clearInterval(scrapbookTimer);
    scrapbookTimer = null;
  }

  function buildQrHeart() {
    const grid = document.getElementById('qrGrid');
    const count = 17 * 17;
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('i');
      const row = Math.floor(i / 17);
      const col = i % 17;
      const finder = ((row < 5 && col < 5) || (row < 5 && col > 11) || (row > 11 && col < 5));
      if (!finder && Math.random() > .57) cell.className = 'off';
      grid.appendChild(cell);
    }
  }

  function startMusic() {
    if (audio) return;
    startLyrics();
    birthdayTrack.play().then(() => {
      audio = { track: birthdayTrack };
    }).catch(() => startSynthMusic());
  }

  function startSynthMusic() {
    if (audio) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = .09;
    gain.connect(context.destination);
    audio = { context, gain, step: 0 };
    const notes = [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66];
    const playNote = () => {
      if (!audio) return;
      const now = context.currentTime;
      const osc = context.createOscillator();
      const noteGain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[audio.step++ % notes.length];
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(.38, now + .04);
      noteGain.gain.exponentialRampToValueAtTime(.001, now + .65);
      osc.connect(noteGain).connect(gain);
      osc.start(now); osc.stop(now + .7);
    };
    playNote();
    musicTimer = setInterval(playNote, 520);
  }

  function startLyrics() {
    clearInterval(lyricTimer);
    lyricStartedAt = performance.now();
    const cues = [
      { at: 1.6, en: 'Chúc mừng sinh nhật em', vi: 'Tuổi mới thật nhiều niềm vui 🌷' },
      { at: 7.0, en: 'Chúc mừng sinh nhật em', vi: 'Chúc em luôn rạng rỡ và hạnh phúc' },
      { at: 12.5, en: 'Chúc mừng sinh nhật Thanh Trà', vi: 'Hôm nay là ngày thật đặc biệt của em' },
      { at: 18.2, en: 'Chúc mừng sinh nhật em', vi: 'Mong em luôn được yêu thương' },
      { at: 24.0, en: 'Mọi điều ước sẽ thành hiện thực', vi: 'Anh mong những điều tốt đẹp nhất đến với em ✨' }
    ];
    let shown = -1;
    lyricTimer = setInterval(() => {
      const seconds = audio?.track && !audio.track.paused
        ? audio.track.currentTime
        : ((performance.now() - lyricStartedAt) / 1000) % 29;
      let cueIndex = -1;
      cues.forEach((cue, index) => { if (seconds >= cue.at) cueIndex = index; });
      if (seconds < 1.2 || seconds > 28.7) cueIndex = -1;
      if (cueIndex === shown) return;
      shown = cueIndex;
      lyricOverlay.classList.remove('show');
      if (cueIndex < 0) return;
      setTimeout(() => {
        lyricOriginal.textContent = cues[cueIndex].en;
        lyricTranslation.textContent = cues[cueIndex].vi;
        lyricOverlay.classList.add('show');
      }, 180);
    }, 120);
  }

  function playSparkle() {
    if (!audio?.context || muted) return;
    const now = audio.context.currentTime;
    const osc = audio.context.createOscillator();
    const g = audio.context.createGain();
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + .22);
    g.gain.setValueAtTime(.12, now);
    g.gain.exponentialRampToValueAtTime(.001, now + .3);
    osc.connect(g).connect(audio.gain); osc.start(); osc.stop(now + .32);
  }

  function startFinale() {
    setupParticles();
    finaleStartedAt = performance.now();
    animateHeart(finaleStartedAt);
    setTimeout(() => finalCopy.classList.add('show'), 3600);
    setTimeout(() => replayButton.classList.add('show'), 5200);
  }

  function setupParticles() {
    // A lower backing resolution is visually sufficient for glowing particles
    // and avoids pushing 2-3x more pixels on high-DPI phones.
    const mobile = innerWidth < 700;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const weakPhone = mobile && (navigator.hardwareConcurrency || 4) <= 4;
    const count = mobile ? (weakPhone ? 420 : 650) : 1300;
    const scale = Math.min(innerWidth / 34, innerHeight / 50);
    const centerX = innerWidth / 2;
    const centerY = innerHeight * .42;
    particles = Array.from({ length: count }, (_, index) => {
      const t = Math.random() * Math.PI * 2;
      const depth = .34 + Math.random() * .66;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      const targetX = centerX + hx * scale * depth;
      const targetY = centerY - hy * scale * depth;
      // Spawn around the final silhouette instead of below the viewport.
      // This keeps the reveal readable even when mobile browsers throttle FPS.
      const startX = targetX + (Math.random() - .5) * Math.min(240, innerWidth * .58);
      const startY = targetY + (Math.random() - .5) * Math.min(300, innerHeight * .38);
      return {
        x: startX, y: startY, sx: startX, sy: startY,
        tx: targetX, ty: targetY,
        vx: 0, vy: 0,
        size: .55 + Math.random() * 1.65,
        phase: Math.random() * Math.PI * 2,
        delay: index / count * 1100 + Math.random() * 600
      };
    });
  }

  function animateHeart(now) {
    const elapsed = now - finaleStartedAt;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const hue = 190 + Math.min(130, elapsed / 42);
    ctx.globalCompositeOperation = 'lighter';
    drawHeartAura(elapsed, hue);
    particles.forEach((p, index) => {
      if (elapsed < p.delay) return;
      const progress = Math.max(0, Math.min(1, (elapsed - p.delay) / 2200));
      const eased = 1 - Math.pow(1 - progress, 4);
      const breathe = 1 + Math.sin(now * .0022 + p.phase) * .018 * progress;
      const cx = innerWidth / 2;
      const cy = innerHeight * .42;
      const targetX = cx + (p.tx - cx) * breathe;
      const targetY = cy + (p.ty - cy) * breathe;
      p.vx *= .92; p.vy *= .92;
      p.x = p.sx + (targetX - p.sx) * eased + p.vx;
      p.y = p.sy + (targetY - p.sy) * eased + p.vy;
      const flicker = .55 + .45 * Math.sin(now * .004 + p.phase);
      const colorHue = (hue + index % 36) % 360;
      ctx.fillStyle = `hsla(${colorHue},100%,${72 + flicker * 18}%,${.38 + flicker * .55})`;
      // Per-particle shadowBlur is extremely expensive on mobile canvases.
      // The shared heart aura and portal provide the glow instead.
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (.8 + flicker * .4), 0, Math.PI * 2);
      ctx.fill();
    });
    drawPortal(elapsed, hue);
    ctx.globalCompositeOperation = 'source-over';
    animationId = requestAnimationFrame(animateHeart);
  }

  function drawHeartAura(elapsed, hue) {
    const cx = innerWidth / 2;
    const cy = innerHeight * .42;
    const size = Math.min(innerWidth * .39, innerHeight * .19);
    const power = Math.min(1, elapsed / 1800);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * .82);
    ctx.bezierCurveTo(cx - size * 1.25, cy + size * .18, cx - size * .88, cy - size * .85, cx, cy - size * .28);
    ctx.bezierCurveTo(cx + size * .88, cy - size * .85, cx + size * 1.25, cy + size * .18, cx, cy + size * .82);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(cx - size, cy, cx + size, cy);
    gradient.addColorStop(0, `hsla(${hue},100%,70%,${.12 * power})`);
    gradient.addColorStop(.5, `hsla(${(hue + 55) % 360},100%,80%,${.28 * power})`);
    gradient.addColorStop(1, `hsla(${(hue + 95) % 360},100%,68%,${.14 * power})`);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = `hsla(${(hue + 70) % 360},100%,78%,${.42 * power})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = `hsla(${(hue + 65) % 360},100%,70%,.9)`;
    ctx.shadowBlur = 28;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPortal(elapsed, hue) {
    const x = innerWidth / 2;
    const y = innerHeight * .69;
    const power = Math.min(1, elapsed / 1800);
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, innerWidth * .28);
    gradient.addColorStop(0, `hsla(${hue},100%,85%,${.8 * power})`);
    gradient.addColorStop(.2, `hsla(${hue},100%,65%,${.35 * power})`);
    gradient.addColorStop(1, 'transparent');
    ctx.save();
    ctx.scale(1, .2);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y * 5, innerWidth * .28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
});

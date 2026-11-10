(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = 720;
  const H = 420;
  canvas.width = W;
  canvas.height = H;

  const ROUNDS = 5;
  const R = 26;

  let round;
  let times;
  let target;
  let appearedAt;
  let waiting;
  let retryTimer;

  function drawBackground() {
    ctx.fillStyle = '#08070f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(243, 239, 255, 0.6)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Cible ${Math.min(round + 1, ROUNDS)} / ${ROUNDS}`, 20, 32);
    if (times.length > 0) {
      const average = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      ctx.fillText(`Moyenne : ${average} ms`, 20, 56);
    }
  }

  function draw() {
    drawBackground();

    if (target) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, R + 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(target.x, target.y, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#08070f';
      ctx.beginPath();
      ctx.arc(target.x, target.y, R * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (waiting) {
      ctx.fillStyle = 'rgba(243, 239, 255, 0.35)';
      ctx.font = '20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Prépare-toi…', W / 2, H / 2);
      ctx.textAlign = 'start';
    }
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  function reset() {
    round = 0;
    times = [];
    target = null;
    appearedAt = 0;
    waiting = false;
    clearTimeout(retryTimer);
    Pookie.setScore(0);
    Pookie.setStatus('Clique le plus vite possible sur la cible.');
    nextRound();
  }

  function nextRound() {
    waiting = true;
    target = null;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      waiting = false;
      target = {
        x: 50 + Math.random() * (W - 100),
        y: 80 + Math.random() * (H - 160),
      };
      appearedAt = performance.now();
    }, 700 + Math.random() * 1200);
  }

  function finish() {
    target = null;
    const total = Math.round(times.reduce((a, b) => a + b, 0));
    const points = Math.max(0, 5000 - total);
    Pookie.setScore(points);
    Pookie.setStatus(`Temps total ${total} ms : ${points} points.`);
    Pookie.submitScore(points, Math.round(total / 1000));
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!target) {
      if (waiting) Pookie.setStatus('Trop tôt ! Attends que la cible apparaisse.', 'danger');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const distance = Math.hypot(x - target.x, y - target.y);

    if (distance > R + 6) {
      Pookie.setStatus('Raté, vise le centre de la cible.', 'danger');
      return;
    }

    times.push(performance.now() - appearedAt);
    round += 1;
    Pookie.setScore(round);

    if (round >= ROUNDS) {
      finish();
      return;
    }
    Pookie.setStatus(`Cible ${round}/${ROUNDS} touchée. Suivante…`);
    nextRound();
  });

  Pookie.restartButton(reset);
  reset();
  loop();
})();

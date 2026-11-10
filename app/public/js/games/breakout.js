// Casse-briques : 3 vies, 10 points par brique, 50 points par vague
(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = 720;
  const H = 480;
  canvas.width = W;
  canvas.height = H;

  const PADDLE_W = 110;
  const PADDLE_H = 14;
  const BALL_R = 9;
  const COLS = 9;
  const ROWS = 5;
  const BRICK_W = 70;
  const BRICK_H = 20;
  const GAP = 6;
  const LEFT = (W - (COLS * (BRICK_W + GAP) - GAP)) / 2;
  const TOP = 70;

  let paddleX;
  let ball;
  let bricks;
  let score;
  let lives;
  let wave;
  let running;
  let startedAt;
  let keys;
  let frame;

  function buildBricks() {
    bricks = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        bricks.push({
          x: LEFT + col * (BRICK_W + GAP),
          y: TOP + row * (BRICK_H + GAP),
          alive: true,
          row,
        });
      }
    }
  }

  function serve() {
    const speed = 3.4 + wave * 0.4;
    ball = { x: W / 2, y: H - 90, dx: speed * (Math.random() > 0.5 ? 1 : -1), dy: -speed };
  }

  function reset() {
    paddleX = (W - PADDLE_W) / 2;
    score = 0;
    lives = 3;
    wave = 0;
    keys = {};
    running = true;
    startedAt = Date.now();
    buildBricks();
    serve();
    Pookie.setScore(0);
    Pookie.setStatus('Souris ou flèches gauche / droite pour déplacer la raquette.');
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    Pookie.gameOver(score, startedAt);
  }

  function draw() {
    ctx.fillStyle = '#08070f';
    ctx.fillRect(0, 0, W, H);

    bricks.forEach((brick) => {
      if (!brick.alive) return;
      ctx.fillStyle = ['#8b5cf6', '#22d3ee', '#f472b6', '#34d399', '#fbbf24'][brick.row % 5];
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, BRICK_W, BRICK_H, 5);
      ctx.fill();
    });

    ctx.fillStyle = '#e9e4ff';
    ctx.beginPath();
    ctx.roundRect(paddleX, H - 40, PADDLE_W, PADDLE_H, 7);
    ctx.fill();

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(243, 239, 255, 0.55)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Vies : ${lives} · Vague : ${wave + 1}`, 16, 28);
  }

  function bounceOffBrick(brick) {
    const overlapX = Math.min(Math.abs(ball.x - brick.x), Math.abs(ball.x - (brick.x + BRICK_W)));
    const overlapY = Math.min(Math.abs(ball.y - brick.y), Math.abs(ball.y - (brick.y + BRICK_H)));
    if (overlapX < overlapY) ball.dx = -ball.dx;
    else ball.dy = -ball.dy;
  }

  function update() {
    if (keys.left) paddleX -= 8;
    if (keys.right) paddleX += 8;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX));

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - BALL_R < 0) {
      ball.x = BALL_R;
      ball.dx = Math.abs(ball.dx);
    }
    if (ball.x + BALL_R > W) {
      ball.x = W - BALL_R;
      ball.dx = -Math.abs(ball.dx);
    }
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.dy = Math.abs(ball.dy);
    }

    // Raquette
    if (
      ball.dy > 0 &&
      ball.y + BALL_R >= H - 40 &&
      ball.y - BALL_R <= H - 40 + PADDLE_H &&
      ball.x >= paddleX &&
      ball.x <= paddleX + PADDLE_W
    ) {
      ball.y = H - 40 - BALL_R;
      ball.dy = -Math.abs(ball.dy);
      const hit = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      ball.dx = hit * 5.2;
    }

    // Briques
    bricks.forEach((brick) => {
      if (!brick.alive) return;
      const close =
        ball.x + BALL_R > brick.x &&
        ball.x - BALL_R < brick.x + BRICK_W &&
        ball.y + BALL_R > brick.y &&
        ball.y - BALL_R < brick.y + BRICK_H;
      if (!close) return;
      brick.alive = false;
      score += 10;
      Pookie.setScore(score);
      bounceOffBrick(brick);
    });

    if (!bricks.some((brick) => brick.alive)) {
      wave += 1;
      score += 50;
      Pookie.setScore(score);
      buildBricks();
      serve();
    }

    if (ball.y - BALL_R > H) {
      lives -= 1;
      if (lives <= 0) return gameOver();
      serve();
      Pookie.setStatus(`Balle perdue, il reste ${lives} vie(s).`);
    }
    return undefined;
  }

  function loop() {
    if (!running) return;
    update();
    if (!running) return;
    draw();
    frame = requestAnimationFrame(loop);
  }

  function onKey(event, pressed) {
    if (event.key === 'ArrowLeft') keys.left = pressed;
    if (event.key === 'ArrowRight') keys.right = pressed;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
  }

  document.addEventListener('keydown', (event) => onKey(event, true));
  document.addEventListener('keyup', (event) => onKey(event, false));

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
  });

  Pookie.restartButton(reset);
  reset();
})();

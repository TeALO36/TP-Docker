(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CELL = 24;
  const COLS = 30;
  const ROWS = 20;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;

  let snake;
  let direction;
  let queued;
  let food;
  let score;
  let running;
  let startedAt;
  let lastTick;
  let accumulator;
  let frame;

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((cell) => cell.x === food.x && cell.y === food.y));
  }

  function reset() {
    snake = [{ x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    queued = null;
    score = 0;
    running = true;
    startedAt = Date.now();
    lastTick = 0;
    accumulator = 0;
    placeFood();
    Pookie.setScore(0);
    Pookie.setStatus('Flèches ou ZQSD pour diriger le serpent.');
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  }

  function speed() {
    return Math.max(70, 145 - Math.floor(score / 50) * 10);
  }

  function step() {
    if (queued && (queued.x !== -direction.x || queued.y !== -direction.y)) {
      direction = queued;
    }
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return gameOver();
    if (snake.some((cell) => cell.x === head.x && cell.y === head.y)) return gameOver();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      Pookie.setScore(score);
      placeFood();
    } else {
      snake.pop();
    }
    return undefined;
  }

  function gameOver() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    Pookie.gameOver(score, startedAt);
  }

  function draw() {
    ctx.fillStyle = '#08070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(canvas.width, y * CELL);
      ctx.stroke();
    }

    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((cell, index) => {
      const ratio = index / snake.length;
      ctx.fillStyle = index === 0 ? '#a78bfa' : `rgba(34, 211, 238, ${0.85 - ratio * 0.55})`;
      const pad = index === 0 ? 2 : 3;
      ctx.beginPath();
      ctx.roundRect(
        cell.x * CELL + pad,
        cell.y * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2,
        6,
      );
      ctx.fill();
    });
  }

  function loop(timestamp) {
    if (!running) return;
    if (!lastTick) lastTick = timestamp;
    accumulator += timestamp - lastTick;
    lastTick = timestamp;

    if (accumulator >= speed()) {
      accumulator = 0;
      step();
      if (!running) return;
    }

    draw();
    frame = requestAnimationFrame(loop);
  }

  function onKey(event) {
    const key = event.key.toLowerCase();
    const map = {
      arrowup: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      z: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      q: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      a: { x: -1, y: 0 },
    };
    const next = map[key];
    if (!next) return;
    event.preventDefault();
    queued = next;
  }

  document.addEventListener('keydown', onKey);
  Pookie.restartButton(reset);
  reset();
})();

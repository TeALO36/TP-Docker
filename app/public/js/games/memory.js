(function () {
  'use strict';

  const board = document.getElementById('memory-board');
  if (!board) return;

  const EMOJIS = ['🐍', '🧠', '🧱', '🎯', '👾', '🚀'];
  const PAIRS = EMOJIS.length;

  let first;
  let lock;
  let moves;
  let matched;
  let startedAt;

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function reset() {
    board.innerHTML = '';
    first = null;
    lock = false;
    moves = 0;
    matched = 0;
    startedAt = 0;
    Pookie.setScore(0);
    Pookie.setStatus('Retourne deux cartes identiques. Moins d’essais, plus de points.');

    shuffle(EMOJIS.concat(EMOJIS)).forEach((emoji) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'memory-card';
      card.setAttribute('aria-label', 'Carte face cachée');

      const front = document.createElement('span');
      front.className = 'memory-face memory-front';
      front.textContent = '?';

      const back = document.createElement('span');
      back.className = 'memory-face memory-back';
      back.textContent = emoji;

      card.append(front, back);
      card.addEventListener('click', () => flip(card, emoji));
      board.appendChild(card);
    });
  }

  function seconds() {
    return startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1;
  }

  function flip(card, emoji) {
    if (lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (!startedAt) startedAt = Date.now();

    card.classList.add('flipped');

    if (!first) {
      first = { card, emoji };
      return;
    }

    moves += 1;
    Pookie.setScore(matched);

    if (first.emoji === emoji) {
      first.card.classList.add('matched');
      card.classList.add('matched');
      first = null;
      matched += 1;
      if (matched === PAIRS) finish();
      return;
    }

    lock = true;
    const previous = first;
    first = null;
    setTimeout(() => {
      previous.card.classList.remove('flipped');
      card.classList.remove('flipped');
      lock = false;
    }, 700);
  }

  function finish() {
    const time = seconds();
    const points = Math.max(100, 1500 - moves * 60 - time * 4);
    Pookie.setScore(points);
    Pookie.setStatus(`Toutes les paires trouvées en ${moves} essais et ${time} s.`);
    Pookie.submitScore(points, time);
  }

  Pookie.restartButton(reset);
  reset();
})();

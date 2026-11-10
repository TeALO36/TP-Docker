// Code partagé par les quatre jeux : interface + envoi du score a l'API
(function () {
  'use strict';

  const body = document.body;
  const game = body.dataset.game || '';
  const logged = body.dataset.logged === '1';
  const byId = (id) => document.getElementById(id);

  const scoreEl = byId('hud-score');
  const bestEl = byId('hud-best');
  const statusEl = byId('hud-status');
  let best = Number(body.dataset.best || 0);

  function setScore(value) {
    if (scoreEl) scoreEl.textContent = String(value);
  }

  function setBest(value) {
    best = Number(value) || 0;
    if (bestEl) bestEl.textContent = String(best);
  }

  function setStatus(text, type) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.dataset.type = type || '';
  }

  async function submitScore(score, seconds) {
    const payload = {
      game_slug: game,
      score: Math.round(score),
      duration: Math.max(0, Math.round(seconds)),
    };
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setStatus(
          `Partie terminée : ${payload.score} pts. Connecte-toi pour sauvegarder ta progression.`,
          'danger',
        );
        return null;
      }
      if (!response.ok) {
        setStatus(`Score non enregistré : ${data.error || 'erreur inconnue'}`, 'danger');
        return null;
      }

      setBest(data.best);
      setStatus(
        data.record
          ? `Nouveau record : ${data.best} pts ! Progression sauvegardée.`
          : `Score enregistré (${payload.score} pts). Record : ${data.best} pts.`,
        'ok',
      );
      return data;
    } catch (err) {
      setStatus('Serveur injoignable, score non enregistré.', 'danger');
      return null;
    }
  }

  function gameOver(score, startedAt) {
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setStatus(`Partie terminée : ${score} pts…`);
    return submitScore(score, seconds);
  }

  function restartButton(handler) {
    const button = byId('hud-restart');
    if (button) button.addEventListener('click', handler);
  }

  window.Pookie = {
    game,
    logged,
    setScore,
    setBest,
    setStatus,
    submitScore,
    gameOver,
    restartButton,
  };

  if (game) setBest(best);
})();

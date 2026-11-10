-- Catalogue des jeux (le code du jeu est dans app/public/js/games/).
INSERT INTO games (slug, title, description, category, emoji, gradient, how_to, position) VALUES
  ('snake', 'Serpent Néon', 'Un serpent, des pommes, et une vitesse qui monte.', 'Arcade', '🐍', 'grad-snake', 'Flèches ou ZQSD pour diriger. +10 points par pomme, la vitesse augmente.', 1),
  ('memory', 'Memory Cosmique', 'Retrouve les six paires le plus vite possible.', 'Réflexion', '🧠', 'grad-memory', 'Clique deux cartes. Moins d''essais et moins de temps = plus de points.', 2),
  ('breakout', 'Casse-Briques', 'Détruis toutes les briques sans perdre tes trois vies.', 'Arcade', '🧱', 'grad-breakout', 'Souris ou flèches gauche/droite pour la raquette. +10 points par brique.', 3),
  ('reflex', 'Réflexes', 'Cinq cibles, un chronomètre, aucun droit à l''erreur.', 'Adresse', '🎯', 'grad-reflex', 'Clique sur la cible dès qu''elle apparaît. Score = 5000 - temps total en ms.', 4);

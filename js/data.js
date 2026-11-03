// Game content: ranks, the Tour de France stops, shop items, trophies, phrases.

// ---------- levels & ranks ----------

// XP needed to go from level L to L+1.
export const xpToNext = level => 80 + 40 * (level - 1);

export const RANKS = [
  { level: 1, name: 'Touriste', emoji: '🧳' },
  { level: 3, name: 'Petit Croissant', emoji: '🥐' },
  { level: 5, name: 'Baguette Junior', emoji: '🥖' },
  { level: 7, name: 'Grand Fromage', emoji: '🧀' },
  { level: 9, name: 'Chef Pâtissier', emoji: '🧁' },
  { level: 12, name: 'Artiste de Montmartre', emoji: '🎨' },
  { level: 15, name: 'Mousquetaire', emoji: '⚔️' },
  { level: 18, name: 'Capitaine', emoji: '⛵' },
  { level: 21, name: 'Roi ou Reine du Château', emoji: '🏰' },
  { level: 25, name: 'Légende de Paris', emoji: '🗼' },
];

// ---------- Tour de France: one stop unlocked per level ----------

export const TOUR = [
  { city: 'Paris', emoji: '🗼', lat: 48.86, lon: 2.35, fact: 'The Eiffel Tower grows up to 15 cm taller in summer, because its metal expands in the heat. After dark it sparkles for 5 minutes every hour.' },
  { city: 'Versailles', emoji: '👑', lat: 48.80, lon: 2.13, fact: 'The Palace of Versailles has about 2,300 rooms. Its Hall of Mirrors has 357 mirrors — very fancy back in the 1600s.' },
  { city: 'Rouen', emoji: '🕰️', lat: 49.44, lon: 1.10, fact: 'Rouen has the Gros-Horloge: a giant golden clock built into an arch over a street, and it has been ticking for over 500 years.' },
  { city: 'Mont-Saint-Michel', emoji: '🏰', lat: 48.64, lon: -1.51, fact: 'At high tide Mont-Saint-Michel becomes an island. The tide here comes in so fast that people say it races in "like a galloping horse".' },
  { city: 'Saint-Malo', emoji: '🏴‍☠️', lat: 48.65, lon: -2.03, fact: 'Saint-Malo was home to corsairs: sailors allowed by the king to capture enemy ships. Basically pirates, but with permission!' },
  { city: 'Carnac', emoji: '🪨', lat: 47.58, lon: -3.08, fact: 'Carnac has more than 3,000 standing stones lined up in rows. People placed them over 6,000 years ago, and nobody knows exactly why.' },
  { city: 'Nantes', emoji: '🐘', lat: 47.21, lon: -1.56, fact: 'In Nantes a giant mechanical elephant, 12 metres tall, walks around carrying about 50 passengers. Jules Verne, who wrote sci-fi adventures, was born here.' },
  { city: 'Chambord', emoji: '🌀', lat: 47.62, lon: 1.52, fact: 'The Château de Chambord has a double staircase: two people can climb it at the same time and never meet. Leonardo da Vinci may have inspired it.' },
  { city: 'La Rochelle', emoji: '⚓', lat: 46.16, lon: -1.15, fact: 'Two old towers guard La Rochelle\'s harbour. Long ago, a huge chain was stretched between them at night to lock ships out.' },
  { city: 'Bordeaux', emoji: '🪞', lat: 44.84, lon: -0.57, fact: 'Bordeaux has the "Miroir d\'eau", a giant pool with only 2 cm of water. You can walk on it, and it reflects the buildings like a mirror.' },
  { city: 'Dune du Pilat', emoji: '🏜️', lat: 44.59, lon: -1.21, fact: 'The Dune du Pilat is the tallest sand dune in Europe, over 100 metres high. It creeps inland a few metres every year.' },
  { city: 'Biarritz', emoji: '🏄', lat: 43.48, lon: -1.56, fact: 'Biarritz is where surfing first arrived in Europe, back in 1957. Locals here also speak Basque, one of the oldest languages in Europe.' },
  { city: 'Toulouse', emoji: '✈️', lat: 43.60, lon: 1.44, fact: 'Toulouse is called "la Ville Rose" (the pink city) because of its pink bricks. Giant Airbus planes are put together here.' },
  { city: 'Carcassonne', emoji: '🛡️', lat: 43.21, lon: 2.36, fact: 'Carcassonne is a real medieval fortress city with 3 km of walls and 52 towers. The famous board game is named after it.' },
  { city: 'Pont du Gard', emoji: '🌉', lat: 43.95, lon: 4.54, fact: 'The Pont du Gard is a Roman bridge that carried water, built almost 2,000 years ago. Its stones stay up without any cement!' },
  { city: 'Marseille', emoji: '⛵', lat: 43.30, lon: 5.37, fact: 'Marseille is the oldest city in France. Greek sailors founded it around 600 BC.' },
  { city: 'Valensole', emoji: '💜', lat: 43.84, lon: 5.98, fact: 'In June and July the fields around Valensole turn bright purple with lavender, and the whole area smells amazing.' },
  { city: 'Nice', emoji: '🏖️', lat: 43.70, lon: 7.27, fact: 'The beach in Nice is made of smooth pebbles, not sand. Bring sandals!' },
  { city: 'Chamonix', emoji: '🏔️', lat: 45.92, lon: 6.87, fact: 'Chamonix sits under Mont Blanc (4,805 m), the highest mountain in western Europe. The very first Winter Olympics were held here in 1924.' },
  { city: 'Lyon', emoji: '🎬', lat: 45.76, lon: 4.84, fact: 'The Lumière brothers made some of the first movies ever in Lyon, in 1895. Lyon is also famous as a capital of French food.' },
  { city: 'Dijon', emoji: '🦉', lat: 47.32, lon: 5.04, fact: 'Dijon is famous for mustard. There is a little owl carved on a church wall, and people touch it with their left hand for good luck.' },
  { city: 'Strasbourg', emoji: '🎄', lat: 48.57, lon: 7.75, fact: 'Strasbourg\'s Christmas market started in 1570, making it one of the oldest in Europe.' },
  { city: 'Reims', emoji: '😇', lat: 49.26, lon: 4.03, fact: 'For centuries, French kings were crowned in Reims Cathedral. Look for the stone "Smiling Angel" by the door.' },
  { city: 'Lille', emoji: '🛍️', lat: 50.63, lon: 3.06, fact: 'Every September Lille hosts the Braderie, one of the biggest flea markets in Europe, and people eat mountains of mussels and fries.' },
  { city: 'Champs-Élysées', emoji: '🏆', lat: 48.87, lon: 2.31, fact: 'The Tour de France bike race usually finishes on the Champs-Élysées in Paris. You made it all the way around France. Bravo, champion!' },
];

// A simplified outline of mainland France (lat, lon), clockwise from Dunkirk.
export const FRANCE_OUTLINE = [
  [51.05, 2.37], [50.75, 3.1], [50.3, 4.1], [49.95, 4.8], [49.6, 5.5], [49.47, 6.37], [49.15, 6.9], [49.05, 7.9],
  [48.97, 8.2], [48.3, 7.75], [47.6, 7.55], [47.45, 7.0], [46.9, 6.45], [46.42, 6.1], [46.2, 6.0], [45.85, 6.9],
  [45.2, 7.1], [44.85, 6.95], [44.35, 6.9], [44.1, 7.65], [43.78, 7.5], [43.55, 7.0], [43.1, 6.15], [43.1, 5.8],
  [43.3, 5.2], [43.35, 4.7], [43.45, 4.2], [43.3, 3.5], [42.9, 3.05], [42.45, 3.15], [42.5, 2.6], [42.45, 1.85],
  [42.7, 1.0], [42.8, 0.2], [42.8, -0.4], [43.05, -1.35], [43.35, -1.78], [43.6, -1.45], [44.2, -1.3], [44.65, -1.25],
  [45.5, -1.2], [45.95, -1.3], [46.45, -1.8], [47.0, -2.1], [47.3, -2.55], [47.5, -2.9], [47.65, -3.45], [47.8, -4.15],
  [48.0, -4.7], [48.35, -4.78], [48.6, -4.6], [48.7, -3.95], [48.85, -3.3], [48.55, -2.6], [48.65, -2.0], [48.62, -1.55],
  [48.9, -1.6], [49.3, -1.75], [49.72, -1.94], [49.65, -1.25], [49.35, -1.1], [49.35, -0.3], [49.47, 0.1], [49.7, 0.25],
  [49.93, 1.08], [50.2, 1.55], [50.75, 1.6], [50.95, 1.85],
];

// Map lat/lon onto an SVG of width 100.
export function projectFrance(lat, lon) {
  const k = Math.cos(46.5 * Math.PI / 180);
  const x = (lon + 5.2) * k;
  const y = 51.3 - lat;
  const scale = 100 / (13.7 * k); // lon -5.2 … 8.5 spans the width
  return [+(x * scale).toFixed(2), +(y * scale * 1.0).toFixed(2)];
}

// ---------- shop ----------
// slot: hat | face | held | bg | card | freeze. `min` = level needed to buy.

export const SHOP = [
  { id: 'beret-rouge', slot: 'hat', name: 'Béret rouge', price: 40, svg: 'beret', color: '#C62A3A' },
  { id: 'beret-noir', slot: 'hat', name: 'Béret noir', price: 40, svg: 'beret', color: '#22232b' },
  { id: 'beret-bleu', slot: 'hat', name: 'Béret bleu', price: 40, svg: 'beret', color: '#1F4FB8' },
  { id: 'casquette', slot: 'hat', name: 'Casquette', price: 60, emoji: '🧢' },
  { id: 'chapeau', slot: 'hat', name: 'Chapeau de paille', price: 70, emoji: '👒' },
  { id: 'toque', slot: 'hat', name: 'Toque de chef', price: 90, svg: 'toque', min: 3 },
  { id: 'haut-de-forme', slot: 'hat', name: 'Haut-de-forme', price: 120, emoji: '🎩', min: 4 },
  { id: 'diplome', slot: 'hat', name: 'Chapeau de diplômé', price: 150, emoji: '🎓', min: 6 },
  { id: 'couronne', slot: 'hat', name: 'Couronne royale', price: 300, emoji: '👑', min: 10 },

  { id: 'moustache', slot: 'face', name: 'Moustache', price: 50, svg: 'moustache' },
  { id: 'lunettes', slot: 'face', name: 'Lunettes de soleil', price: 60, emoji: '🕶️' },
  { id: 'noeud', slot: 'face', name: 'Nœud papillon', price: 45, svg: 'bowtie' },

  { id: 'baguette', slot: 'held', name: 'Baguette', price: 30, emoji: '🥖' },
  { id: 'croissant', slot: 'held', name: 'Croissant', price: 30, emoji: '🥐' },
  { id: 'fleur', slot: 'held', name: 'Rose', price: 40, emoji: '🌹' },
  { id: 'drapeau', slot: 'held', name: 'Drapeau', price: 60, svg: 'flag' },
  { id: 'trophee', slot: 'held', name: 'Trophée', price: 200, emoji: '🏆', min: 8 },

  { id: 'bg-tricolore', slot: 'bg', name: 'Tricolore', price: 60, bg: 'linear-gradient(90deg,#1F4FB8 0 33.3%,#ffffff 33.3% 66.6%,#C62A3A 66.6%)' },
  { id: 'bg-mariniere', slot: 'bg', name: 'Marinière', price: 70, bg: 'repeating-linear-gradient(180deg,#1D2340 0 7px,#ffffff 7px 16px)' },
  { id: 'bg-lavande', slot: 'bg', name: 'Lavande', price: 80, bg: 'linear-gradient(160deg,#c9b6ef,#8a6fd1)' },
  { id: 'bg-plage', slot: 'bg', name: 'Plage de Nice', price: 90, bg: 'linear-gradient(180deg,#8fd3f4 0 55%,#2f8fd8 55% 75%,#f3d9a4 75%)' },
  { id: 'bg-coucher', slot: 'bg', name: 'Coucher de soleil', price: 110, bg: 'linear-gradient(180deg,#ffb36b,#ff6f91 60%,#845ec2)', min: 4 },
  { id: 'bg-nuit', slot: 'bg', name: 'Nuit à Paris', price: 150, bg: 'radial-gradient(circle at 75% 25%,#fff8 0 2px,transparent 3px),radial-gradient(circle at 25% 35%,#fff8 0 1.5px,transparent 2.5px),linear-gradient(180deg,#0e1b4d,#3a2a7a)', min: 6 },
  { id: 'bg-or', slot: 'bg', name: 'Or', price: 250, bg: 'linear-gradient(135deg,#f7d774,#d4a017 50%,#f7d774)', min: 9 },

  { id: 'card-mariniere', slot: 'card', name: 'Cartes marinière', price: 80, cls: 'theme-mariniere' },
  { id: 'card-macaron', slot: 'card', name: 'Cartes macaron', price: 100, cls: 'theme-macaron' },
  { id: 'card-nuit', slot: 'card', name: 'Cartes nuit étoilée', price: 140, cls: 'theme-nuit', min: 5 },
  { id: 'card-or', slot: 'card', name: 'Cartes en or', price: 220, cls: 'theme-or', min: 8 },

  { id: 'gel', slot: 'freeze', name: 'Gel de série', price: 50, emoji: '🧊', desc: 'Protects your streak if you miss a day. Hold up to 2.' },
];

export const SLOT_NAMES = { hat: 'Chapeaux', face: 'Visage', held: 'Accessoires', bg: 'Fonds', card: 'Cartes', freeze: 'Bonus' };

export const ANIMALS = ['🦊', '🐼', '🐱', '🐶', '🐸', '🐰', '🐨', '🦁', '🐯', '🐵', '🐧', '🦉', '🐷', '🐮', '🦄', '🐲', '🐻', '🐹', '🐙', '🦖'];

// ---------- trophies ----------
// test(prog, ctx) → true when earned. ctx: { level, now, hour, date }.

export const ACHIEVEMENTS = [
  { id: 'premier', emoji: '👣', name: 'Premier pas', desc: 'Review your first card', reward: 5, test: p => p.stats.reviews >= 1 },
  { id: 'mots5', emoji: '🌱', name: 'Petite graine', desc: 'Learn 5 words', reward: 10, test: p => p.stats.wordsLearned >= 5 },
  { id: 'mots15', emoji: '🌿', name: 'Ça pousse !', desc: 'Learn 15 words', reward: 20, test: p => p.stats.wordsLearned >= 15 },
  { id: 'mots30', emoji: '🌳', name: 'Grand arbre', desc: 'Learn 30 words', reward: 40, test: p => p.stats.wordsLearned >= 30 },
  { id: 'maitre5', emoji: '🧠', name: 'Mémoire d\'éléphant', desc: 'Master 5 cards (3+ week interval)', reward: 40, test: (p, c) => c.mastered >= 5 },
  { id: 'rev100', emoji: '💯', name: 'Cent !', desc: 'Answer 100 cards', reward: 20, test: p => p.stats.reviews >= 100 },
  { id: 'rev500', emoji: '📚', name: 'Polyglotte', desc: 'Answer 500 cards', reward: 50, test: p => p.stats.reviews >= 500 },
  { id: 'serie3', emoji: '🔥', name: 'Ça chauffe', desc: '3-day streak', reward: 15, test: p => p.streak.best >= 3 },
  { id: 'serie7', emoji: '🗓️', name: 'Une semaine !', desc: '7-day streak', reward: 30, test: p => p.streak.best >= 7 },
  { id: 'serie14', emoji: '🌋', name: 'Volcan', desc: '14-day streak', reward: 50, test: p => p.streak.best >= 14 },
  { id: 'serie30', emoji: '🏅', name: 'Un mois entier', desc: '30-day streak', reward: 100, test: p => p.streak.best >= 30 },
  { id: 'combo10', emoji: '⚡', name: 'En feu', desc: '10 right answers in a row', reward: 15, test: p => p.stats.bestCombo >= 10 },
  { id: 'combo25', emoji: '🌠', name: 'Inarrêtable', desc: '25 right answers in a row', reward: 40, test: p => p.stats.bestCombo >= 25 },
  { id: 'parfait', emoji: '✨', name: 'Sans faute', desc: 'A perfect session (10+ cards, no mistakes)', reward: 25, test: p => p.stats.perfect >= 1 },
  { id: 'accents', emoji: '🎯', name: 'Accent parfait', desc: 'Type 10 words with accents perfectly', reward: 25, test: p => p.stats.accentOk >= 10 },
  { id: 'niveau5', emoji: '⭐', name: 'Niveau 5', desc: 'Reach level 5', reward: 25, test: (p, c) => c.level >= 5 },
  { id: 'niveau10', emoji: '🌟', name: 'Niveau 10', desc: 'Reach level 10', reward: 50, test: (p, c) => c.level >= 10 },
  { id: 'tour', emoji: '🚴', name: 'Tour de France', desc: 'Visit all 25 stops', reward: 150, test: (p, c) => c.level >= 25 },
  { id: 'memoire', emoji: '🃏', name: 'As des paires', desc: 'Finish Memory in under 45 seconds', reward: 20, test: p => p.stats.memoryBest !== null && p.stats.memoryBest < 45 },
  { id: 'rapide', emoji: '⏱️', name: 'Éclair', desc: 'Score 15+ in Course Rapide', reward: 20, test: p => p.stats.speedBest >= 15 },
  { id: 'escargot', emoji: '🐌', name: 'Sauveur d\'escargots', desc: 'Save 5 snails', reward: 20, test: p => p.stats.penduWins >= 5 },
  { id: 'duel', emoji: '🤺', name: 'En garde !', desc: 'Win a duel', reward: 15, test: p => p.stats.duelWins >= 1 },
  { id: 'shopping', emoji: '🛍️', name: 'Shopping à Paris', desc: 'Buy something in the boutique', reward: 10, test: p => p.stats.shopBuys >= 1 },
  // Secrets: hidden until found.
  { id: 'ouioui', emoji: '🥖', name: 'Oui oui, baguette', desc: 'Tap Monsieur Croissant 7 times', reward: 15, secret: true, test: p => p.stats.mascotTaps >= 7 },
  { id: 'hibou', emoji: '🦉', name: 'Hibou de nuit', desc: 'Study after 9pm', reward: 10, secret: true, test: (p, c) => c.studied && c.hour >= 21 },
  { id: 'leveTot', emoji: '🐓', name: 'Lève-tôt', desc: 'Study before 7:30am', reward: 10, secret: true, test: (p, c) => c.studied && (c.hour < 7 || (c.hour === 7 && c.minute < 30)) && c.hour >= 4 },
  { id: 'bastille', emoji: '🎆', name: 'Quatorze juillet', desc: 'Study on Bastille Day (July 14)', reward: 30, secret: true, test: (p, c) => c.studied && c.month === 7 && c.day === 14 },
];

// ---------- things Monsieur Croissant says ----------

export const PRAISE = [
  ['Bravo !', 'Well done!'], ['Très bien !', 'Very good!'], ['Magnifique !', 'Magnificent!'],
  ['Super !', 'Super!'], ['Parfait !', 'Perfect!'], ['Génial !', 'Awesome!'], ['Formidable !', 'Terrific!'],
  ['Trop fort !', 'So good!'], ['Bien joué !', 'Nicely played!'], ['Ooh là là !', 'Wow!'],
  ['Chapeau !', 'Hats off!'], ['Incroyable !', 'Incredible!'], ['Tu es un génie !', 'You\'re a genius!'],
];

export const COMFORT = [
  ['Pas grave !', 'No big deal!'], ['Oups !', 'Oops!'], ['Courage !', 'Keep going!'],
  ['On continue !', 'Let\'s keep going!'], ['Tu vas l\'avoir !', 'You\'ll get it!'], ['Zut alors !', 'Oh, darn!'],
];

export const COMBO_WORDS = [
  [3, 'Ça chauffe !', 'Heating up!'], [5, 'En feu !', 'On fire!'], [10, 'Incroyable !', 'Incredible!'],
  [15, 'Inarrêtable !', 'Unstoppable!'], [25, 'LÉGENDAIRE !', 'LEGENDARY!'],
];

export const MASCOT_TAPS = [
  'Hé ! Ça chatouille ! (That tickles!)', 'Je suis un croissant, pas un bouton ! (I\'m a croissant, not a button!)',
  'Arrête ! (Stop it!)', 'Oh là là…', 'Encore ?! (Again?!)', 'Bon, d\'accord… (Okay, fine…)',
  'OUI OUI, BAGUETTE ! 🥖',
];

export const FUN_FACTS = [
  'About 300 million people around the world speak French.',
  'French is spoken on five continents, from Canada to Senegal to Tahiti.',
  'English borrowed thousands of words from French: menu, ballet, restaurant, garage, déjà vu…',
  'French people eat millions of snails (escargots) every year, usually with garlic butter.',
  'In France, April Fools\' Day is "Poisson d\'avril" — kids sneak paper fish onto people\'s backs!',
  'By French law, a "baguette de tradition" can only be made from flour, water, salt and yeast.',
  'The French say "Bon appétit !" before eating, and "Santé !" when they clink glasses.',
  'In French, "un pamplemousse" means a grapefruit. Say it out loud — it\'s fun!',
  'French kids often have Wednesday afternoons off school.',
  'The French word for "weekend" is… "le weekend".',
  'French people greet friends with "la bise" — a kiss on each cheek.',
  'The longest common French word is "anticonstitutionnellement" (25 letters).',
  'In French, a ladybug is "une coccinelle", and a pineapple is "un ananas".',
  'Instead of "raining cats and dogs", the French say "il pleut des cordes" — it\'s raining ropes!',
];

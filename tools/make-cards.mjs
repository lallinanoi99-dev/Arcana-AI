// Builds cards.json (all 78 cards with meanings) and the minimal line-art deck in cards/ (our own drawings).
// Card ids match the contract: 0–21 Major Arcana, then Wands, Cups, Swords, Pentacles (Ace…10, Page, Knight, Queen, King).
// Usage (from the project root): node tools/make-cards.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// [name, upright keywords, upright meaning, reversed keywords, reversed meaning]
const MAJORS = [
  ['The Fool', 'beginnings, openness, a leap of faith', 'A fresh start is calling. Curiosity and trust matter more right now than having the whole plan.', 'hesitation, recklessness, holding back', 'Either a leap is being taken without looking, or fear is keeping you at the edge. Look before you jump, then let yourself move.'],
  ['The Magician', 'skill, focus, resourcefulness', 'You already hold the tools you need. Focused intention can turn an idea into something real.', 'scattered energy, untapped talent, mixed motives', 'Your talents are there but unfocused, or being used half-heartedly. Gather your attention back to one clear aim.'],
  ['The High Priestess', 'intuition, inner knowing, stillness', 'The answer is quieter than you think. Slow down and listen to what you already sense.', 'second-guessing, noise, ignored instincts', 'Outside opinions may be drowning out your own inner voice. Make space for silence before deciding.'],
  ['The Empress', 'nurture, abundance, creativity', 'Growth comes through care. Tend to what you love, including yourself, and let it flourish at its own pace.', 'depletion, over-giving, creative block', 'You may be pouring out more than you take in. Rest and self-care will refill the well.'],
  ['The Emperor', 'structure, stability, leadership', 'Clear boundaries and a steady plan create the safety for good things to grow.', 'rigidity, control, shaky foundations', 'Structure has become either too tight or too loose. Look at where firmness helps and where it is only control.'],
  ['The Hierophant', 'tradition, learning, shared values', 'There is wisdom in what has been tested over time. A mentor, a practice or a community can guide you.', 'questioning rules, your own path, unconventional', 'An old rule may no longer fit you. It is okay to honour what you learned while choosing your own way.'],
  ['The Lovers', 'connection, alignment, meaningful choice', 'A choice rooted in your values, or a bond built on honesty, is highlighted. Choose with your whole heart.', 'misalignment, imbalance, avoided choices', 'Something feels out of sync between what you want and what you are doing. Honest conversation helps realign.'],
  ['The Chariot', 'drive, willpower, momentum', 'Determination moves you forward. Hold the reins on competing pulls and steer towards your goal.', 'lost direction, pushing too hard, stalled', 'Momentum has slipped or you are forcing it. Pause to choose one direction before pressing on.'],
  ['Strength', 'courage, gentleness, patience', 'Real strength here is soft: patience, compassion and a calm heart tame what feels wild.', 'self-doubt, low energy, harshness', 'You may be doubting your own resilience. Gentleness towards yourself brings your courage back.'],
  ['The Hermit', 'reflection, solitude, inner guidance', 'Step back from the noise. Time alone with your thoughts lights the next step.', 'isolation, withdrawal, avoiding reflection', 'Solitude may have turned into hiding, or you are too busy to reflect. Find a healthy balance between the two.'],
  ['Wheel of Fortune', 'cycles, change, turning points', 'Life is turning. What goes around comes around, so stay flexible and ride the change.', 'resistance to change, a rough patch, repeating loops', 'A cycle seems stuck or keeps repeating. Notice the pattern so you can step out of it.'],
  ['Justice', 'fairness, truth, cause and effect', 'Honest choices bring balanced results. Look at the facts clearly and act with integrity.', 'unfairness, avoiding accountability, bias', 'Something feels out of balance. Owning your part, and asking others to own theirs, clears the air.'],
  ['The Hanged Man', 'pause, surrender, new perspective', 'A pause is not wasted time. Seeing the situation from a new angle changes everything.', 'stalling, resistance, needless sacrifice', 'You may be stuck in limbo or giving up too much. Decide whether to let go or to move.'],
  ['Death', 'endings, transformation, transition', 'A chapter is closing to make room for something new. This card is about change, not literal loss.', 'resisting change, lingering, slow transition', 'Something is ready to end but is being held onto. Letting go gently opens the next door.'],
  ['Temperance', 'balance, moderation, patience', 'Blend opposites with care. A steady, measured approach brings harmony.', 'excess, imbalance, impatience', 'Things are tipping too far one way. Small adjustments restore your middle ground.'],
  ['The Devil', 'attachment, temptation, habits', 'Notice what has a hold on you, from habits to fears to old stories. Naming it is the first step to freedom.', 'release, breaking free, reclaiming power', 'Chains are loosening. You are seeing a pattern clearly and choosing to step out of it.'],
  ['The Tower', 'sudden change, revelation, clearing', 'Something built on shaky ground is being shaken up. It can feel jolting, but it clears space for truth.', 'avoiding upheaval, delayed change, inner shift', 'A shake-up is being resisted or is happening quietly inside. Facing it gently is easier than bracing against it.'],
  ['The Star', 'hope, renewal, calm', 'After a storm comes healing. Trust that things can get better, and let yourself feel hopeful.', 'discouragement, lost faith, disconnection', 'Hope feels far away right now. Small acts of self-kindness reconnect you to it.'],
  ['The Moon', 'uncertainty, dreams, intuition', 'Not everything is clear yet. Move carefully, trust your instincts and let the fog lift in its own time.', 'clarity returning, released fears, truth surfacing', 'Confusion is starting to clear. What felt scary in the dark looks smaller in the light.'],
  ['The Sun', 'joy, clarity, warmth', 'Warmth and optimism shine here. Let yourself enjoy what is going well and share it.', 'dimmed joy, temporary clouds, overconfidence', 'The light is still there, just partly hidden. Look for small joys while the clouds pass.'],
  ['Judgement', 'awakening, reflection, a calling', 'It is time to take stock and answer a deeper call. Learn from the past and rise into who you are becoming.', 'self-criticism, doubt, ignoring the call', 'You may be judging yourself too harshly. Forgive the past so you can hear what is next.'],
  ['The World', 'completion, wholeness, achievement', 'A cycle comes full circle. Celebrate how far you have come before the next journey begins.', 'loose ends, almost there, seeking closure', 'You are close to completion, but something is unfinished. Tie up loose ends to feel whole.'],
];

const SUITS = [
  { key: 'wands', name: 'Wands', element: 'fire' },
  { key: 'cups', name: 'Cups', element: 'water' },
  { key: 'swords', name: 'Swords', element: 'air' },
  { key: 'pentacles', name: 'Pentacles', element: 'earth' },
];
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];

// Per suit, per rank: [upright keywords, upright meaning, reversed keywords, reversed meaning]
const MINORS = {
  wands: [
    ['inspiration, spark, potential', 'A spark of inspiration arrives. Act on the idea while the energy is fresh.', 'delays, lack of direction, fizzling', 'The spark is there but struggling to catch. Clear away distractions and protect your enthusiasm.'],
    ['planning, future vision, decisions', 'You can see the bigger picture. Plan your next move and choose where to direct your energy.', 'fear of the unknown, playing safe', 'Staying comfortable feels safer than stepping out. Ask what a small brave step would look like.'],
    ['expansion, foresight, progress', 'Your efforts are starting to pay off. Look ahead; new horizons are opening.', 'setbacks, frustration, short-sightedness', 'Progress is slower than hoped. Adjust your expectations, not your dream.'],
    ['celebration, home, milestones', 'A moment to celebrate stability, community and how far you have come.', 'unsettled, transition, missing harmony', 'Home or belonging feels a bit unsettled. Reach out to the people who feel like home.'],
    ['competition, friction, different views', 'Ideas are clashing. Healthy friction can sharpen everyone if you keep it fair.', 'avoiding conflict, finding common ground', 'Tension is easing, or being avoided. Look for the shared goal beneath the disagreement.'],
    ['recognition, success, confidence', 'You are being seen for your efforts. Enjoy the win and let it boost your confidence.', 'self-doubt, needing approval, private victory', 'You may be waiting for applause that is not coming. Recognise your own progress.'],
    ['standing firm, perseverance, defence', 'Stand up for what matters to you. Your position is stronger than it feels.', 'overwhelm, giving in, exhaustion', 'Defending everything is wearing you out. Choose which battles truly matter.'],
    ['speed, movement, quick progress', 'Things are moving fast. Messages, momentum and opportunities arrive quickly.', 'waiting, frustration, slowing down', 'The pace has stalled. Use the pause to prepare rather than push.'],
    ['resilience, persistence, last stretch', 'You are tired but nearly there. Draw on your resilience for one more push.', 'burnout, defensiveness, needing rest', 'Your guard has been up for too long. Rest is part of resilience too.'],
    ['burden, responsibility, carrying a lot', 'You are carrying a lot. Notice what you could share, delegate or set down.', 'letting go, releasing weight, delegating', 'You are beginning to put some weight down. Keep asking what is truly yours to carry.'],
    ['curiosity, enthusiasm, exploration', 'A playful, curious energy invites you to explore something new.', 'scattered ideas, impatience, false starts', 'Lots of ideas, little follow-through. Pick one and nurture it.'],
    ['adventure, passion, bold action', 'Bold, energetic action carries you forward. Chase what excites you.', 'impulsiveness, haste, scattered energy', 'Rushing ahead may cause stumbles. Keep the fire, add a little aim.'],
    ['confidence, warmth, determination', 'Lead with warmth and self-belief. Your confidence inspires others.', 'self-doubt, jealousy, dimmed light', 'You are hiding your light. Remember what you bring to the room.'],
    ['vision, leadership, entrepreneurial spirit', 'Take the lead with a big-picture vision and the courage to make it real.', 'impatience, high expectations, domineering', 'Big plans may be outpacing others. Bring people with you rather than pushing ahead alone.'],
  ],
  cups: [
    ['new feelings, love, compassion', 'Your heart is opening. New feelings, kindness or creativity are flowing in.', 'blocked emotions, self-love needed', 'Feelings may be held back. Start by offering yourself the kindness you give others.'],
    ['partnership, mutual respect, connection', 'A balanced connection forms, built on mutual care and respect.', 'imbalance, misunderstanding, distance', 'Something feels uneven in a connection. An honest, gentle talk can rebalance it.'],
    ['friendship, celebration, community', 'Time with friends and community lifts you. Celebrate together.', 'overindulgence, gossip, feeling left out', 'Social energy feels off. Find the people who genuinely nourish you.'],
    ['contemplation, apathy, reevaluation', 'You may be missing an offer while lost in thought. Look up and notice what is being held out to you.', 'new motivation, seizing opportunity', 'You are coming out of a slump and ready to say yes again.'],
    ['disappointment, regret, grief', 'It is natural to feel loss. Gently notice the cups still standing behind you.', 'acceptance, moving on, healing', 'You are starting to make peace with what happened and turn towards what remains.'],
    ['nostalgia, memories, innocence', 'Sweet memories or simple kindness bring comfort. Let the past warm, not hold, you.', 'living in the past, moving forward', 'Looking back too much keeps you from now. Carry the lessons, leave the longing.'],
    ['choices, imagination, wishful thinking', 'Many options shimmer. Not all are real; ground your dreams in what is possible.', 'clarity, decision, focus', 'The fog of options clears. You know which cup is truly yours.'],
    ['walking away, seeking more, letting go', 'Leaving something behind to search for deeper meaning takes courage.', 'fear of change, staying stuck, aimless', 'You sense it is time to move on but feel unsure. Small steps make leaving easier.'],
    ['contentment, gratitude, wishes', 'A sense of satisfaction is near. Appreciate what you have.', 'inner happiness, materialism, unmet wishes', 'Outer wishes have not brought what you hoped. Look for contentment within.'],
    ['harmony, family, emotional fulfilment', 'Deep emotional harmony and a sense of home are highlighted.', 'disconnection, misaligned values, strain', 'Home or relationships feel strained. Reconnect with shared values.'],
    ['creative ideas, intuitive messages, sensitivity', 'A gentle message or creative idea arrives. Stay open and playful.', 'emotional immaturity, creative blocks', 'Feelings are spilling out sideways. Give them a creative outlet.'],
    ['romance, charm, following the heart', 'Follow your heart with grace. An invitation or offer may arrive.', 'moodiness, unrealistic ideals', 'Idealism may be clouding reality. Keep your heart open and your eyes open too.'],
    ['empathy, care, emotional security', 'Lead with compassion and calm. Your intuition is a strength.', 'codependence, emotional overwhelm', 'Caring for everyone has drained you. Tend your own emotional needs.'],
    ['emotional balance, diplomacy, calm', 'Stay steady and kind while emotions run high around you.', 'emotional manipulation, moodiness, coldness', 'Calm has turned into holding everything in. Let some feeling out, safely.'],
  ],
  swords: [
    ['clarity, breakthrough, truth', 'A clear thought cuts through confusion. Speak your truth plainly.', 'confusion, miscommunication, clouded judgement', 'Thoughts feel tangled. Slow down before you speak or decide.'],
    ['difficult choice, stalemate, avoidance', 'You are holding a decision at arm’s length. Removing the blindfold helps.', 'information overload, confusion, indecision', 'Too much input is paralysing. Pick the one thing you know for sure.'],
    ['heartbreak, sorrow, painful truth', 'A painful truth hurts. Acknowledging it is the first step to healing.', 'recovery, forgiveness, releasing pain', 'The sting is fading. You are learning to release what hurt.'],
    ['rest, recovery, contemplation', 'Pause and recover. Quiet time restores your mind.', 'restlessness, burnout, slowly reawakening', 'You have been running on empty, or you are ready to re-engage after rest.'],
    ['conflict, winning at a cost, tension', 'A conflict may be won but at what price? Consider what really matters.', 'reconciliation, making amends', 'The dust is settling. There is a chance to make peace.'],
    ['transition, moving on, calmer waters', 'You are leaving rough waters for calmer ones. Change brings relief.', 'unfinished business, resistance to moving on', 'Part of you is still on the old shore. Gently let it come along.'],
    ['strategy, discretion, going it alone', 'Think strategically, and be honest with yourself about your methods.', 'coming clean, rethinking an approach', 'A hidden plan or secret is surfacing. Honesty lightens the load.'],
    ['feeling trapped, limiting beliefs, restriction', 'You may feel boxed in, but the ties are looser than they seem.', 'freedom, new perspective, self-acceptance', 'You are seeing a way out and releasing a limiting story.'],
    ['worry, anxiety, sleepless thoughts', 'Worries loom large, especially at night. Share them; they often shrink in daylight.', 'hope, reaching out, easing fears', 'The worst of the worry is passing. Reaching out helps.'],
    ['endings, hitting bottom, release', 'A difficult phase reaches its end. From here, the only way is up.', 'recovery, regeneration, resisting an ending', 'You are rising again, slowly. Let the old story finish.'],
    ['curiosity, new ideas, eagerness to learn', 'A sharp, curious mind asks questions and seeks truth.', 'hasty words, all talk, scattered thinking', 'Lots of talk, little follow-through. Check facts before sharing.'],
    ['ambition, fast action, determination', 'You are charging forward with ideas and drive.', 'restlessness, impulsiveness, burnout', 'Rushing ahead without a plan scatters your force. Aim first.'],
    ['clear boundaries, honesty, independence', 'Be direct and fair. Clear boundaries protect your heart.', 'coldness, bitterness, over-critical', 'Sharp words may be guarding a soft heart. Let some warmth in.'],
    ['clarity, authority, intellectual power', 'Make decisions with reason, integrity and clear thinking.', 'harshness, misused authority, cold logic', 'Logic without compassion can wound. Balance head and heart.'],
  ],
  pentacles: [
    ['new opportunity, prosperity, a seed', 'A practical opportunity appears. Plant the seed and tend it patiently.', 'missed chance, poor planning, scarcity mindset', 'An opportunity may need better groundwork. Plan before you plant.'],
    ['balance, adaptability, juggling', 'You are juggling priorities. Stay flexible and keep things in balance.', 'overwhelm, disorganisation, overcommitted', 'Too many balls are in the air. Put one down.'],
    ['teamwork, collaboration, learning', 'Working with others brings out your best. Share skills and build together.', 'disharmony, misalignment, working alone', 'Teamwork has slipped. Clarify roles and goals.'],
    ['security, saving, holding on', 'Stability matters, but notice if holding on tightly is limiting you.', 'generosity, letting go, over-spending', 'Loosening your grip feels freeing, so long as it stays balanced.'],
    ['hardship, feeling left out, seeking support', 'Times feel lean. Help is closer than you think; let yourself ask.', 'recovery, support arriving', 'The hard stretch is easing. Accept the help being offered.'],
    ['generosity, giving and receiving', 'Balance giving and receiving. Kindness flows both ways.', 'strings attached, imbalance', 'Generosity has become uneven. Check whether giving feels fair.'],
    ['patience, long-term view, investment of effort', 'Your efforts are growing slowly. Patience will reward you.', 'impatience, limited results, rethinking effort', 'Progress feels slow. Consider whether your effort is going to the right place.'],
    ['craft, dedication, skill-building', 'Steady practice builds mastery. Keep refining your craft.', 'perfectionism, lack of focus, burnout', 'Perfectionism is slowing you. Good is often good enough.'],
    ['independence, self-sufficiency, reward', 'You have built something to be proud of. Enjoy the fruits of your work.', 'over-working, dependence, self-worth', 'Make sure your worth does not hinge only on what you produce.'],
    ['legacy, family, long-term stability', 'Lasting foundations and shared traditions bring security.', 'disrupted plans, family tension', 'Long-term plans or family ties need attention.'],
    ['learning, ambition, practical plans', 'A curious, studious energy wants to build skills step by step.', 'procrastination, lack of progress', 'Plans are stuck in daydreams. Take one small practical step.'],
    ['reliability, routine, hard work', 'Slow and steady wins. Consistent effort builds results.', 'boredom, stagnation, perfectionism', 'Routine has become a rut. Add a little variety.'],
    ['nurturing, practicality, comfort', 'Create comfort and stability for yourself and others.', 'self-neglect, work–life imbalance', 'You care for everyone but yourself. Turn that care inward.'],
    ['abundance, security, steady leadership', 'Grounded, generous leadership creates lasting security.', 'over-focus on status, stubbornness', 'Security has become rigidity. Remember what all the building is for.'],
  ],
};

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const RANK_MARK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'P', 'Kn', 'Q', 'K'];
const kw = (s) => s.split(',').map((w) => w.trim());

const cards = [];
MAJORS.forEach(([name, up, upM, rev, revM], i) => {
  cards.push({
    id: i, name, arcana: 'major', suit: null, number: i, element: 'spirit',
    upright: { keywords: kw(up), meaning: upM }, reversed: { keywords: kw(rev), meaning: revM },
    art: `cards/${String(i).padStart(2, '0')}.svg`,
  });
});
SUITS.forEach((suit, s) => {
  RANKS.forEach((rank, r) => {
    const id = 22 + s * 14 + r;
    const [up, upM, rev, revM] = MINORS[suit.key][r];
    cards.push({
      id, name: `${rank} of ${suit.name}`, arcana: 'minor', suit: suit.key, number: r + 1, element: suit.element,
      upright: { keywords: kw(up), meaning: upM }, reversed: { keywords: kw(rev), meaning: revM },
      art: `cards/${String(id).padStart(2, '0')}.svg`,
    });
  });
});

// ------------------------------------------------------------------
// Art: 240×400 cards, thin black line work, one lime accent, a soft element wash.
// ------------------------------------------------------------------
const INK = '#111111';
const LIME = '#D9F23F';
const WASH = { fire: '#FBEDE6', water: '#E8F1F7', air: '#EEF0F4', earth: '#EAF2E3', spirit: '#F4F8DC' };
const S = `stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`; // fill="none" comes from the wrapping <g>

const star = (cx, cy, r, points = 5, inner = 0.45, rot = -90) => {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = ((rot + (i * 180) / points) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};
const rays = (cx, cy, r1, r2, n, extra = '') => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return `<line x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + r2 * Math.cos(a)).toFixed(1)}" y2="${(cy + r2 * Math.sin(a)).toFixed(1)}" ${extra}/>`;
}).join('');

// One line drawing per Major Arcana card, centred around (120, 190).
const MAJOR_ART = [
  // 0 The Fool: sun, a figure with a bindle, the cliff edge
  `<circle cx="168" cy="122" r="16" fill="${LIME}" ${S}/><path d="M48 268 H138 L150 296" ${S}/><circle cx="104" cy="168" r="10" ${S}/><path d="M104 178 V220 M104 220 L92 262 M104 220 L120 258 M104 192 L84 206 M104 192 L134 172" ${S}/><circle cx="138" cy="166" r="7" ${S}/>`,
  // 1 The Magician: infinity, raised wand, the table
  `<path d="M120 128 C110 114 88 114 88 128 C88 142 110 142 120 128 C130 114 152 114 152 128 C152 142 130 142 120 128 Z" fill="${LIME}" ${S}/><path d="M120 156 V250" ${S}/><circle cx="120" cy="156" r="5" ${S}/><path d="M66 260 H174 M76 260 V292 M164 260 V292" ${S}/><circle cx="86" cy="250" r="5" ${S}/><path d="M146 246 h12 l-2 8 h-8 z" ${S}/>`,
  // 2 The High Priestess: two pillars, the moon, the veil
  `<rect x="62" y="120" width="20" height="160" ${S}/><rect x="158" y="120" width="20" height="160" ${S}/><circle cx="120" cy="150" r="20" fill="${LIME}" ${S}/><circle cx="130" cy="144" r="17" fill="#F4F8DC" stroke="none"/><path d="M82 200 Q120 230 158 200 M90 280 V232 Q120 248 150 232 V280" ${S}/>`,
  // 3 The Empress: the Venus mark with wheat
  `<circle cx="120" cy="168" r="30" fill="${LIME}" ${S}/><path d="M120 198 V266 M98 236 H142" ${S}/><path d="M66 280 V196 M66 210 l-10 -10 M66 226 l-10 -10 M66 242 l-10 -10 M174 280 V196 M174 210 l10 -10 M174 226 l10 -10 M174 242 l10 -10" ${S}/>`,
  // 4 The Emperor: a square throne, ram horns, the orb
  `<rect x="80" y="152" width="80" height="112" ${S}/><path d="M80 152 C64 140 70 120 86 126 M160 152 C176 140 170 120 154 126" ${S}/><circle cx="120" cy="198" r="16" fill="${LIME}" ${S}/><path d="M120 182 V170 M114 176 H126 M70 264 H170" ${S}/>`,
  // 5 The Hierophant: the triple cross and two crossed keys
  `<path d="M120 116 V284 M104 140 H136 M96 156 H144 M88 172 H152" ${S}/><circle cx="120" cy="112" r="8" fill="${LIME}" ${S}/><path d="M84 286 L112 246 M156 286 L128 246" ${S}/><circle cx="82" cy="290" r="6" ${S}/><circle cx="158" cy="290" r="6" ${S}/>`,
  // 6 The Lovers: two overlapping circles under a sun
  `<circle cx="100" cy="200" r="36" ${S}/><circle cx="140" cy="200" r="36" ${S}/><path d="M120 171 A36 36 0 0 1 120 229 A36 36 0 0 1 120 171 Z" fill="${LIME}" ${S}/><circle cx="120" cy="124" r="10" ${S}/>${rays(120, 124, 15, 24, 8, S)}`,
  // 7 The Chariot: canopy, star, two wheels
  `<path d="M74 150 Q120 126 166 150 M82 150 V232 H158 V150" ${S}/><polygon points="${star(120, 186, 18)}" fill="${LIME}" ${S}/><circle cx="90" cy="252" r="20" ${S}/><circle cx="150" cy="252" r="20" ${S}/><path d="M90 232 V272 M70 252 H110 M150 232 V272 M130 252 H170" ${S}/>`,
  // 8 Strength: the lion's mane and a calm infinity
  `<path d="M120 124 C112 114 96 114 96 124 C96 134 112 134 120 124 C128 114 144 114 144 124 C144 134 128 134 120 124 Z" ${S}/><circle cx="120" cy="208" r="30" fill="${LIME}" ${S}/>${rays(120, 208, 36, 54, 16, S)}<path d="M110 202 v2 M130 202 v2 M112 218 Q120 224 128 218" ${S}/>`,
  // 9 The Hermit: lantern with a star, the staff
  `<path d="M120 120 V136 M104 136 H136 L132 196 H108 Z" ${S}/><polygon points="${star(120, 166, 13, 6, 0.5)}" fill="${LIME}" ${S}/><path d="M104 196 Q120 206 136 196 M160 120 V290 M150 290 H170" ${S}/>`,
  // 10 Wheel of Fortune: eight spokes
  `<circle cx="120" cy="198" r="64" ${S}/><circle cx="120" cy="198" r="50" ${S}/>${rays(120, 198, 20, 50, 8, S)}<circle cx="120" cy="198" r="20" fill="${LIME}" ${S}/>`,
  // 11 Justice: the scales
  `<path d="M120 118 V284 M98 284 H142 M70 150 H170 M70 150 L56 200 M70 150 L84 200 M170 150 L156 200 M170 150 L184 200" ${S}/><path d="M52 200 Q70 222 88 200 Z" fill="${LIME}" ${S}/><path d="M152 200 Q170 222 188 200 Z" ${S}/><circle cx="120" cy="118" r="6" ${S}/>`,
  // 12 The Hanged Man: the tau cross, a figure upside down with a halo
  `<path d="M64 120 H176 M80 120 V292 M160 120 V292" ${S}/><path d="M120 120 V140 M120 140 L112 168 M120 140 L132 160 L118 176 M120 170 V214 M120 186 L104 204 M120 186 L136 204" ${S}/><circle cx="120" cy="232" r="22" fill="${LIME}" ${S}/><circle cx="120" cy="232" r="10" ${S}/>`,
  // 13 Death: a sunrise between two towers, a single rose
  `<path d="M52 248 H188" ${S}/><path d="M86 248 A34 34 0 0 1 154 248 Z" fill="${LIME}" ${S}/>${rays(120, 248, 44, 58, 16, S).split('/>').filter((l, i) => i >= 8 && i <= 16).map((l) => l + '/>').join('')}<path d="M60 248 V200 H74 V248 M166 248 V200 H180 V248" ${S}/><path d="M120 292 V262 M120 276 l10 -6" ${S}/><circle cx="120" cy="258" r="6" ${S}/>`,
  // 14 Temperance: two cups, water flowing between them, a triangle
  `<polygon points="120,118 136,146 104,146" fill="${LIME}" ${S}/><path d="M66 200 H102 L96 236 H72 Z M138 232 H174 L168 268 H144 Z" ${S}/><path d="M100 204 C120 204 136 216 148 232" ${S} stroke-dasharray="4 6"/><path d="M84 236 V256 M156 268 V288" ${S}/>`,
  // 15 The Devil: horns over an inverted star
  `<path d="M88 136 C80 116 92 104 104 112 M152 136 C160 116 148 104 136 112" ${S}/><circle cx="120" cy="196" r="52" ${S}/><polygon points="${star(120, 196, 46, 5, 0.38, 90)}" ${S}/><circle cx="120" cy="196" r="12" fill="${LIME}" ${S}/><path d="M86 272 Q120 292 154 272" ${S} stroke-dasharray="2 8"/>`,
  // 16 The Tower: the tower, its crown, a lightning bolt
  `<path d="M96 290 V160 H144 V290 M90 290 H150 M96 160 L90 146 H150 L144 160 M112 200 h16 v20 h-16 z M112 244 h16 v20 h-16 z" ${S}/><polygon points="168,110 140,170 160,170 134,226 182,156 160,156 186,110" fill="${LIME}" ${S}/>`,
  // 17 The Star: one great star, seven small, water below
  `<polygon points="${star(120, 176, 46, 8, 0.42)}" fill="${LIME}" ${S}/>${[[64, 128], [176, 128], [60, 200], [180, 204], [84, 244], [156, 246], [120, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${INK}"/>`).join('')}<path d="M56 272 Q72 262 88 272 T120 272 T152 272 T184 272 M64 290 Q80 280 96 290 T128 290 T160 290" ${S}/>`,
  // 18 The Moon: crescent, two towers, a winding path
  `<circle cx="120" cy="140" r="28" fill="${LIME}" ${S}/><circle cx="134" cy="132" r="24" fill="#F4F8DC" stroke="none"/><path d="M58 290 V204 H80 V290 M160 290 V204 H182 V290 M58 204 l11 -12 l11 12 M160 204 l11 -12 l11 12" ${S}/><path d="M120 292 C100 270 140 250 120 230 C106 216 128 204 120 192" ${S}/>`,
  // 19 The Sun: a full sun with sixteen rays
  `<circle cx="120" cy="196" r="34" fill="${LIME}" ${S}/>${rays(120, 196, 44, 70, 16, S)}`,
  // 20 Judgement: the trumpet and its call
  `<path d="M70 230 L152 148 L172 140 L164 160 L82 242 Z" fill="${LIME}" ${S}/><path d="M174 120 L190 104 M184 132 L204 128 M162 112 L166 92" ${S}/><path d="M60 290 Q90 268 120 290 Q150 268 180 290" ${S}/><path d="M152 148 L164 160" ${S}/>`,
  // 21 The World: the wreath, a dancer's circle, four corners
  `<ellipse cx="120" cy="200" rx="46" ry="74" ${S}/><ellipse cx="120" cy="200" rx="38" ry="66" ${S} stroke-dasharray="3 7"/><circle cx="120" cy="200" r="16" fill="${LIME}" ${S}/>${[[56, 122], [184, 122], [56, 282], [184, 282]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" ${S}/>`).join('')}`,
];

// Suit marks, drawn at (x, y) at scale k.
const SUIT_MARK = {
  wands: (x, y, k, fill) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 -22 V22" ${S}/><path d="M0 -14 q8 -6 8 -14 q-8 2 -8 14 z M0 -4 q-8 -6 -8 -14 q8 2 8 14 z" fill="${fill}" ${S}/></g>`,
  cups: (x, y, k, fill) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-13 -18 H13 Q13 2 0 4 Q-13 2 -13 -18 Z" fill="${fill}" ${S}/><path d="M0 4 V16 M-9 18 H9" ${S}/></g>`,
  swords: (x, y, k, fill) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 -26 L4 -20 V8 H-4 V-20 Z" fill="${fill}" ${S}/><path d="M-11 8 H11 M0 8 V18" ${S}/><circle cx="0" cy="21" r="3" ${S}/></g>`,
  pentacles: (x, y, k, fill) => `<g transform="translate(${x} ${y}) scale(${k})"><circle r="15" fill="${fill}" ${S}/><polygon points="${star(0, 0, 11, 5, 0.4)}" ${S}/></g>`,
};

// Pip positions for Two…Ten inside the 140×190 picture area centred on (120, 196).
const PIPS = {
  2: [[120, 142], [120, 250]],
  3: [[120, 132], [120, 196], [120, 260]],
  4: [[86, 142], [154, 142], [86, 250], [154, 250]],
  5: [[86, 142], [154, 142], [120, 196], [86, 250], [154, 250]],
  6: [[86, 136], [154, 136], [86, 196], [154, 196], [86, 256], [154, 256]],
  7: [[86, 136], [154, 136], [120, 166], [86, 196], [154, 196], [86, 256], [154, 256]],
  8: [[86, 132], [154, 132], [120, 160], [86, 196], [154, 196], [120, 232], [86, 260], [154, 260]],
  9: [[86, 128], [154, 128], [86, 174], [154, 174], [120, 196], [86, 218], [154, 218], [86, 264], [154, 264]],
  10: [[86, 126], [154, 126], [120, 150], [86, 174], [154, 174], [86, 218], [154, 218], [120, 242], [86, 266], [154, 266]],
};

// Court cards: the suit mark under a headpiece. Page a feather, Knight a helm, Queen and King crowns.
const COURT = [
  `<path d="M120 112 C140 124 140 150 120 166 C112 150 112 128 120 112 Z M120 166 V178" fill="${LIME}" ${S}/>`,
  `<path d="M94 170 V146 A26 26 0 0 1 146 146 V170 Z" fill="${LIME}" ${S}/><path d="M102 152 H138 M120 120 V108 Q130 104 136 110" ${S}/>`,
  `<path d="M90 170 V130 L105 150 L120 120 L135 150 L150 130 V170 Z" fill="${LIME}" ${S}/>`,
  `<path d="M86 170 V126 L98 148 L109 122 L120 146 L131 122 L142 148 L154 126 V170 Z" fill="${LIME}" ${S}/><path d="M86 160 H154" ${S}/>`,
];

function picture(card) {
  if (card.arcana === 'major') return MAJOR_ART[card.id];
  const mark = SUIT_MARK[card.suit];
  const n = card.number;
  if (n === 1) return `<circle cx="120" cy="196" r="48" fill="${LIME}" stroke="none" opacity=".55"/>${rays(120, 196, 56, 70, 12, S)}${mark(120, 196, 2.4, '#fff')}`;
  if (n <= 10) return PIPS[n].map(([x, y], i) => mark(x, y, 1, i === 0 ? LIME : '#fff')).join('');
  return COURT[n - 11] + mark(120, 236, 2, '#fff');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function svg(card) {
  const mark = card.arcana === 'major' ? ROMAN[card.id] : RANK_MARK[card.number - 1];
  const label = card.arcana === 'major' ? 'Major Arcana' : `${card.suit[0].toUpperCase()}${card.suit.slice(1)} · ${card.element}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400" width="240" height="400" role="img" aria-label="${esc(card.name)}">
<rect x="1" y="1" width="238" height="398" rx="18" fill="#FFFFFF" stroke="#ECECEA" stroke-width="2"/>
<rect x="16" y="16" width="208" height="368" rx="10" fill="none" stroke="${INK}" stroke-width="1.2"/>
<rect x="30" y="64" width="180" height="264" rx="90" fill="${WASH[card.element]}"/>
<g font-family="Inter, 'Helvetica Neue', Arial, sans-serif" fill="${INK}">
<text x="30" y="46" font-size="18" font-weight="500">${mark}</text>
<text x="210" y="46" font-size="10" text-anchor="end" fill="#8C8C88" letter-spacing=".6">${esc(label)}</text>
<text x="120" y="360" font-size="15" font-weight="500" text-anchor="middle">${esc(card.name)}</text>
</g>
<g fill="none">${picture(card)}</g>
</svg>
`;
}

const BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400" width="240" height="400" role="img" aria-label="Card back">
<rect width="240" height="400" rx="18" fill="#0E0E0E"/>
<rect x="16" y="16" width="208" height="368" rx="10" fill="none" stroke="#2A2A2A" stroke-width="1.2"/>
<g fill="none" stroke="${LIME}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<circle cx="120" cy="200" r="26"/><polygon points="${star(120, 200, 18, 4, 0.35)}" fill="${LIME}"/><path d="M120 158 V146 M120 242 V254 M78 200 H66 M162 200 H174"/>
</g>
</svg>
`;

mkdirSync(join(root, 'cards'), { recursive: true });
for (const card of cards) writeFileSync(join(root, card.art), svg(card));
writeFileSync(join(root, 'cards/back.svg'), BACK);
writeFileSync(join(root, 'cards.json'), JSON.stringify(cards, null, 1) + '\n');
console.log(`cards.json: ${cards.length} cards · ${cards.filter((c) => c.arcana === 'major').length} major · art in cards/`);

// Runs the compiled contract on an in-memory chain: draw → read, Daily Pull streaks, plus every rule in the PRD.
// Usage (from the project root): node tools/compile.mjs && node tools/test-contract.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, id as hash } from 'ethers';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abi, bytecode } = JSON.parse(readFileSync(join(root, 'build/ArcanAI.json'), 'utf8'));

// Start mid-day UTC so a few minutes of mining never crosses midnight by accident.
const DAY = 86400;
const start = new Date((Math.floor(Date.now() / 1000 / DAY) * DAY + DAY / 2) * 1000);
const provider = new BrowserProvider(ganache.provider({ logging: { quiet: true }, chain: { hardfork: 'merge', chainId: 677, time: start }, wallet: { totalAccounts: 4 } }));
const [seeker, friend, other] = await Promise.all([0, 1, 2].map((i) => provider.getSigner(i)));
// ganache under-estimates gas for some writes, so pin it
const GAS = { gasLimit: 1_000_000 };
const nextDay = async (days = 1) => { await provider.send('evm_increaseTime', [days * DAY]); await provider.send('evm_mine', []); };

const arcana = await (await new ContractFactory(abi, bytecode, seeker).deploy()).waitForDeployment();
const as = (signer) => arcana.connect(signer);
const events = (receipt) => receipt.logs.map((l) => arcana.interface.parseLog(l)).filter(Boolean);
const reverts = (call, name) => assert.rejects(call, (e) => e.revert?.name === name, `expected ${name}`);

const DAILY = 0, THREE = 1;
const Q = hash('What should I focus on this week?');

// --- empty state ----------------------------------------------------
assert.equal(await arcana.total(), 0n);
assert.equal(await arcana.DECK_SIZE(), 78n);
assert.deepEqual([...(await arcana.readingsOf(seeker.address))], []);
assert.equal(await arcana.streakOf(seeker.address), 0n);
await reverts(arcana.getReading(0), 'NotFound');

// --- validation -----------------------------------------------------
await reverts(as(seeker).draw.staticCall(THREE, '0x' + '00'.repeat(32)), 'EmptyQuestion');
await assert.rejects(as(seeker).draw.staticCall(2, Q), 'spread out of range must revert');

// --- three-card draw ------------------------------------------------
let r = await (await as(seeker).draw(THREE, Q, GAS)).wait();
console.log(`three-card draw gas: ${r.gasUsed}`);
let [ev] = events(r);
assert.equal(ev.name, 'Drawn');
assert.deepEqual([ev.args.id, ev.args.seeker, ev.args.spread], [0n, seeker.address, 1n]);

const r0 = await arcana.getReading(0);
assert.equal(r0.seeker, seeker.address);
assert.equal(r0.spread, 1n);
assert.equal(r0.count, 3n);
assert.equal(r0.questionHash, Q);
assert.ok(r0.toObject().at > 0n, "Result.at is Array.prototype.at, so read the field via toObject()");
assert.deepEqual([...r0.cards], [...ev.args.cards]);
assert.deepEqual([...r0.reversed], [...ev.args.reversed]);
assert.equal(await arcana.nonce(seeker.address), 1n);
assert.equal(await arcana.streakOf(seeker.address), 0n, 'three-card draws do not touch the streak');

// --- many draws: always distinct, always in the deck, both orientations show up ---
const seen = new Set();
let reversedCount = 0, slots = 0;
for (let i = 0; i < 40; i++) {
  const who = [seeker, friend, other][i % 3];
  const rec = await (await as(who).draw(THREE, Q, GAS)).wait();
  const { cards, reversed } = events(rec)[0].args;
  const picked = [...cards].map(Number);
  assert.equal(new Set(picked).size, 3, `cards must be distinct: ${picked}`);
  picked.forEach((c) => { assert.ok(c >= 0 && c < 78); seen.add(c); });
  reversed.forEach((f) => { slots++; if (f) reversedCount++; });
}
assert.ok(seen.size > 50, `draws should spread across the deck (saw ${seen.size} cards)`);
assert.ok(reversedCount > 20 && reversedCount < 100, `reversals should be roughly half (${reversedCount}/${slots})`);
assert.equal(await arcana.total(), 41n);

// --- daily pull: one card, once per UTC day, streaks -----------------
r = await (await as(friend).draw(DAILY, Q, GAS)).wait();
console.log(`daily draw gas: ${r.gasUsed}`);
let daily = await arcana.getReading(events(r)[0].args.id);
assert.equal(daily.count, 1n);
assert.equal(daily.spread, 0n);
assert.equal(daily.cards[1], 0n);
assert.equal(daily.cards[2], 0n);
assert.equal(daily.reversed[1], false);
assert.equal(await arcana.streakOf(friend.address), 1n);
await reverts(as(friend).draw.staticCall(DAILY, Q), 'AlreadyDrewToday');
await as(friend).draw.staticCall(THREE, Q); // three-card is still open

await nextDay();
assert.equal(await arcana.streakOf(friend.address), 1n, 'streak survives until a day is missed');
await (await as(friend).draw(DAILY, Q, GAS)).wait();
assert.equal(await arcana.streakOf(friend.address), 2n);
await nextDay();
await (await as(friend).draw(DAILY, Q, GAS)).wait();
assert.equal(await arcana.streakOf(friend.address), 3n);

await nextDay(2); // skipped a day
assert.equal(await arcana.streakOf(friend.address), 0n, 'missing a day shows 0');
await (await as(friend).draw(DAILY, Q, GAS)).wait();
assert.equal(await arcana.streakOf(friend.address), 1n, 'and the next pull starts over');
assert.equal(await arcana.streakOf(other.address), 0n);

// --- per-wallet history ---------------------------------------------
const mine = [...(await arcana.readingsOf(friend.address))].map(Number);
assert.equal(mine.length, 13 + 4); // 13 three-card + 4 daily
for (const id of mine) assert.equal((await arcana.getReading(id)).seeker, friend.address);
const total = Number(await arcana.total());
await reverts(arcana.getReading(total), 'NotFound');

// --- no admin, no payments ------------------------------------------
const names = arcana.interface.fragments.filter((f) => f.type === 'function').map((f) => f.name).sort();
assert.deepEqual(names, ['DECK_SIZE', 'draw', 'getReading', 'lastDailyDay', 'nonce', 'readings', 'readingsOf', 'streakOf', 'total']);
assert.ok(arcana.interface.fragments.every((f) => !f.payable), 'nothing is payable');

console.log('all contract tests passed');

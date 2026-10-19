// Checks that the ABI written into index.html matches the compiled contract, that cards.json matches the deck,
// then drives the frontend's exact read and write calls against an in-memory chain with BOT Chain's chain ID (677).
// Usage (from the project root): node tools/compile.mjs && node tools/check-frontend.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import { BrowserProvider, Contract, ContractFactory, Interface, hexlify, randomBytes, solidityPackedKeccak256 } from 'ethers';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const artifact = JSON.parse(readFileSync(join(root, 'build/ArcanAI.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(root, 'cards.json'), 'utf8'));

// 1) The deck: 78 cards, ids in contract order, every art file present, both orientations described.
assert.equal(cards.length, 78);
cards.forEach((c, i) => {
  assert.equal(c.id, i);
  assert.ok(existsSync(join(root, c.art)), `missing art ${c.art}`);
  for (const side of [c.upright, c.reversed]) assert.ok(side.meaning && side.keywords.length >= 2, `${c.name} needs meanings`);
});
assert.equal(cards[0].name, 'The Fool');
assert.equal(cards[21].name, 'The World');
assert.equal(cards[77].name, 'King of Pentacles');
assert.deepEqual([...new Set(cards.map((c) => c.element))].sort(), ['air', 'earth', 'fire', 'spirit', 'water']);
console.log('cards.json: 78 cards, art present');

// 2) Pull the ABI array out of index.html and evaluate it as plain JS.
const start = html.indexOf('const ABI = [');
assert.ok(start >= 0, 'ABI not found in index.html');
const tupleLine = html.match(/const READING_TUPLE = '[^']+';/)[0];
const ABI = new Function(`${tupleLine}\n${html.slice(start, html.indexOf('];', start) + 2)}\nreturn ABI;`)();

const site = new Interface(ABI);
const real = new Interface(artifact.abi);
for (const f of site.fragments) {
  const match = real.fragments.find((r) => r.type === f.type && r.format('minimal') === f.format('minimal'));
  assert.ok(match, `index.html ${f.type} does not match the contract: ${f.format('full')}`);
}
console.log(`ABI: ${site.fragments.length} fragments match the compiled contract`);

// 3) Run the site's calls on a chain.
const provider = new BrowserProvider(ganache.provider({ logging: { quiet: true }, chain: { hardfork: 'merge', chainId: 677 } }));
const [seeker, friend] = await Promise.all([provider.getSigner(0), provider.getSigner(1)]);
const GAS = { gasLimit: 1_000_000 };
const deployed = await (await new ContractFactory(real, artifact.bytecode, seeker).deploy()).waitForDeployment();
const address = await deployed.getAddress();
const asSeeker = new Contract(address, ABI, seeker);
const reader = new Contract(address, ABI, provider);

// draw, exactly like chainStore.draw: salted question hash, staticCall pre-check, parse the Drawn log
const salt = hexlify(randomBytes(32));
const questionHash = solidityPackedKeccak256(['bytes32', 'string'], [salt, 'What should I focus on this week?']);
await asSeeker.draw.staticCall(1, questionHash);
const receipt = await (await asSeeker.draw(1, questionHash, GAS)).wait();
const log = receipt.logs.map((l) => { try { return asSeeker.interface.parseLog(l); } catch { return null; } }).find((l) => l?.name === 'Drawn');
assert.equal(Number(log.args.id), 0);
assert.equal(Number(log.args.spread), 1);
const drawn = [...log.args.cards].slice(0, 3).map((c, i) => ({ id: Number(c), reversed: Boolean(log.args.reversed[i]) }));

// reads exactly as normReading does — the timestamp by index, because Result.at is Array.prototype.at
const r = await reader.getReading(0);
assert.equal(typeof r.at, 'function', 'Result.at shadows the field, so the site must read r[6]');
assert.ok(Number(r[6]) > 0);
assert.equal(Number(r.count), 3);
assert.equal(r.questionHash, questionHash);
assert.deepEqual([...r.cards].slice(0, Number(r.count)).map((c, i) => ({ id: Number(c), reversed: Boolean(r.reversed[i]) })), drawn);
drawn.forEach((c) => assert.ok(cards[c.id], 'drawn ids map to cards.json'));
assert.equal(Number(await reader.total()), 1);
assert.deepEqual([...(await reader.readingsOf(seeker.address))].map(Number), [0]);
await assert.rejects(reader.getReading(9), (e) => e.revert?.name === 'NotFound');

// daily pull and the "come back tomorrow" state, like chainStore.daily
const today = Math.floor(Number((await provider.getBlock('latest')).timestamp) / 86400);
const asFriend = new Contract(address, ABI, friend);
await (await asFriend.draw(0, questionHash, GAS)).wait();
assert.equal(Number(await reader.lastDailyDay(friend.address)), today);
assert.equal(Number(await reader.streakOf(friend.address)), 1);
await assert.rejects(asFriend.draw.staticCall(0, questionHash), (e) => e.revert?.name === 'AlreadyDrewToday');
const daily = await reader.getReading(1);
assert.equal(Number(daily.count), 1);

// the empty-question guard the site explains
await assert.rejects(asSeeker.draw.staticCall(1, '0x' + '00'.repeat(32)), (e) => e.revert?.name === 'EmptyQuestion');

console.log('frontend calls work against the compiled contract');

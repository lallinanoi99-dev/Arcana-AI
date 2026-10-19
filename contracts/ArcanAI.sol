// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ArcanAI — tarot cards shuffled and drawn on BOT Chain
/// @notice Each draw picks 1 or 3 distinct cards from a 78-card deck (0 The Fool … 77 King of Pentacles)
/// plus an upright/reversed flag per card. The question is never stored, only a hash of it.
/// Randomness mixes prevrandao, the previous block hash, the sender and a per-wallet nonce:
/// good enough for a reflection game, not for anything of value.
/// No tokens, no payments, no admin, no personal data.
contract ArcanAI {
    enum Spread { Daily, ThreeCard }

    struct Reading {
        address seeker;
        Spread spread;
        uint8[3] cards;
        bool[3] reversed;
        uint8 count;
        bytes32 questionHash;
        uint64 at;
    }

    uint8 public constant DECK_SIZE = 78;

    Reading[] public readings;
    mapping(address => uint256[]) private byWallet;
    mapping(address => uint256) public nonce;
    mapping(address => uint32) public lastDailyDay;
    mapping(address => uint32) private streak;

    event Drawn(uint256 indexed id, address indexed seeker, Spread spread, uint8[3] cards, bool[3] reversed);

    error EmptyQuestion();
    error AlreadyDrewToday();
    error NotFound();

    /// @notice Shuffle and draw. Daily is one card, once per wallet per UTC day, and builds a streak.
    function draw(Spread spread, bytes32 questionHash) external returns (uint256 id) {
        if (questionHash == bytes32(0)) revert EmptyQuestion();

        uint8 count = 3;
        if (spread == Spread.Daily) {
            count = 1;
            uint32 today = uint32(block.timestamp / 1 days);
            uint32 last = lastDailyDay[msg.sender];
            if (last == today) revert AlreadyDrewToday();
            streak[msg.sender] = last + 1 == today ? streak[msg.sender] + 1 : 1;
            lastDailyDay[msg.sender] = today;
        }

        bytes32 seed = keccak256(
            abi.encode(block.prevrandao, blockhash(block.number - 1), msg.sender, nonce[msg.sender]++, readings.length)
        );

        Reading memory r;
        r.seeker = msg.sender;
        r.spread = spread;
        r.count = count;
        r.questionHash = questionHash;
        r.at = uint64(block.timestamp);

        // Pick distinct cards: re-roll on a repeat (rare with at most 3 cards from 78).
        uint256 salt;
        for (uint8 i = 0; i < count; i++) {
            uint256 rnd;
            uint8 card;
            bool repeat;
            do {
                rnd = uint256(keccak256(abi.encode(seed, salt++)));
                card = uint8(rnd % DECK_SIZE);
                repeat = false;
                for (uint8 j = 0; j < i; j++) if (r.cards[j] == card) repeat = true;
            } while (repeat);
            r.cards[i] = card;
            r.reversed[i] = (rnd >> 128) & 1 == 1;
        }

        id = readings.length;
        readings.push(r);
        byWallet[msg.sender].push(id);
        emit Drawn(id, msg.sender, spread, r.cards, r.reversed);
    }

    function getReading(uint256 id) external view returns (Reading memory) {
        if (id >= readings.length) revert NotFound();
        return readings[id];
    }

    function readingsOf(address seeker) external view returns (uint256[] memory) {
        return byWallet[seeker];
    }

    /// @notice The live Daily Pull streak: still counts today if yesterday was drawn, 0 once a day is missed.
    function streakOf(address seeker) external view returns (uint32) {
        uint32 today = uint32(block.timestamp / 1 days);
        uint32 last = lastDailyDay[seeker];
        return last + 1 >= today ? streak[seeker] : 0;
    }

    function total() external view returns (uint256) {
        return readings.length;
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    userId;
    score;
    hand;
    constructor(userId, score = undefined, hand = undefined) {
        this.userId = userId;
        this.score = score;
        this.hand = hand;
    }
    toIO() {
        return {
            userId: this.userId,
            score: this.score,
            hand: this.hand === undefined ? undefined : this.hand.dominos.length
        };
    }
}
exports.Player = Player;
//# sourceMappingURL=player.js.map
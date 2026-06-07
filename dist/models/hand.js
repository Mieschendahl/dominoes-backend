"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hand = void 0;
const domino_1 = require("./domino");
class Hand {
    dominos;
    constructor(dominos = []) {
        this.dominos = dominos;
    }
    getPoints() {
        return this.dominos.reduce((sum, domino) => sum + domino.getPoints(), 0);
    }
    hasFinished() {
        return this.dominos.length === 0;
    }
    isEqual(hand) {
        if (this.dominos.length !== hand.dominos.length) {
            return false;
        }
        return this.dominos.every(domino => hand.dominos.some(_domino => _domino.isEqual(domino)));
    }
    contains(domino) {
        return this.dominos.some(domino_ => domino_.isEqual(domino));
    }
    toIO() {
        return {
            dominos: this.dominos.map(domino => domino.toIO())
        };
    }
    static fromIO(hand) {
        return new Hand(hand.dominos.map(domino => domino_1.Domino.fromIO(domino)));
    }
}
exports.Hand = Hand;
//# sourceMappingURL=hand.js.map
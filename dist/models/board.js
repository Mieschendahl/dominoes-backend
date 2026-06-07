"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Board = void 0;
const chain_1 = require("./chain");
class Board {
    leftChain;
    rightChain;
    constructor(leftChain = new chain_1.Chain(true), rightChain = new chain_1.Chain(false)) {
        this.leftChain = leftChain;
        this.rightChain = rightChain;
    }
    toIO() {
        return {
            leftChain: this.leftChain.toIO(),
            rightChain: this.rightChain.toIO(),
        };
    }
    canPlaceDomino(domino, placeLeft) {
        if (this.leftChain.isEmpty()) {
            return (this.leftChain.canPlaceDomino(domino) &&
                this.rightChain.canPlaceDomino(domino));
        }
        return placeLeft
            ? this.leftChain.canPlaceDomino(domino)
            : this.rightChain.canPlaceDomino(domino);
    }
    placeDomino(domino, placeLeft) {
        if (!this.canPlaceDomino(domino, placeLeft)) {
            return false;
        }
        let placed;
        if (this.leftChain.isEmpty()) {
            const leftDomino = this.leftChain.getPlaceableDomino(domino);
            const rightDomino = this.rightChain.getPlaceableDomino(domino);
            this.leftChain.dominoes.push(leftDomino);
            this.rightChain.dominoes.push(rightDomino);
            placed = true;
        }
        else {
            placed = placeLeft
                ? this.leftChain.placeDomino(domino)
                : this.rightChain.placeDomino(domino);
        }
        return placed;
    }
}
exports.Board = Board;
//# sourceMappingURL=board.js.map
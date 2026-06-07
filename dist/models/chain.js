"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chain = void 0;
class Chain {
    isLeft;
    dominoes;
    constructor(isLeft, dominoes = []) {
        this.isLeft = isLeft;
        this.dominoes = dominoes;
    }
    isEmpty() {
        return this.dominoes.length === 0;
    }
    getEnd() {
        return this.dominoes.at(-1);
    }
    toIO() {
        return this.dominoes.map(domino => domino.toIO());
    }
    getPlaceableDomino(domino) {
        if (this.isEmpty()) {
            return domino;
        }
        const end = this.getEnd();
        const pip = this.isLeft ? end.leftPip : end.rightPip;
        if (this.isLeft) {
            if (pip === domino.rightPip)
                return domino;
            if (pip === domino.leftPip)
                return domino.flip();
        }
        else {
            if (pip === domino.leftPip)
                return domino;
            if (pip === domino.rightPip)
                return domino.flip();
        }
        return undefined;
    }
    canPlaceDomino(domino) {
        return this.getPlaceableDomino(domino) !== undefined;
    }
    placeDomino(domino) {
        const placeableDomino = this.getPlaceableDomino(domino);
        if (!placeableDomino) {
            return false;
        }
        this.dominoes.push(placeableDomino);
        return true;
    }
}
exports.Chain = Chain;
//# sourceMappingURL=chain.js.map
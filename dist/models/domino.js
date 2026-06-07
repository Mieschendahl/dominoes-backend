"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Domino = void 0;
class Domino {
    leftPip;
    rightPip;
    constructor(leftPip, rightPip) {
        this.leftPip = leftPip;
        this.rightPip = rightPip;
    }
    isDouble() {
        return this.leftPip === this.rightPip;
    }
    flip() {
        return new Domino(this.rightPip, this.leftPip);
    }
    getPoints() {
        return this.leftPip + this.rightPip;
    }
    isEqual(domino) {
        return ((this.leftPip === domino.leftPip && this.rightPip === domino.rightPip)
            || (this.leftPip === domino.rightPip && this.rightPip === domino.leftPip));
    }
    toIO() {
        return {
            leftPip: this.leftPip,
            rightPip: this.rightPip
        };
    }
    hasMatch(pip) {
        return this.leftPip === pip || this.rightPip === pip;
    }
    toString() {
        return `[${this.leftPip}|${this.rightPip}]`;
    }
    static fromIO(domino) {
        return new Domino(domino.leftPip, domino.rightPip);
    }
}
exports.Domino = Domino;
//# sourceMappingURL=domino.js.map
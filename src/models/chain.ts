import { Domino } from "./domino";

export class Chain {
  constructor(
    public isLeft: boolean,
    public dominoes: Domino[] = []
  ) { }

  isEmpty(): boolean {
    return this.dominoes.length === 0;
  }

  getEnd(): Domino | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    return this.dominoes[this.dominoes.length - 1];
  }

  canPlace(domino: Domino, doPlace: boolean = true): boolean {
    const helper = (flipped: boolean = false) => {
      if (doPlace) {
        this.dominoes.push(flipped ? domino.flipCopy() : domino);
      }

      return true;
    };

    if (this.isEmpty()) {
      return helper();
    }

    const end = this.getEnd();
    const pip = this.isLeft ? end!.leftPip : end!.rightPip;

    if (this.isLeft) {
      if (pip === domino.rightPip) {
        return helper();
      }

      if (pip === domino.leftPip) {
        return helper(true);
      }
    } else {
      if (pip === domino.leftPip) {
        return helper();
      }

      if (pip === domino.rightPip) {
        return helper(true);
      }
    }

    return false;
  }
}
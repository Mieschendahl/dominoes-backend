import { ChainIO } from "../shared/socket-types";
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
    return this.dominoes.at(-1);
  }

  toIO(): ChainIO {
    return this.dominoes.map(domino => domino.toIO());
  }

  getPlaceableDomino(domino: Domino): Domino | undefined {
    if (this.isEmpty()) {
      return domino;
    }

    const end = this.getEnd()!;
    const pip = this.isLeft ? end.leftPip : end.rightPip;

    if (this.isLeft) {
      if (pip === domino.rightPip) return domino;
      if (pip === domino.leftPip) return domino.flip();
    } else {
      if (pip === domino.leftPip) return domino;
      if (pip === domino.rightPip) return domino.flip();
    }

    return undefined;
  }

  canPlaceDomino(domino: Domino): boolean {
    return this.getPlaceableDomino(domino) !== undefined;
  }

  placeDomino(domino: Domino): boolean {
    const placeableDomino = this.getPlaceableDomino(domino);

    if (!placeableDomino) {
      return false;
    }

    this.dominoes.push(placeableDomino);
    return true;
  }
}
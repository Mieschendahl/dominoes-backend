import { BoardIO } from "../shared/socket-types";
import { Chain } from "./chain";
import { Domino } from "./domino";

export class Board {
  constructor(
    public leftChain: Chain = new Chain(true),
    public rightChain: Chain = new Chain(false)
  ) { }

  toIO(): BoardIO {
    return {
      leftChain: this.leftChain.toIO(),
      rightChain: this.rightChain.toIO(),
    };
  }

  canPlaceDomino(domino: Domino, placeLeft: boolean): boolean {
    if (this.leftChain.isEmpty()) {
      return (
        this.leftChain.canPlaceDomino(domino) &&
        this.rightChain.canPlaceDomino(domino)
      );
    }

    return placeLeft
      ? this.leftChain.canPlaceDomino(domino)
      : this.rightChain.canPlaceDomino(domino);
  }

  placeDomino(domino: Domino, placeLeft: boolean): boolean {
    if (!this.canPlaceDomino(domino, placeLeft)) {
      return false;
    }

    let placed: boolean;

    if (this.leftChain.isEmpty()) {
      const leftDomino = this.leftChain.getPlaceableDomino(domino)!;
      const rightDomino = this.rightChain.getPlaceableDomino(domino)!;

      this.leftChain.dominoes.push(leftDomino);
      this.rightChain.dominoes.push(rightDomino);
      placed = true;
    } else {
      placed = placeLeft
        ? this.leftChain.placeDomino(domino)
        : this.rightChain.placeDomino(domino);
    }

    return placed;
  }
}
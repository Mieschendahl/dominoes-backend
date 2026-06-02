import { Chain } from "./chain";
import { Domino } from "./domino";

export class Board {
  constructor(
    public leftChain: Chain = new Chain(true),
    public rightChain: Chain = new Chain(false),
    public inventory: number[][] = Array.from({ length: 7 }, () => [])
  ) { }

  canPlace(
    domino: Domino,
    placeLeft: boolean,
    doPlace: boolean = false
  ): boolean {

    let result;

    if (this.leftChain.isEmpty()) {
      result =
        this.leftChain.canPlace(domino, doPlace)
        && this.rightChain.canPlace(domino, doPlace);
    } else {
      if (placeLeft) {
        result = this.leftChain.canPlace(domino, doPlace);
      } else {
        result = this.rightChain.canPlace(domino, doPlace);
      }
    }

    if (result && doPlace) {
      this.inventory[domino.leftPip].push(domino.rightPip);
      this.inventory[domino.rightPip].push(domino.leftPip);
    }

    return result;
  }

  isBlocked(): boolean {
    return this.inventory.some(ls => ls.length >= 6);
  }
}
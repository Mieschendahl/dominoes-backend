import { HandIO } from "../shared/socket-types";
import { Domino } from "./domino";

export class Hand {
  constructor(
    public dominos: Domino[] = []
  ) { }

  getPoints(): number {
    return this.dominos.reduce(
      (sum, domino) => sum + domino.getPoints(),
      0
    );
  }

  hasFinished(): boolean {
    return this.dominos.length === 0;
  }

  isEqual(hand: Hand): boolean {
    if (this.dominos.length !== hand.dominos.length) {
      return false;
    }
    return this.dominos.every(domino => hand.dominos.some(_domino => _domino.isEqual(domino)));
  }

  contains(domino: Domino): boolean {
    return this.dominos.some(domino_ => domino_.isEqual(domino));
  }

  toIO(): HandIO {
    return {
      dominos: this.dominos.map(domino => domino.toIO())
    };
  }

  static fromIO(hand: HandIO): Hand {
    return new Hand(hand.dominos.map(domino => Domino.fromIO(domino)));
  }
}
import { PlayerIO } from "../shared/socket-types";
import { Hand } from "./hand";

export class Player {
  constructor(
    public userId: string,
    public score: number | undefined = undefined,
    public hand: Hand | undefined = undefined
  ) { }

  toIO(): PlayerIO {
    return {
      userId: this.userId,
      score: this.score,
      hand: this.hand === undefined
        ? undefined
        : this.hand.dominos.length
    };
  }
}
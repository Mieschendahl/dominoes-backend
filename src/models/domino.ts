import { DominoIO } from "../shared/socket-types";

export class Domino {
  constructor(
    public leftPip: number,
    public rightPip: number
  ) { }

  isDouble(): boolean {
    return this.leftPip === this.rightPip;
  }

  flipCopy(): Domino {
    return new Domino(this.rightPip, this.leftPip);
  }

  getPoints(): number {
    return this.leftPip + this.rightPip;
  }

  isEqual(domino: Domino): boolean {
    return (
      (this.leftPip === domino.leftPip && this.rightPip === domino.rightPip)
      || (this.leftPip === domino.rightPip && this.rightPip === domino.leftPip)
    );
  }

  toIO(): DominoIO {
    return {
      leftPip: this.leftPip,
      rightPip: this.rightPip
    };
  }

  static fromIO(domino: DominoIO): Domino {
    return new Domino(domino.leftPip, domino.rightPip);
  }
}
import { DominoIO } from "../shared/socket-types";

export class Domino {
  constructor(
    public readonly leftPip: number,
    public readonly rightPip: number
  ) { }

  isDouble(): boolean {
    return this.leftPip === this.rightPip;
  }

  flip(): Domino {
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

  hasMatch(pip: number): boolean {
    return this.leftPip === pip || this.rightPip === pip;
  }

  toString(): string {
    return `[${this.leftPip}|${this.rightPip}]`;
  }

  static fromIO(domino: DominoIO): Domino {
    return new Domino(domino.leftPip, domino.rightPip);
  }
}

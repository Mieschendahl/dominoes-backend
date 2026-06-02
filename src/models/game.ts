import {
  GameIO,
  PlayerIO
} from "../shared/socket-types";

import { findMin, shuffle } from "../utils";

import { Board } from "./board";
import { Domino } from "./domino";
import { Hand } from "./hand";
import { Player } from "./player";

import { io } from "../server";
import { Room } from "../system/room";

export type GameState =
  | "started"
  | "playing"
  | "waiting"
  | "finished";

type RoundInfo = {
  count: number;
  startUserId: string;
  startType: "double" | "highest" | "winner";
  startDomino?: Domino;
  winnerUserId?: string;
  winType?: "finished" | "blocked";
  scoreDelta?: number;
};

export class Game {
  constructor(
    public room: Room,
    public gameState: GameState = "started",
    public players: Player[] = [],
    public pile: Domino[] | undefined = undefined,
    public activePlayerIndex: number | undefined = undefined,
    public roundData: RoundInfo | undefined = undefined,
    public board: Board | undefined = undefined
  ) { }

  private inState(...gameStates: GameState[]) {
    return gameStates.some(state => this.gameState === state);
  }

  private isPlayer(userId: string) {
    return this.players.some(player => player.userId === userId);
  }

  private getPlayer(userId: string): Player {
    return this.players.find(player => player.userId === userId)!;
  }

  private canPlace(player: Player): boolean {
    return player.hand!.dominos.some(domino =>
      [true, false].some(x => this.board!.canPlace(domino, x))
    );
  }

  private isActivePlayer(userId: string) {
    if (!this.inState("playing")) {
      return false;
    }

    return this.players[this.activePlayerIndex!].userId === userId;
  }

  private initPile() {
    this.pile = [];

    for (let leftPip = 0; leftPip <= 6; leftPip += 1) {
      for (let rightPip = leftPip; rightPip <= 6; rightPip += 1) {
        this.pile.push(new Domino(leftPip, rightPip));
      }
    }

    shuffle(this.pile);
  }

  private initPlayers(started: boolean = false) {
    this.players.forEach(player => {
      if (started) {
        player.score = 0;
      }
      player.hand = new Hand(this.pile!.splice(0, 7));
    });

    shuffle(this.players);
  }

  private isBetterStartingDomino(a: Domino, b: Domino) {
    const aIsDouble = a.isDouble();
    const bIsDouble = b.isDouble();

    if (aIsDouble && !bIsDouble) return true;
    if (!aIsDouble && bIsDouble) return false;

    return a.getPoints() > b.getPoints();
  }

  private initRoundData(started: boolean = false) {
    if (started) {
      this.roundData = {
        count: this.roundData!.count + 1,
        startUserId: this.roundData!.winnerUserId!,
        startType: "winner"
      };

      return;
    }

    let bestPlayer: Player | undefined = undefined;
    let bestDomino: Domino | undefined = undefined;

    this.players.forEach(player => {
      player.hand!.dominos.forEach(domino => {
        if (
          bestDomino == undefined
          || this.isBetterStartingDomino(domino, bestDomino)
        ) {
          bestDomino = domino;
          bestPlayer = player;
        }
      });
    });

    this.roundData = {
      count: 1,
      startUserId: bestPlayer!.userId,
      startType: bestDomino!.isDouble()
        ? "double"
        : "highest",
      startDomino: bestDomino!
    };
  }

  startGame(userId: string) {
    if (
      !this.inState("started")
      || !this.isPlayer(userId)
      || this.players.length < 2
    ) {
      return;
    }

    this.gameState = "playing";
    this.board = new Board();
    this.initPile();
    this.initPlayers(true);
    this.initRoundData(true);

    this.activePlayerIndex = this.players.findIndex(
      player => player.userId === this.roundData!.startUserId
    );

    io.to(this.room.roomKey()).emit(
      "setGame",
      this.toGameIO()
    );

    this.players.forEach(player =>
      io.to(this.room.userKey(player.userId)).emit(
        "setHand",
        player.hand!.toIO()
      )
    );
  }

  private advanceTurn(changeActivePlayer: boolean) {
    const activePlayer = this.players[this.activePlayerIndex!];

    if (
      activePlayer.hand!.hasFinished()
      || this.board!.isBlocked()
    ) {

      const startIndex = this.players.findIndex(
        player => player.userId === this.roundData!.startUserId
      );

      const players = this.players
        .slice(startIndex)
        .concat(this.players.slice(0, startIndex));

      const minPlayers = findMin(
        players,
        player => player.hand!.getPoints()
      );

      if (activePlayer.hand!.hasFinished()) {
        this.roundData!.winnerUserId = activePlayer.userId;
        this.roundData!.winType = "finished";
      } else {
        this.roundData!.winnerUserId = minPlayers[0].userId;
        this.roundData!.winType = "blocked";
      }

      this.roundData!.scoreDelta = players.reduce(
        (sum, player) =>
          player.userId === this.roundData!.winnerUserId
            ? 0
            : player.hand!.getPoints() + sum,
        0
      );

      this.gameState = "waiting";

      io.to(this.room.roomKey()).emit(
        "setGame",
        this.toGameIO()
      );

      return;
    }

    if (changeActivePlayer) {
      this.activePlayerIndex =
        (this.activePlayerIndex! + 1)
        % this.players.length;
    }

    io.to(this.room.roomKey()).emit(
      "setGame",
      this.toGameIO()
    );
  }

  advanceRound(userId: string) {
    if (
      !this.inState("waiting")
      || !this.isPlayer(userId)
    ) {
      return;
    }

    const winner = this.getPlayer(
      this.roundData!.winnerUserId!
    );

    winner.score! += this.roundData!.scoreDelta!;

    if (winner.score! > 100) {
      this.gameState = "finished";

      io.to(this.room.roomKey()).emit(
        "setGame",
        this.toGameIO()
      );

      return;
    }

    this.board = new Board();

    this.initPile();
    this.initPlayers();
    this.initRoundData();

    this.activePlayerIndex = this.players.findIndex(
      player => player.userId === this.roundData!.startUserId
    );

    this.gameState = "playing";

    io.to(this.room.roomKey()).emit(
      "setGame",
      this.toGameIO()
    );
  }

  finishGame(userId: string) {
    if (
      !this.inState("finished")
      || !this.isPlayer(userId)
    ) {
      return;
    }

    this.board = undefined;
    this.pile = [];

    this.players = this.players.map(
      player => new Player(player.userId)
    );

    this.roundData = undefined;
    this.activePlayerIndex = undefined;
    this.gameState = "started";

    io.to(this.room.roomKey()).emit(
      "setGame",
      this.toGameIO()
    );
  }

  placeDomino(
    userId: string,
    domino: Domino,
    placeLeft: boolean
  ) {

    if (
      !this.inState("playing")
      || !this.isActivePlayer(userId)
    ) {
      return;
    }

    const player = this.getPlayer(userId);

    const result = this.board!.canPlace(
      domino,
      placeLeft,
      true
    );

    if (result) {
      io.to(this.room.userKey(userId)).emit(
        "setHand",
        player.hand!.toIO()
      );

      this.advanceTurn(true);
    }
  }

  drawDomino(userId: string) {
    if (
      !this.inState("playing")
      || !this.isActivePlayer(userId)
    ) {
      return;
    }

    const player = this.getPlayer(userId);

    if (
      !this.canPlace(player)
      && this.pile!.length > 0
    ) {

      io.to(this.room.userKey(userId)).emit(
        "setHand",
        player.hand!.toIO()
      );

      this.advanceTurn(false);
    }
  }

  passTurn(userId: string) {
    if (
      !this.inState("playing")
      || !this.isActivePlayer(userId)
    ) {
      return;
    }

    if (
      !this.canPlace(this.getPlayer(userId))
      && this.pile!.length === 0
    ) {
      this.advanceTurn(true);
    }
  }

  setHand(userId: string, hand: Hand) {
    if (
      !this.inState("playing")
      || !this.isPlayer(userId)
    ) {
      return;
    }

    const player = this.getPlayer(userId);

    if (player.hand!.isEqual(hand)) {
      player.hand = hand;
    }
  }

  joinGame(userId: string) {
    io.to(this.room.userKey(userId)).emit(
      "setGame",
      this.toGameIO()
    );

    if (
      !this.inState("started")
      && this.isPlayer(userId)
    ) {

      const player = this.getPlayer(userId);

      io.to(this.room.userKey(userId)).emit(
        "setHand",
        player.hand!.toIO()
      );

    } else {
      io.to(this.room.userKey(userId)).emit("setHand", null);
      io.to(this.room.userKey(userId)).emit("setBoard", null);
    }
  }

  joinPlayers(userId: string) {
    if (
      !this.inState("started")
      || this.isPlayer(userId)
      || this.players.length >= 4
    ) {
      return;
    }

    this.players.push(new Player(userId));

    io.to(this.room.roomKey()).emit(
      "setGame",
      this.toGameIO()
    );
  }

  leavePlayers(userId: string) {
    if (
      !this.inState("started")
      || !this.isPlayer(userId)
    ) {
      return;
    }

    this.players.splice(
      this.players.findIndex(
        player => player.userId === userId
      ),
      1
    );

    io.to(this.room.roomKey()).emit(
      "setGame",
      this.toGameIO()
    );
  }

  toPlayerIO(): PlayerIO[] {
    return this.players.map(player => player.toIO());
  }

  toGameIO(): GameIO {
    return {
      gameState: this.gameState,
      players: this.toPlayerIO(),
      activePlayerIndex: this.activePlayerIndex,
      pile: this.pile === undefined
        ? undefined
        : this.pile.length,
      round: this.roundData === undefined
        ? undefined
        : this.roundData.count
    };
  }
}
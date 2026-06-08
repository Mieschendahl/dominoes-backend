import {
  GameIO,
  MessageIO,
  PlayerIO
} from "../shared/socket-types";

import { findMin, shuffle } from "../utils";

import { Board } from "./board";
import { Domino } from "./domino";
import { Hand } from "./hand";
import { Player } from "./player";
import { Room } from "../system/room";
import { io } from "../server";

type GameState = "started" | "playing" | "waiting" | "finished";

type RoundInfo = {
  count: number;
  startUserId: string;
  startType: "double" | "chance" | "winner";
  startDomino?: Domino;
  winnerUserId?: string;
  winType?: "finished" | "blocked";
  winnerPointsLeft?: number;
  winnerPointsAdd?: number;
};

const uiBold = "$tyle{bold}";
const uiItalic = "$tyle{bold italic}";

export class Game {
  static winnerThreshold = 100;

  private initalMessages: MessageIO[] = [
    {
      kind: "system",
      data: [
        `Welcome to ${uiBold}{Dominoes!}`
      ]
    },
    {
      kind: "system",
      data: [
        `Gain a total of ${uiBold}{100} points to win the game!`
      ]
    },
    {
      kind: "system",
      data: [
        `${uiBold}{2 to 4} players required`
      ]
    }
  ];

  constructor(
    public room: Room,
    public gameState: GameState = "started",
    public players: Player[] = [],
    public pile: Domino[] | undefined = undefined,
    public activePlayerIndex: number | undefined = undefined,
    public roundData: RoundInfo | undefined = undefined,
    public board: Board | undefined = undefined,
    public messages: MessageIO[] = [...this.initalMessages]
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
      [true, false].some(x => this.board!.canPlaceDomino(domino, x))
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

  private sendState(userId?: string) {
    if (userId === undefined) {
      io.to(this.room.roomKey()).emit(
        "send",
        {
          kind: "set game",
          data: this.toGameIO()
        }
      );
      this.players.forEach(player =>
        io.to(this.room.userKey(player.userId)).emit(
          "send",
          {
            kind: "set hand",
            data: player.hand?.toIO()
          }
        )
      );
      io.to(this.room.roomKey()).emit(
        "send",
        {
          kind: "set board",
          data: this.board?.toIO()
        }
      );
    } else {
      io.to(this.room.userKey(userId)).emit(
        "send",
        {
          kind: "set game",
          data: this.toGameIO()
        }
      );
      io.to(this.room.userKey(userId)).emit(
        "send",
        {
          kind: "set board",
          data: this.board?.toIO()
        }
      );
      const hand = this.isPlayer(userId) ? this.getPlayer(userId).hand : undefined;
      io.to(this.room.userKey(userId)).emit(
        "send",
        {
          kind: "set hand",
          data: hand?.toIO()
        }
      );
      io.to(this.room.userKey(userId)).emit(
        "send",
        {
          kind: "set messages",
          data: this.messages
        }
      );
    }
  }

  private initRoundData(started: boolean = false) {
    if (!started) {
      this.roundData = {
        count: this.roundData!.count + 1,
        startUserId: this.roundData!.winnerUserId!,
        startType: "winner"
      };

      return;
    }

    const [bestDomino, bestPlayer] = (() => {
      for (let i = 6; i >= 0; i--) {
        const domino = new Domino(i, i);
        for (const player of this.players) {
          if (player.hand!.contains(domino)) {
            return [domino, player];
          }
        }
      }
      return [undefined, this.players[0]];
    })();

    this.roundData = {
      count: 1,
      startUserId: bestPlayer.userId,
      startType: bestDomino ? "double" : "chance",
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

    this.sendState();

    const { startUserId, startDomino, startType } = this.roundData!;
    this.sendMessages([
      {
        kind: "system",
        data: [
          `${uiItalic}{${userId}} started the game`,
        ]
      },
      {
        kind: "system",
        data: [
          startType === "double"
            ? `${uiItalic}{${startUserId}} begins because they have the double ${startDomino!.leftPip}`
            : `${uiItalic}{${startUserId}} begins because they are lucky`
        ]
      }
    ]);
  }

  isBlocked(): boolean {
    if (this.pile!.length > 0 || this.board!.leftChain.isEmpty()) {
      return false;
    }
    const leftPip = this.board!.leftChain.getEnd()!.leftPip;
    const rightPip = this.board!.rightChain.getEnd()!.rightPip;
    return this.players.every(player => !player!.hand!.dominos.some(domino => {
      if (domino.hasMatch(leftPip) || domino.hasMatch(rightPip)) {
        return true;
      }
    }));
  }

  private advanceTurn(changeActivePlayer: boolean) {
    const activePlayer = this.players[this.activePlayerIndex!];

    if (activePlayer.hand!.hasFinished() || this.isBlocked()) {

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
        this.roundData!.winnerPointsLeft = 0;
      } else {
        this.roundData!.winnerUserId = minPlayers[0].userId;
        this.roundData!.winType = "blocked";
        this.roundData!.winnerPointsLeft = minPlayers[0].hand!.getPoints();
      }

      this.roundData!.winnerPointsAdd = players.reduce(
        (sum, player) =>
          (player.userId === this.roundData!.winnerUserId ? 0 : player.hand!.getPoints()) + sum,
        0
      );

      const winner = this.getPlayer(this.roundData!.winnerUserId);
      const { winnerUserId, winType } = this.roundData!;
      const oldScore = winner.score!;
      const newScore = oldScore + this.roundData!.winnerPointsAdd!
      winner.score! = newScore;
      const isFinished = newScore >= Game.winnerThreshold;
      this.gameState = isFinished ? "finished" : "waiting";

      io.to(this.room.roomKey()).emit(
        "send",
        {
          kind: "set game",
          data: this.toGameIO()
        }
      );

      const messages: MessageIO[] = [
        {
          kind: "system",
          data: [
            winType === "finished"
              ? `${uiItalic}{${winnerUserId}} wins the round because they finished first`
              : `${uiItalic}{${winnerUserId}} wins the round because the board is blocked and they have the smallest hand`,
          ]
        },
        {
          kind: "system",
          data: [
            `${uiItalic}{${winnerUserId}'s} points increase from ${uiBold}{${oldScore} to ${newScore}}`
          ]
        }
      ];
      if (isFinished) {
        messages.push(
          {
          kind: "system",
          data: [
            `${uiItalic}{${winnerUserId}} wins the game because they reached ${Game.winnerThreshold} points!`
          ]
        }
        )
      }
      this.sendMessages(messages);
    }

    if (changeActivePlayer) {
      this.activePlayerIndex =
        (this.activePlayerIndex! + 1)
        % this.players.length;
    }

    io.to(this.room.roomKey()).emit(
      "send",
      {
        kind: "set game",
        data: this.toGameIO()
      }
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

    const oldScore = winner.score!;
    const newScore = oldScore + this.roundData!.winnerPointsAdd!
    winner.score! = newScore;

    this.board = new Board();

    this.initPile();
    this.initPlayers();
    this.initRoundData();

    this.activePlayerIndex = this.players.findIndex(
      player => player.userId === this.roundData!.startUserId
    );

    this.gameState = "playing";

    this.sendState();

    const { startUserId, count } = this.roundData!;
    this.sendMessages([
      {
        kind: "system",
        data: [
          `${uiItalic}{${userId}} continued the game`,
        ]
      },
      {
        kind: "system",
        data: [
          `${uiItalic}{${startUserId}} begins because they won the last round`,
        ]
      },
    ]);
  }

  finishGame(userId: string) {
    if (
      !this.inState("finished")
      || !this.isPlayer(userId)
    ) {
      return;
    }

    this.board = undefined;
    this.pile = undefined;
    this.players = this.players.map(
      player => new Player(player.userId)
    );
    this.roundData = undefined;
    this.activePlayerIndex = undefined;
    this.gameState = "started";
    this.activePlayerIndex = undefined;

    this.sendState();
    this.messages = [...this.initalMessages];
    io.to(this.room.roomKey()).emit(
      "send",
      {
        kind: "set messages",
        data: this.messages
      }
    );
  }

  placeDomino(
    userId: string,
    domino: Domino,
    placeLeft: boolean
  ) {

    // console.log("placinggg", domino.leftPip, domino.rightPip, this.gameState, this.isActivePlayer(userId))

    if (
      !this.inState("playing")
      || !this.isActivePlayer(userId)
    ) {
      return;
    }

    const player = this.getPlayer(userId);
    const dominoIndex = player.hand!.dominos.findIndex(domino_ => domino_.isEqual(domino));
    // console.log("domino index", dominoIndex)
    if (dominoIndex < 0) {
      return;
    }

    const result = this.board!.canPlaceDomino(
      domino,
      placeLeft
    );

    // console.log("result", result)

    if (result) {
      player.hand!.dominos.splice(dominoIndex, 1);
      this.board!.placeDomino(domino, placeLeft);

      io.to(this.room.userKey(userId)).emit(
        "send",
        {
          kind: "set hand",
          data: player.hand!.toIO()
        }
      );
      io.to(this.room.roomKey()).emit(
        "send",
        {
          kind: "set board",
          data: this.board!.toIO()
        }
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
      player.hand!.dominos.push(this.pile!.pop()!);

      io.to(this.room.userKey(userId)).emit(
        "send",
        {
          kind: "set hand",
          data: player.hand!.toIO()
        }
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
    this.sendState(userId);
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
      "send",
      {
        kind: "set game",
        data: this.toGameIO()
      }
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
      "send",
      {
        kind: "set game",
        data: this.toGameIO()
      }
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

  public sendMessages(messages: MessageIO[]) {
    this.messages.push(...messages);
    io.to(this.room.roomKey()).emit(
      "send",
      {
        kind: "add messages",
        data: messages
      }
    );
  }
}
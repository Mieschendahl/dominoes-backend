import {
  HandIO,
  JoinRoomResponseCallbackIO,
  PlaceDominoIO,
  UserActionIO
} from "../socket-types";

import { AppSocket, system } from "./system";

import { Game } from "../models/game";
import { Domino } from "../models/domino";
import { Hand } from "../models/hand";

export type UserIdData = {
  socket?: AppSocket;
};

export class Room {
  constructor(
    public roomId: string,
    public userIds: Map<string, UserIdData> = new Map(),
    public game: Game = new Game(this)
  ) { }

  roomKey() {
    return this.roomId;
  }

  userKey(userId: string) {
    return `${this.roomId}($KEY_SEPERATOR$)${userId}`;
  }

  private getUserIdData(userId: string): UserIdData {
    const socket = this.userIds.get(userId)?.socket;

    return {
      socket
    };
  }

  leaveRoom(userId: string) {
    const { socket } = this.getUserIdData(userId);

    if (socket !== undefined) {
      this.userIds.set(userId, {});

      socket.leave(this.roomKey());
      socket.leave(this.userKey(userId));
    }
  }

  joinRoom(
    socket: AppSocket,
    callback: JoinRoomResponseCallbackIO,
    roomId: string,
    userId: string
  ) {
    const { socket: _socket } = this.getUserIdData(userId);

    if (_socket !== undefined) {
      callback({
        accepted: false,
        reason: "username already taken"
      });

      return;
    }

    system.leaveRoom(socket);

    system.sockets.set(socket, {
      roomId,
      userId
    });

    this.userIds.set(userId, { socket });

    socket.join(this.roomKey());
    socket.join(this.userKey(userId));

    callback({
      accepted: true
    });

    this.game.joinGame(userId);
  }

  doAction(userId: string, userAction: UserActionIO) {
    if (!this.userIds.has(userId)) {
      return;
    }

    switch (userAction.kind) {
      case "join players":
        this.game.joinPlayers(userId);
        break;

      case "leave players":
        this.game.leavePlayers(userId);
        break;

      case "start game":
        this.game.startGame(userId);
        break;

      case "advance round":
        this.game.advanceRound(userId);
        break;

      case "finish game":
        this.game.finishGame(userId);
        break;

      case "set hand":
        const hand = userAction.data as HandIO;
        this.game.setHand(userId, Hand.fromIO(hand));
        break;

      case "draw domino":
        this.game.drawDomino(userId);
        break;

      case "pass turn":
        this.game.passTurn(userId);
        break;

      case "place domino":
        const { domino, placeLeft } =
          userAction.data as PlaceDominoIO;

        this.game.placeDomino(
          userId,
          Domino.fromIO(domino),
          placeLeft
        );

        break;
    }
  }
}
import { Game } from "../models/game";
import { Domino } from "../models/domino";
import { Hand } from "../models/hand";
import { ClientData, MessageIO, ServerCb } from "../shared/socket-types";
import { AppSocket } from "../server";
import { system } from "./system";

type UserIdData = {
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
    return `${this.roomId}($KEY_SEPERATOR$)${userId}`; // TODO: Slight vulnerability here
  }

  private getUserIdData(userId: string): { socket?: AppSocket } {
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

  joinRoom(socket: AppSocket, callback: ServerCb, roomId: string, userId: string) {
    const { socket: _socket } = this.getUserIdData(userId);
    if (_socket !== undefined) {
      callback({
        kind: "join room",
        data: {
          accepted: false,
          reason: "username already taken"
        }
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
      kind: "join room",
      data: {
        accepted: true
      }
    });
    this.game.joinGame(userId);
  }

  doAction(userId: string, { kind, data }: ClientData) {
    if (!this.userIds.has(userId)) {
      return;
    }
    switch (kind) {
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
        const hand = data;
        this.game.setHand(userId, Hand.fromIO(hand));
        break;
      case "draw domino":
        this.game.drawDomino(userId);
        break;
      case "pass turn":
        this.game.passTurn(userId);
        break;
      case "place domino":
        const { domino, placeLeft } = data;
        this.game.placeDomino(userId, Domino.fromIO(domino), placeLeft);
        break;
      case "add messages":
        const messages: MessageIO[] = data.map(text => {
          return {
            kind: "user",
            data: {
              userId,
              text: text
            }
          };
        })
        this.game.sendMessages(messages);
        break;
    }
  }

  leavePlayers(userId: string) {
    if (!this.userIds.has(userId)) {
      return;
    }
    this.game.leavePlayers(userId);
  }

  startGame(userId: string) {
    if (!this.userIds.has(userId)) {
      return;
    }
    this.game.startGame(userId);
  }
}
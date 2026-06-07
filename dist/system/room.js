"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const game_1 = require("../models/game");
const domino_1 = require("../models/domino");
const hand_1 = require("../models/hand");
const system_1 = require("./system");
class Room {
    roomId;
    userIds;
    game;
    constructor(roomId, userIds = new Map(), game = new game_1.Game(this)) {
        this.roomId = roomId;
        this.userIds = userIds;
        this.game = game;
    }
    roomKey() {
        return this.roomId;
    }
    userKey(userId) {
        // TODO: Slight vulnerability here
        return `${this.roomId}($KEY_SEPERATOR$)${userId}`;
    }
    getUserIdData(userId) {
        const socket = this.userIds.get(userId)?.socket;
        return {
            socket
        };
    }
    leaveRoom(userId) {
        const { socket } = this.getUserIdData(userId);
        if (socket !== undefined) {
            this.userIds.set(userId, {});
            socket.leave(this.roomKey());
            socket.leave(this.userKey(userId));
        }
    }
    joinRoom(socket, callback, roomId, userId) {
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
        system_1.system.leaveRoom(socket);
        system_1.system.sockets.set(socket, {
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
    doAction(userId, { kind, data }) {
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
                this.game.setHand(userId, hand_1.Hand.fromIO(hand));
                break;
            case "draw domino":
                this.game.drawDomino(userId);
                break;
            case "pass turn":
                this.game.passTurn(userId);
                break;
            case "place domino":
                const { domino, placeLeft } = data;
                this.game.placeDomino(userId, domino_1.Domino.fromIO(domino), placeLeft);
                break;
            case "add messages":
                const messages = data.map(text => {
                    return {
                        kind: "user",
                        data: {
                            userId,
                            text: text
                        }
                    };
                });
                this.game.sendMessages(messages);
                break;
        }
    }
    leavePlayers(userId) {
        if (!this.userIds.has(userId)) {
            return;
        }
        this.game.leavePlayers(userId);
    }
    startGame(userId) {
        if (!this.userIds.has(userId)) {
            return;
        }
        this.game.startGame(userId);
    }
}
exports.Room = Room;
//# sourceMappingURL=room.js.map
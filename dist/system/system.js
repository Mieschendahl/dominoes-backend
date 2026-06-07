"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.system = void 0;
const room_1 = require("./room");
class System {
    sockets;
    rooms;
    constructor(sockets = new Map(), rooms = new Map()) {
        this.sockets = sockets;
        this.rooms = rooms;
    }
    getSocketData(socket) {
        const roomId = this.sockets.get(socket)?.roomId;
        const userId = this.sockets.get(socket)?.userId;
        const room = this.rooms.get(roomId);
        return {
            roomId,
            userId,
            room
        };
    }
    addSocket(socket) {
        this.sockets.set(socket, {});
    }
    removeSocket(socket) {
        this.leaveRoom(socket);
        this.sockets.delete(socket);
    }
    leaveRoom(socket) {
        const { room, userId } = this.getSocketData(socket);
        if (userId !== undefined && room !== undefined) {
            room.leaveRoom(userId);
        }
        this.sockets.set(socket, {});
    }
    joinRoom(socket, callback, roomId, userId) {
        roomId = roomId.trim();
        userId = userId.trim();
        if (roomId === "" || userId === "") {
            callback({
                kind: "join room",
                data: {
                    accepted: false,
                    reason: "roomId and userId are required"
                }
            });
            return;
        }
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new room_1.Room(roomId));
        }
        this.rooms.get(roomId)?.joinRoom(socket, callback, roomId, userId);
    }
    doAction(socket, data) {
        const { room, userId } = this.getSocketData(socket);
        if (userId === undefined || room === undefined) {
            return;
        }
        room.doAction(userId, data);
    }
}
exports.system = new System();
//# sourceMappingURL=system.js.map
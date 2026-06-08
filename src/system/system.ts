import { AppSocket } from "../server";
import { ClientData, ServerCb } from "../shared/socket-types";
import { Room } from "./room";

type SocketData = {
  roomId?: string;
  userId?: string;
};

class System {
  constructor(
    public sockets: Map<AppSocket, SocketData> = new Map(),
    public rooms: Map<string, Room> = new Map()
  ) { }

  private getSocketData(socket: AppSocket): { roomId?: string, userId?: string, room?: Room } {
    const roomId = this.sockets.get(socket)?.roomId;
    const userId = this.sockets.get(socket)?.userId;
    const room = this.rooms.get(roomId!);
    return {
      roomId,
      userId,
      room
    };
  }

  addSocket(socket: AppSocket) {
    this.sockets.set(socket, {});
  }

  removeSocket(socket: AppSocket) {
    this.leaveRoom(socket);
    this.sockets.delete(socket);
  }

  leaveRoom(socket: AppSocket) {
    const { room, userId } = this.getSocketData(socket);
    if (userId !== undefined && room !== undefined) {
      room.leaveRoom(userId);
    }
    this.sockets.set(socket, {});
  }

  private roomTimers = new Map<string, NodeJS.Timeout>();

  joinRoom(socket: AppSocket, callback: ServerCb, roomId: string, userId: string) {
    roomId = roomId.trim()
    userId = userId.trim()
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
      this.rooms.set(roomId, new Room(roomId));
    }

    clearTimeout(this.roomTimers.get(roomId));
    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId)!;
      room.userIds.forEach((_, userId) => room.leaveRoom(userId));
      this.rooms.delete(roomId);
      this.roomTimers.delete(roomId);
    }, 60 * 120 * 1000);
    this.roomTimers.set(roomId, timer);

    this.rooms.get(roomId)?.joinRoom(socket, callback, roomId, userId);
  }

  doAction(socket: AppSocket, data: ClientData) {
    const { room, userId } = this.getSocketData(socket);
    if (userId === undefined || room === undefined) {
      return;
    }
    room.doAction(userId, data);
  }
}

export const system = new System();
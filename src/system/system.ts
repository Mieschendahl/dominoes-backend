import { Socket } from "socket.io";

import {
  ClientToServerEvents,
  JoinRoomResponseCallbackIO,
  ServerToClientEvents,
  UserActionIO
} from "../shared/socket-types";

import { Room } from "./room";

export type AppSocket =
  Socket<ClientToServerEvents, ServerToClientEvents>;

type SocketData = {
  roomId?: string;
  userId?: string;
};

export class System {
  constructor(
    public sockets: Map<AppSocket, SocketData> = new Map(),
    public rooms: Map<string, Room> = new Map()
  ) { }

  private getSocketData(
    socket: AppSocket
  ): {
    roomId?: string;
    userId?: string;
    room?: Room;
  } {

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

  joinRoom(
    socket: AppSocket,
    callback: JoinRoomResponseCallbackIO,
    roomId: string,
    userId: string
  ) {

    roomId = roomId.trim();
    userId = userId.trim();

    if (roomId === "" || userId === "") {
      return;
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Room(roomId));
    }

    this.rooms
      .get(roomId)
      ?.joinRoom(socket, callback, roomId, userId);
  }

  doAction(socket: AppSocket, userAction: UserActionIO) {
    const { room, userId } = this.getSocketData(socket);

    if (userId === undefined || room === undefined) {
      return;
    }

    room.doAction(userId, userAction);
  }
}

export const system = new System();
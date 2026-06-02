import { createServer } from "node:http";
import { Server } from "socket.io";

import {
  ClientToServerEvents,
  ServerToClientEvents,
  UserActionIO
} from "./shared/socket-types";

import { System, AppSocket } from "./system/System";

const server = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  server,
  {
    cors: {
      origin: "http://localhost:3011",
    },
    connectionStateRecovery: {},
    pingTimeout: 20000,
    pingInterval: 25000,
  }
);

export { io };

const system = new System();

io.on("connection", (socket: AppSocket) => {
  system.addSocket(socket);

  socket.on("disconnect", () => {
    system.removeSocket(socket);
  });

  socket.on("joinRoom", ({ roomId, userId }, callback) => {
    system.joinRoom(socket, callback, roomId, userId);
  });

  socket.on("doAction", (userAction: UserActionIO) => {
    system.doAction(socket, userAction);
  });
});

const port = 3012;

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
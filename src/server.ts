import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { ClientData, ClientToServerEvents, ServerCb, ServerToClientEvents } from "./shared/socket-types";
import { system } from "./system/system";

const server = createServer();
const port = 4000;

export const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  server,
  {
    path: "/dominoes/api",
    cors: {
      origin: ["http://localhost:3000", "https://test.goolagoon.org"],
    },
    connectionStateRecovery: {},
    pingTimeout: 20000,
    pingInterval: 25000,
  }
);

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

io.on("connection", (socket: AppSocket) => {
  system.addSocket(socket);

  socket.on("disconnect", () => {
    system.doAction(socket, {
      kind: "leave players"
    });
    system.removeSocket(socket);
  });

  socket.on("sendCb", ({ kind, data }: ClientData, cb: ServerCb) => {
    switch (kind) {
      case "join room":
        const { roomId, userId } = data;
        system.joinRoom(socket, cb, roomId, userId);
        system.doAction(socket, {
          kind: "join players"
        });
        break;
    }
  });

  socket.on("send", (data: ClientData) => {
    system.doAction(socket, data);
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
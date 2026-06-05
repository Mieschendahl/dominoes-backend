import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { ClientData, ClientToServerEvents, ServerCb, ServerToClientEvents } from "./shared/socket-types";
import { system } from "./system/system";

const server = createServer();
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  server,
  {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://localhost:3000"
      ]
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
    system.removeSocket(socket);
  });

  socket.on("sendCb", ({ kind, data }: ClientData, cb: ServerCb) => {
    switch (kind) {
      case "join room":
        const { roomId, userId } = data;
        system.joinRoom(socket, cb, roomId, userId);
        break;
    }
  });

  socket.on("send", (data: ClientData) => {
    system.doAction(socket, data);
  });
});

const port = 4000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
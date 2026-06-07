"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const node_http_1 = require("node:http");
const socket_io_1 = require("socket.io");
const system_1 = require("./system/system");
const stage = process.env.STAGE;
const config = {
    local: {
        origin: "http://localhost:3000",
    },
    test: {
        origin: "https://test.dominoes.goolagoon.org"
    },
    prod: {
        origin: "https://dominoes.goolagoon.org",
    },
}[stage];
const server = (0, node_http_1.createServer)();
const port = 4000;
exports.io = new socket_io_1.Server(server, {
    path: "/api",
    cors: {
        origin: [config.origin],
    },
    connectionStateRecovery: {},
    pingTimeout: 20000,
    pingInterval: 25000,
});
exports.io.on("connection", (socket) => {
    system_1.system.addSocket(socket);
    socket.on("disconnect", () => {
        system_1.system.doAction(socket, {
            kind: "leave players"
        });
        system_1.system.removeSocket(socket);
    });
    socket.on("sendCb", ({ kind, data }, cb) => {
        switch (kind) {
            case "join room":
                const { roomId, userId } = data;
                system_1.system.joinRoom(socket, cb, roomId, userId);
                system_1.system.doAction(socket, {
                    kind: "join players"
                });
                break;
        }
    });
    socket.on("send", (data) => {
        system_1.system.doAction(socket, data);
    });
});
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map
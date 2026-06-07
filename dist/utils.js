"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socket = void 0;
exports.shuffle = shuffle;
exports.findMin = findMin;
var socket_io_1 = require("socket.io");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return socket_io_1.Socket; } });
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
function findMin(items, valueFn) {
    if (items.length === 0)
        return [];
    let minValue = valueFn(items[0]);
    let result = [items[0]];
    for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const value = valueFn(item);
        if (value < minValue) {
            minValue = value;
            result = [item];
        }
        else if (value === minValue) {
            result.push(item);
        }
    }
    return result;
}
//# sourceMappingURL=utils.js.map
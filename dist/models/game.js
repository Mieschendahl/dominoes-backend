"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const utils_1 = require("../utils");
const board_1 = require("./board");
const domino_1 = require("./domino");
const hand_1 = require("./hand");
const player_1 = require("./player");
const server_1 = require("../server");
const uiBold = "$tyle{bold}";
const uiItalic = "$tyle{bold italic}";
class Game {
    room;
    gameState;
    players;
    pile;
    activePlayerIndex;
    roundData;
    board;
    messages;
    static winnerThreshold = 100;
    initalMessages = [
        {
            kind: "system",
            data: [
                `Welcome to ${uiBold}{Dominoes!}`
            ]
        },
        {
            kind: "system",
            data: [
                `Gain a total of ${uiBold}{100} points to win the game!`
            ]
        },
        {
            kind: "system",
            data: [
                `${uiBold}{2 to 4} players required`
            ]
        }
    ];
    constructor(room, gameState = "started", players = [], pile = undefined, activePlayerIndex = undefined, roundData = undefined, board = undefined, messages = [...this.initalMessages]) {
        this.room = room;
        this.gameState = gameState;
        this.players = players;
        this.pile = pile;
        this.activePlayerIndex = activePlayerIndex;
        this.roundData = roundData;
        this.board = board;
        this.messages = messages;
    }
    inState(...gameStates) {
        return gameStates.some(state => this.gameState === state);
    }
    isPlayer(userId) {
        return this.players.some(player => player.userId === userId);
    }
    getPlayer(userId) {
        return this.players.find(player => player.userId === userId);
    }
    canPlace(player) {
        return player.hand.dominos.some(domino => [true, false].some(x => this.board.canPlaceDomino(domino, x)));
    }
    isActivePlayer(userId) {
        if (!this.inState("playing")) {
            return false;
        }
        return this.players[this.activePlayerIndex].userId === userId;
    }
    initPile() {
        this.pile = [];
        for (let leftPip = 0; leftPip <= 6; leftPip += 1) {
            for (let rightPip = leftPip; rightPip <= 6; rightPip += 1) {
                this.pile.push(new domino_1.Domino(leftPip, rightPip));
            }
        }
        (0, utils_1.shuffle)(this.pile);
    }
    initPlayers(started = false) {
        this.players.forEach(player => {
            if (started) {
                player.score = 0;
            }
            player.hand = new hand_1.Hand(this.pile.splice(0, 7));
        });
        (0, utils_1.shuffle)(this.players);
    }
    sendState(userId) {
        if (userId === undefined) {
            server_1.io.to(this.room.roomKey()).emit("send", {
                kind: "set game",
                data: this.toGameIO()
            });
            this.players.forEach(player => server_1.io.to(this.room.userKey(player.userId)).emit("send", {
                kind: "set hand",
                data: player.hand?.toIO()
            }));
            server_1.io.to(this.room.roomKey()).emit("send", {
                kind: "set board",
                data: this.board?.toIO()
            });
        }
        else {
            server_1.io.to(this.room.userKey(userId)).emit("send", {
                kind: "set game",
                data: this.toGameIO()
            });
            server_1.io.to(this.room.userKey(userId)).emit("send", {
                kind: "set board",
                data: this.board?.toIO()
            });
            const hand = this.isPlayer(userId) ? this.getPlayer(userId).hand : undefined;
            server_1.io.to(this.room.userKey(userId)).emit("send", {
                kind: "set hand",
                data: hand?.toIO()
            });
            server_1.io.to(this.room.userKey(userId)).emit("send", {
                kind: "set messages",
                data: this.messages
            });
        }
    }
    initRoundData(started = false) {
        if (!started) {
            this.roundData = {
                count: this.roundData.count + 1,
                startUserId: this.roundData.winnerUserId,
                startType: "winner"
            };
            return;
        }
        const [bestDomino, bestPlayer] = (() => {
            for (let i = 6; i >= 0; i--) {
                const domino = new domino_1.Domino(i, i);
                for (const player of this.players) {
                    if (player.hand.contains(domino)) {
                        return [domino, player];
                    }
                }
            }
            return [undefined, this.players[0]];
        })();
        this.roundData = {
            count: 1,
            startUserId: bestPlayer.userId,
            startType: bestDomino ? "double" : "chance",
            startDomino: bestDomino
        };
    }
    startGame(userId) {
        if (!this.inState("started")
            || !this.isPlayer(userId)
            || this.players.length < 2) {
            return;
        }
        this.gameState = "playing";
        this.board = new board_1.Board();
        this.initPile();
        this.initPlayers(true);
        this.initRoundData(true);
        this.activePlayerIndex = this.players.findIndex(player => player.userId === this.roundData.startUserId);
        this.sendState();
        const { startUserId, startDomino, startType } = this.roundData;
        this.sendMessages([
            {
                kind: "system",
                data: [
                    `${uiItalic}{${userId}} started the game`,
                ]
            },
            {
                kind: "system",
                data: [
                    startType === "double"
                        ? `${uiItalic}{${startUserId}} begins because they have the double ${startDomino.leftPip}`
                        : `${uiItalic}{${startUserId}} begins because they are lucky`
                ]
            }
        ]);
    }
    isBlocked() {
        if (this.pile.length > 0 || this.board.leftChain.isEmpty()) {
            return false;
        }
        const leftPip = this.board.leftChain.getEnd().leftPip;
        const rightPip = this.board.rightChain.getEnd().rightPip;
        return this.players.every(player => !player.hand.dominos.some(domino => {
            if (domino.hasMatch(leftPip) || domino.hasMatch(rightPip)) {
                return true;
            }
        }));
    }
    advanceTurn(changeActivePlayer) {
        const activePlayer = this.players[this.activePlayerIndex];
        if (activePlayer.hand.hasFinished() || this.isBlocked()) {
            const startIndex = this.players.findIndex(player => player.userId === this.roundData.startUserId);
            const players = this.players
                .slice(startIndex)
                .concat(this.players.slice(0, startIndex));
            const minPlayers = (0, utils_1.findMin)(players, player => player.hand.getPoints());
            if (activePlayer.hand.hasFinished()) {
                this.roundData.winnerUserId = activePlayer.userId;
                this.roundData.winType = "finished";
                this.roundData.winnerPointsLeft = 0;
            }
            else {
                this.roundData.winnerUserId = minPlayers[0].userId;
                this.roundData.winType = "blocked";
                this.roundData.winnerPointsLeft = minPlayers[0].hand.getPoints();
            }
            this.roundData.winnerPointsAdd = players.reduce((sum, player) => (player.userId === this.roundData.winnerUserId ? 0 : player.hand.getPoints()) + sum, 0);
            const winner = this.getPlayer(this.roundData.winnerUserId);
            const { winnerUserId, winType } = this.roundData;
            const oldScore = winner.score;
            const newScore = oldScore + this.roundData.winnerPointsAdd;
            winner.score = newScore;
            const isFinished = newScore >= Game.winnerThreshold;
            this.gameState = isFinished ? "finished" : "waiting";
            server_1.io.to(this.room.roomKey()).emit("send", {
                kind: "set game",
                data: this.toGameIO()
            });
            const messages = [
                {
                    kind: "system",
                    data: [
                        winType === "finished"
                            ? `${uiItalic}{${winnerUserId}} wins the round, because they finished first`
                            : `${uiItalic}{${winnerUserId}} wins the round, because the board is blocked and they have the smallest hand`,
                    ]
                },
                {
                    kind: "system",
                    data: [
                        `${uiItalic}{${winnerUserId}'s} points increase from ${uiBold}{${oldScore} to ${newScore}}`
                    ]
                }
            ];
            if (isFinished) {
                messages.push({
                    kind: "system",
                    data: [
                        `${uiItalic}{${winnerUserId}} wins the game, because they reached ${Game.winnerThreshold} points!`
                    ]
                });
            }
            this.sendMessages(messages);
        }
        if (changeActivePlayer) {
            this.activePlayerIndex =
                (this.activePlayerIndex + 1)
                    % this.players.length;
        }
        server_1.io.to(this.room.roomKey()).emit("send", {
            kind: "set game",
            data: this.toGameIO()
        });
    }
    advanceRound(userId) {
        if (!this.inState("waiting")
            || !this.isPlayer(userId)) {
            return;
        }
        const winner = this.getPlayer(this.roundData.winnerUserId);
        const oldScore = winner.score;
        const newScore = oldScore + this.roundData.winnerPointsAdd;
        winner.score = newScore;
        this.board = new board_1.Board();
        this.initPile();
        this.initPlayers();
        this.initRoundData();
        this.activePlayerIndex = this.players.findIndex(player => player.userId === this.roundData.startUserId);
        this.gameState = "playing";
        this.sendState();
        const { startUserId, count } = this.roundData;
        this.sendMessages([
            {
                kind: "system",
                data: [
                    `${uiItalic}{${userId}} continued the game`,
                ]
            },
            {
                kind: "system",
                data: [
                    `${uiItalic}{${startUserId}} begins because they won the last round`,
                ]
            },
        ]);
    }
    finishGame(userId) {
        if (!this.inState("finished")
            || !this.isPlayer(userId)) {
            return;
        }
        this.board = undefined;
        this.pile = undefined;
        this.players = this.players.map(player => new player_1.Player(player.userId));
        this.roundData = undefined;
        this.activePlayerIndex = undefined;
        this.gameState = "started";
        this.activePlayerIndex = undefined;
        this.sendState();
        this.messages = [...this.initalMessages];
        server_1.io.to(this.room.roomKey()).emit("send", {
            kind: "set messages",
            data: this.messages
        });
    }
    placeDomino(userId, domino, placeLeft) {
        // console.log("placinggg", domino.leftPip, domino.rightPip, this.gameState, this.isActivePlayer(userId))
        if (!this.inState("playing")
            || !this.isActivePlayer(userId)) {
            return;
        }
        const player = this.getPlayer(userId);
        const dominoIndex = player.hand.dominos.findIndex(domino_ => domino_.isEqual(domino));
        // console.log("domino index", dominoIndex)
        if (dominoIndex < 0) {
            return;
        }
        const result = this.board.canPlaceDomino(domino, placeLeft);
        // console.log("result", result)
        if (result) {
            player.hand.dominos.splice(dominoIndex, 1);
            this.board.placeDomino(domino, placeLeft);
            server_1.io.to(this.room.userKey(userId)).emit("send", {
                kind: "set hand",
                data: player.hand.toIO()
            });
            server_1.io.to(this.room.roomKey()).emit("send", {
                kind: "set board",
                data: this.board.toIO()
            });
            this.advanceTurn(true);
        }
    }
    drawDomino(userId) {
        if (!this.inState("playing")
            || !this.isActivePlayer(userId)) {
            return;
        }
        const player = this.getPlayer(userId);
        if (!this.canPlace(player)
            && this.pile.length > 0) {
            player.hand.dominos.push(this.pile.pop());
            server_1.io.to(this.room.userKey(userId)).emit("send", {
                kind: "set hand",
                data: player.hand.toIO()
            });
            this.advanceTurn(false);
        }
    }
    passTurn(userId) {
        if (!this.inState("playing")
            || !this.isActivePlayer(userId)) {
            return;
        }
        if (!this.canPlace(this.getPlayer(userId))
            && this.pile.length === 0) {
            this.advanceTurn(true);
        }
    }
    setHand(userId, hand) {
        if (!this.inState("playing")
            || !this.isPlayer(userId)) {
            return;
        }
        const player = this.getPlayer(userId);
        if (player.hand.isEqual(hand)) {
            player.hand = hand;
        }
    }
    joinGame(userId) {
        this.sendState(userId);
    }
    joinPlayers(userId) {
        if (!this.inState("started")
            || this.isPlayer(userId)
            || this.players.length >= 4) {
            return;
        }
        this.players.push(new player_1.Player(userId));
        server_1.io.to(this.room.roomKey()).emit("send", {
            kind: "set game",
            data: this.toGameIO()
        });
    }
    leavePlayers(userId) {
        if (!this.inState("started")
            || !this.isPlayer(userId)) {
            return;
        }
        this.players.splice(this.players.findIndex(player => player.userId === userId), 1);
        server_1.io.to(this.room.roomKey()).emit("send", {
            kind: "set game",
            data: this.toGameIO()
        });
    }
    toPlayerIO() {
        return this.players.map(player => player.toIO());
    }
    toGameIO() {
        return {
            gameState: this.gameState,
            players: this.toPlayerIO(),
            activePlayerIndex: this.activePlayerIndex,
            pile: this.pile === undefined
                ? undefined
                : this.pile.length,
            round: this.roundData === undefined
                ? undefined
                : this.roundData.count
        };
    }
    sendMessages(messages) {
        this.messages.push(...messages);
        server_1.io.to(this.room.roomKey()).emit("send", {
            kind: "add messages",
            data: messages
        });
    }
}
exports.Game = Game;
//# sourceMappingURL=game.js.map
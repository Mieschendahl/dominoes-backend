export type DominoIO = {
  leftPip: number;
  rightPip: number;
};

export type HandIO = {
  dominos: DominoIO[];
};

export type ChainIO = DominoIO[];

export type BoardIO = {
  leftChain: ChainIO;
  rightChain: ChainIO;
};

export type JoinRoomIO = {
  roomId: string;
  userId: string;
};

export type JoinRoomCbIO = {
  accepted: boolean;
  reason?: string;
};

export type PlayerIO = {
  userId: string;
  score?: number;
  hand?: number;
};

export type GameIO = {
  gameState: "started" | "playing" | "waiting" | "finished";
  players: PlayerIO[];
  activePlayerIndex?: number;
  pile?: number;
  round?: number;
}

export type PlaceDominoIO = {
  domino: DominoIO;
  placeLeft: boolean;
};

export type ClientData =
  | {
    kind: "join players";
    data?: undefined;
  }
  | {
    kind: "leave players";
    data?: undefined;
  }
  | {
    kind: "start game";
    data?: undefined;
  }
  | {
    kind: "advance round";
    data?: undefined;
  }
  | {
    kind: "finish game";
    data?: undefined;
  }
  | {
    kind: "draw domino";
    data?: undefined;
  }
  | {
    kind: "pass turn";
    data?: undefined;
  }
  | {
    kind: "place domino";
    data: PlaceDominoIO;
  }
  | {
    kind: "set hand";
    data: HandIO;
  }
  | {
    kind: "join room";
    data: JoinRoomIO;
  }
  | {
    kind: "add messages";
    data: string[][];
  };

export type ServerCb = (
  data: 
  | {
    kind: "join room";
    data: JoinRoomCbIO;
  }
) => void;

export type ClientToServerEvents = {
  send: (data: ClientData) => void,
  sendCb: (data: ClientData, cb: ServerCb) => void
};

export type MessageKindIO = "system" | "user";

export type MessageIO = 
  | {
    kind: "user",
    data: {
      userId: string,
      text: string[]
    }
  }
  | {
    kind: "system",
    data: string[]
  };

export type ServerData =
  | {
    kind: "set game";
    data: GameIO;
  }
  | {
    kind: "set hand";
    data?: HandIO;
  }
  | {
    kind: "set board";
    data?: BoardIO;
  }
  | {
    kind: "set messages";
    data: MessageIO[];
  }
  | {
    kind: "add messages";
    data: MessageIO[];
  };

export type ServerToClientEvents = {
  send: (data: ServerData) => void;
};
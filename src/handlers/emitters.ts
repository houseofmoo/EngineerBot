import { TypedEmitter } from 'tiny-typed-emitter';
import discord from 'discord.js';

interface ISocketEmitter {
   // websocket status
   websocketConnected: () => void;
   websocketConnectionFail: (error: Error) => void;
   websocketError: (error: Error) => void;
   websocketClose: () => void;

   // websocket messages
   receivedVisit: (json: any) => void;
   receivedOptions: (json: any) => void;
   receivedSlot: (json: any) => void;
   receivedMods: (json: any) => void;
   receivedStarting: (json: any) => void;
   receivedRunning: (json: any) => void;
   receivedStopping: (json: any) => void;
   receivedInfo: (json: any) => void;
   receivedLog: (json: any) => void;
   receivedConsole: (json: any) => void;
   receivedIdle: (json: any) => void;
}

export class SocketEmitter extends TypedEmitter<ISocketEmitter> {
    constructor() {
        super();
    }
}

interface IDiscordMessageEmitter {
    sendManagementMsg: (msg: string | discord.MessageEmbed) => void;
    sendGameServerMsg: (serverName: string, msg: string | discord.MessageEmbed) => void;
    sendToGameServerWebHook: (serverName: string, msg: string | discord.MessageEmbed, username: string) => void;
};

export class DiscordMessageEmitter extends TypedEmitter<IDiscordMessageEmitter> {
    constructor() {
        super();
    }
}

interface IDocumentEmitter {
    documentUpdated: () => void;
    saveDocument: () => void;
}

export class DocumentEmitter extends TypedEmitter<IDocumentEmitter> {
    constructor() {
        super();
    }
}
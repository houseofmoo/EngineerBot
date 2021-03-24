import { TypedEmitter } from 'tiny-typed-emitter';
import discord from 'discord.js';

interface ISocketEventEmitter {
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
 
 export class SocketEventEmitter extends TypedEmitter<ISocketEventEmitter> {
     constructor() {
         super();
     }
 }
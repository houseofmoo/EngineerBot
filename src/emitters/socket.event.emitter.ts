import { TypedEmitter } from 'tiny-typed-emitter';
import { ServerState, ServerEvent, SocketState } from '../models/enumerations';

interface ISocketEventEmitter {
    // websocket status
    socketStatus: (msg: string, state: SocketState, err: Error | undefined) => void;

    // websocket messages
    receivedSecret: (secret: string) => void;
    receivedSaves: (json: any) => void;
    receivedVersions: (json: any) => void;
    receivedRegions: (json: any) => void;
    receivedMods: (serverMods: any) => void;
    receivedState: (newState: ServerState, launchId: string, serverIp: string) => void;
    receivedInfo: (msg: string, type: ServerEvent) => void;
 }
 
 export class SocketEventEmitter extends TypedEmitter<ISocketEventEmitter> {
     constructor() {
         super();
     }
 }
import websocket from 'websocket';
import { SocketEventEmitter } from '../emitters/socket.event.emitter';
import { ServerState, ServerEvent } from '../models/enumerations';
import urls from '../data/api.urls.json';

export class SocketManager {
    serverName: string;
    serverToken: string;
    socketEmitter: SocketEventEmitter;
    socket: websocket.client;
    connection: websocket.connection | undefined;
    previousLog: string;
    killSocket: boolean;

    constructor(serverName: string, serverToken: string) {
        this.serverName = serverName;
        this.serverToken = serverToken;
        this.socketEmitter = new SocketEventEmitter();
        this.socket = new websocket.client();
        this.connection = undefined;
        this.previousLog = '';
        this.killSocket = false;
        this.init();
    }

    connect(): void {
        const self = this;
        console.log(`${self.serverName} connecting to ${urls.gameServer.websocket}`);
        this.socket?.connect(urls.gameServer.websocket);
    }

    endConnection(): void {
        const self = this;
        self.killSocket = true;
        self.connection?.close();
    }

    init(): void {
        const self = this;

        self.socket.on('connectFailed', error => {
            const failedMsg = `Failed to connect to server`;
            self.socketEmitter.emit('socketStatus', failedMsg, error);
            if (!self.killSocket) {
                setTimeout(self.connect, 10000);
            }
        })

        self.socket.on('connect', connection => {
            self.connection = connection;
            const connectedMsg = `Server connection established`;
            self.socketEmitter.emit('socketStatus', connectedMsg, undefined);

            connection.on('error', error => {
                self.connection = undefined;
                const errMsg = `Server connection error`
                self.socketEmitter.emit('socketStatus', errMsg, error);
            })

            connection.on('close', () => {
                self.connection = undefined;
                const closeMsg = 'Reconnecting to server'
                self.socketEmitter.emit('socketStatus', closeMsg, undefined);
                if (!self.killSocket) {
                    setTimeout(self.connect, 10000);
                }
            })

            connection.on('message', message => {
                self.routeMessage(message);

                // heart beat
                function keepAlive() {
                    connection.sendUTF('keep alive');
                    setTimeout(keepAlive, 10000);
                }
                keepAlive();
            })
        })
    }

    routeMessage(message: websocket.IMessage): void {
        const self = this;
        // check valid message
        if (message === undefined || message.utf8Data === undefined) {
            return;
        }

        // parse json
        const json = JSON.parse(message.utf8Data);

        switch (json.type) {
            case 'visit':       // on initial connection, recieve secret key and login to server
                self.handleVisit(json);
                break;

            case 'options':     // after login receive: options include regions, versions, saves, 
                self.handleOptions(json);
                break;

            case 'mods':        // after login receive: the list of available mods
                self.handleMods(json);
                break;

            case 'starting':    // after a server start request
                self.handleStarting(json);
                break;

            case 'running':     // if server is in a running state
                self.handleRunning(json);
                break;

            case 'stopping':    // server is stopping
                self.handleStopping(json);
                break;

            case 'idle':        // server is idle
                self.handleIdle(json);
                break;

            case 'info':        // after login receive: information, some of it we care about
                self.handleInfo(json);
                break;

            case 'log':         // server loggin information to the website console, care about [JOIN] and [CHAT]
                self.handleLog(json);
                break;

            case 'console':     // server writes to console, dunno what i want to do with this
                self.handleConsole(json);
                break;


            case 'slot':        // after login receive: the currently selected slot
                self.handleSlot(json);
                break;

            default:
                break;
        }
    }

    async handleVisit(json: any) {
        const self = this;
        self.socketEmitter.emit('receivedSecret', json.secret);
    }

    async handleOptions(json: any) {
        const self = this;

        switch (json.name) {
            case 'saves':
                self.socketEmitter.emit('receivedSaves', json);
                break;

            case 'regions':
                self.socketEmitter.emit('receivedRegions', json);
                break;

            case 'versions':
                self.socketEmitter.emit('receivedVersions', json);
                break;
        }
    }

    async handleMods(json: any) {
        const self = this;
        self.socketEmitter.emit('receivedMods', json.mods);
    }

    handleStarting(json: any): void {
        const self = this;
        self.socketEmitter.emit('receivedState', ServerState.Starting, json.launchId, '');
    }

    handleRunning(json: any): void {
        const self = this;
        self.socketEmitter.emit('receivedState', ServerState.Online, json.launchId, json.socket);
    }

    handleStopping(json: any): void {
        const self = this;
        self.socketEmitter.emit('receivedState', ServerState.Stopping, '', '');
    }

    handleIdle(json: any): void {
        const self = this;
        self.socketEmitter.emit('receivedState', ServerState.Offline, '', '');
    }

    handleInfo(json: any): void {
        const self = this;

        switch (json.line) {
            case 'provisioning virtual machine, this will take an extra minute':
                self.socketEmitter.emit('receivedInfo', `Start up is slowed, provisioning virtual machine`, ServerEvent.Other);
                break;
        }
    }

    async handleLog(json: any) {
        const self = this;

        // ignore log message more than 10 seconds old
        if (new Date().getTime() - json.time > 10000) {
            return;
        }

        console.log(`prev log: ${self.previousLog}`);
        console.log(`new log: ${json.line}`);

        // if we recieve a duplicate message, ignore it
        if (self.previousLog == json.line) {
            return;
        }

        // handle specific events we care about
        if (json.line.includes('[JOIN]')) {
            // capture log to check in the future
            self.previousLog = json.line;

            self.socketEmitter.emit('receivedInfo', json.line, ServerEvent.Join);
        }
        // things we care about, ignore everything else
        else if (json.line.includes('[LEAVE]') ||
            json.line.includes('[CHAT]') ||
            json.line.includes('already an admin') ||
            json.line.includes('[PROMOTE]') ||
            json.line.includes('[COMMAND]')) {

            // capture log to check in the future
            self.previousLog = json.line;

            // ignore pings on land and pings on train... want to ignore all pings but this is good enough
            if (json.line.includes('[gps=') || json.line.includes('[train=')) {
                return;
            }

            self.socketEmitter.emit('receivedInfo', json.line, ServerEvent.Other);
        }
    }

    handleConsole(json: any): void { }

    async handleSlot(json: any) { }
}
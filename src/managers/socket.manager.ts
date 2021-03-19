import websocket from 'websocket';
import { SocketEmitter } from '../handlers/emitters';
import urls from '../data/api.urls.json';

export class SocketManager {
    serverToken: string;
    socketEmitter: SocketEmitter;
    socket: websocket.client;
    isConnected: boolean;
    connection: websocket.connection | undefined;

    constructor(serverToken: string, socketEmitter: SocketEmitter) {
        this.serverToken = serverToken;
        this.socketEmitter = socketEmitter;
        this.socket = new websocket.client();
        this.isConnected = false;
        this.connection = undefined;
        this.init();
    }

    connect(): void {
        const self = this;

        if (!this.isConnected) {
            console.log(`connecting to ${urls.gameServer.websocket}`);
            this.socket.connect(urls.gameServer.websocket);
        }
        else {
            console.error('Retried connect() when websocket was still connected');
        }
    }

    reconnect() : void {
        const self = this;

        if (self.isConnected) {
            // still connected
            console.log(`tried reconnect but bool is still: ${self.isConnected}`)
        }

        if (self.connection !== undefined) {
            if (self.connection.connected) {
                // cannot reconnect
                console.log(`tried reconnect but connection is still: ${self.connection}`);
            }
            else {
                self.connect();
            }
        }
    }

    close() : void {
        const self = this;
        if (self.connection !== undefined && self.isConnected) {
            self.connection.close();
        }
    }

    init() : void {
        const self = this;

        self.socket.on('connectFailed', error => {
            self.isConnected = false;
            self.socketEmitter.emit('websocketConnectionFail', error);
        })

        self.socket.on('connect', connection => {
            self.isConnected = true;
            self.connection = connection;
            self.socketEmitter.emit('websocketConnected');
            console.log(`websocket connected to: ${urls.gameServer.websocket}`);

            connection.on('error', error => {
                self.isConnected = false;
                self.connection = undefined;
                self.socketEmitter.emit('websocketError', error);
                console.error(error);
            })

            connection.on('close', () => {
                self.isConnected = false;
                self.connection = undefined;
                self.socketEmitter.emit('websocketClose');
                console.log('websocket closed');
            })

            connection.on('message', message => {
                self.handleMessage(message);

                // heart beat
                function keepAlive() {
                    connection.sendUTF('keep alive');
                    setTimeout(keepAlive, 10000);
                }
                keepAlive();
            })
        })
    }

    handleMessage(message: websocket.IMessage): void {
        const self = this;
        // check valid message
        if (message === undefined || message.utf8Data === undefined) {
            return;
        }

        // parse json
        const json = JSON.parse(message.utf8Data);

        switch (json.type) {
            case 'visit':       // on initial connection, recieve secret key and login to server
                self.socketEmitter.emit('receivedVisit', json);
                break;

            case 'options':     // after login receive: options include regions, versions, saves, 
                self.socketEmitter.emit('receivedOptions', json);
                break;

            case 'slot':        // after login receive: the currently selected slot
                self.socketEmitter.emit('receivedSlot', json);
                break;

            case 'mods':        // after login receive: the list of available mods
                self.socketEmitter.emit('receivedMods', json);
                break;

            case 'starting':    // after a server start request
                self.socketEmitter.emit('receivedStarting', json);
                break;

            case 'running':     // if server is in a running state
                self.socketEmitter.emit('receivedRunning', json);
                break;

            case 'stopping':    // server is stopping
                self.socketEmitter.emit('receivedStopping', json);
                break;

            case 'info':        // after login receive: information, some of it we care about
                self.socketEmitter.emit('receivedInfo', json);
                break;

            case 'log':         // server loggin information to the website console, care about [JOIN] and [CHAT]
                self.socketEmitter.emit('receivedLog', json);
                break;

            case 'console':     // server writes to console, dunno what i want to do with this
                self.socketEmitter.emit('receivedConsole', json);
                break;

            case 'idle':        // server is idle do nothing
                self.socketEmitter.emit('receivedIdle', json);
                break;

            default:
                break;
        }
    }
}
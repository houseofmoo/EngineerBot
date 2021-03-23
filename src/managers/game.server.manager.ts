import { ModHandler } from '../handlers/mod.handler';
import { SocketManager } from './socket.manager';
import { DiscordMessageEmitter, SocketEmitter } from '../handlers/emitters';
import { getCommandHelp, getAllCommandHelp } from '../helpers/command.list'
import { login } from '../helpers/requests';
import { removeGameServer } from '../database/game.server.db';
import { removeSlots } from '../database/slot.db';
import { removeGameMods } from '../database/mod.db';

// mananges a single game server for guild
export class GameServerManager {
    guildId: string;
    serverName: string;
    serverToken: string;
    
    visitSecret: string | undefined;
    launchId: string | undefined;
    isStarting: boolean;
    isRunning: boolean;
    isOffline: boolean;
    
    modHandler: ModHandler;                     // handle game server mod related tasks
    socketHandler: SocketManager;               // handles websocket connection between us and game server
    socketEmitter: SocketEmitter;               // needs to be created here since there will be a socket per GameServerManager
    discordEmitter: DiscordMessageEmitter;      // allows us to send discord messages


    constructor(guildId: string, serverName: string, serverToken: string, discordEmitter: DiscordMessageEmitter) {
        this.guildId = guildId;
        this.serverName = serverName;
        this.serverToken = serverToken;

        this.visitSecret = undefined;
        this.launchId = undefined;
        this.isStarting = false;
        this.isRunning = false;
        this.isOffline = true;
        
        this.modHandler = new ModHandler();
        this.socketEmitter = new SocketEmitter();
        this.socketHandler = new SocketManager(this.serverToken, this.socketEmitter);
        this.discordEmitter = discordEmitter;

        this.addListeners();
        this.socketHandler.connect();
    }

    addListeners() {
        this.captureConnected = this.captureConnected.bind(this);
        this.socketEmitter.addListener('websocketConnected', this.captureConnected);

        this.captureConnectionFail = this.captureConnectionFail.bind(this);
        this.socketEmitter.addListener('websocketConnectionFail', this.captureConnectionFail);

        this.captureError = this.captureError.bind(this);
        this.socketEmitter.addListener('websocketError', this.captureError);

        this.captureClose = this.captureClose.bind(this);
        this.socketEmitter.addListener('websocketClose', this.captureClose);

        this.captureVisit = this.captureVisit.bind(this);
        this.socketEmitter.addListener('receivedVisit', this.captureVisit);

        this.captureOptions = this.captureOptions.bind(this);
        this.socketEmitter.addListener('receivedOptions', this.captureOptions);

        this.captureSlot = this.captureSlot.bind(this);
        this.socketEmitter.addListener('receivedSlot', this.captureSlot);

        this.captureMods = this.captureMods.bind(this);
        this.socketEmitter.addListener('receivedMods', this.captureMods);

        this.captureStarting = this.captureStarting.bind(this);
        this.socketEmitter.addListener('receivedStarting', this.captureStarting);

        this.captureRunning = this.captureRunning.bind(this);
        this.socketEmitter.addListener('receivedRunning', this.captureRunning);

        this.captureStopping = this.captureStopping.bind(this);
        this.socketEmitter.addListener('receivedStopping', this.captureStopping);

        this.captureInfo = this.captureInfo.bind(this);
        this.socketEmitter.addListener('receivedInfo', this.captureInfo);

        this.captureLog = this.captureLog.bind(this);
        this.socketEmitter.addListener('receivedLog', this.captureLog);

        this.captureConsole = this.captureConsole.bind(this);
        this.socketEmitter.addListener('receivedConsole', this.captureConsole);

        this.captureIdle = this.captureIdle.bind(this);
        this.socketEmitter.addListener('receivedIdle', this.captureIdle);
    }

    async handleCommand(commandId: string, args: string[]) {
        const self = this;
        switch (commandId) {
            case 'server-slot-list':
                self.listSlots(args);
                break;

            case 'server-mod-install':
                self.installMod(args);
                break;

            case 'server-mod-delete':
                self.deleteMod(args);
                break;

            case 'server-mod-list':
                self.listModOnServer(args);
                break;

            case 'server-mod-update':
                self.updateMod(args);
                break;

            case 'server-start':
                self.serverStart(args)
                break;

            case 'server-stop':
                self.serverStop();
                break;

            case 'msg':
            case 'server-msg':
                self.sendMessage(args);
                break;

            case 'promote':
                self.promote(args);
                break;

            case 'promote-add':
                self.addPromote(args);
                break;

            case 'promote-remove':
                self.removePromote(args);
                break;

            case 'promote-list':
                self.promoteList(args);
                break;

            case 'mod-activate':
                self.activateMod(args);
                break;

            case 'mod-deactivate':
                self.deactivateMod(args);

            case 'mod-list':
                self.listModsBySlot(args);
                break;

            case 'commands':
            default:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, getAllCommandHelp());
                break;
        }
    }

    async remove() {
        const self = this;
        self.socketHandler.close();
        await removeGameServer(self.guildId, self.serverToken);
        await removeSlots(self.guildId, self.serverToken);
        await removeGameMods(self.guildId, self.serverToken);
    }

    listSlots(args: string[]): void {
        this.discordEmitter.emit('sendManagementMsg', 'listing slots');
    }

    installMod(args: string[]): void {
        this.discordEmitter.emit('sendManagementMsg', 'installing mod');
    }

    deleteMod(args: string[]): void {
        this.discordEmitter.emit('sendManagementMsg', 'deleting mod');
    }

    listModOnServer(args: string[]): void {
        this.discordEmitter.emit('sendManagementMsg', 'listing mods');
    }

    updateMod(args: string[]): void {
        this.discordEmitter.emit('sendManagementMsg', 'updating mod');
    }

    serverStart(args: string[]): void {
        // const self = this;

        // // check valid slot name
        // if (args === undefined || args.length != 2) {
        //     self.discordEmitter.emit('sendManagementMsg', getCommandHelp('server-start'));
        //     return;
        // }

        // // confirm connected to socket
        // if (self.visitSecret === undefined) {
        //     self.discordEmitter.emit('sendManagementMsg', 'Disconnected from game servers, reconnecting. try command again in a few moments');
        //     this.socketHandler.reconnect();
        //     return;
        // }

        // const serverName = args[0];
        // const slotName = args[1];

        // const slotData = self.serverData.serverSlots.find(s => s.slotName === slotName);
        // if (slotData !== undefined) {

        // }

        // // check if we have a visit secret
        // // send server start
        // // reply with response
    }

    serverStop(): void {

    }

    sendMessage(args: string[]): void {

    }

    promote(args: string[]): void {

    }

    addPromote(args: string[]): void {

    }

    removePromote(args: string[]): void {

    }

    promoteList(args: string[]): void {

    }

    activateMod(args: string[]): void {
        const self = this;

        // serverName, slotName, modName
        if (args.length !== 3) {
            self.discordEmitter.emit('sendManagementMsg', getCommandHelp('mod-activate'));
            return;
        }

        // get the slot info from server

        // if we cant find slot, we're done

        // check the slot mods list, remove the mod if its there and inform guild

        // if slot didnt contain mod, do nothing but inform the guild

        
    }

    deactivateMod(args: string[]): void {

    }

    listModsBySlot(args: string[]): void {

    }

    captureConnected() {
        const self = this;
        console.error(`${self.serverName} websocket is connected`);
    }

    captureConnectionFail() {
        const self = this;
        self.visitSecret = undefined;
        self.launchId = undefined;
        console.error(`${self.serverName} websocket connection failed`);
    }

    captureError() {
        const self = this;
        self.visitSecret = undefined;
        self.launchId = undefined;
        console.error(`${self.serverName} websocket had an error`);
    }

    captureClose() {
        const self = this;
        self.visitSecret = undefined;
        self.launchId = undefined;
        console.error(`${self.serverName} websocket connection closed`);
        //self.socketHandler.reconnect();
        // TODO: reconnection logic, we cant just put it here as we call close on the websocket ourselves cometimes
        // perhaps we only reconnect on error?
        // or we check if the websocket it alive before a command is issue
    }

    async captureVisit(json: any): Promise<void> {
        const self = this;
        console.log('captured visit');
        self.visitSecret = json.secret;
        if (self.visitSecret !== undefined) {
            await login(self.visitSecret, self.serverToken)
        }
    }

    captureOptions(json: any): void {
        // json.name === regions
        // json.name === versions
        // json.name === saves

        //
    }

    captureSlot(json: any): void {
        //console.log(`captured slot:`);
        //console.log(json);
    }

    async captureMods(json: any): Promise<void> {
        // const self = this;
        // if (json.mods.length === 0) {
        //     return;
        // }

        // // get my db data
        // const gsmData = await getPopulatedGameServerData(self.guildId, self.serverToken);
        // if (gsmData === null) {
        //     console.error('Could not find our game server manager data on the database');
        //     return;
        // }

        // console.log('GSM DATA');
        // console.log(gsmData);

        // let newMods: {
        //     modName: string,
        //     modServerName: string,
        //     modServerId: string,
        //     version: string,
        //     enabled: boolean
        // }[] = [];

        // // compare
        // for (const mod of json.mods) {
        //     const found = gsmData.serverMods.find(myMod => myMod.modServerName === mod.text);
        //     if (found === undefined) {
        //         // split by spaces, last space is the version
        //         const split = (mod.text as string).trim().split(/ +/);
        //         let version = split.pop();
        //         let name = split.join(' ');

        //         version = version === undefined ? '0' : version;
        //         name = name === undefined ? '' : name;

        //         // add it to my list
        //         newMods.push({
        //             modName: name,
        //             modServerName: mod.text,
        //             modServerId: mod.id,
        //             version: version,
        //             enabled: mod.enabled
        //         });
        //     }
        // }

        // if (newMods.length !== 0) {
        //     console.log(`updating mods of ${self.serverName}`);
        //     updateGameServerMods(self.guildId, self.serverToken, newMods);
        // }
    }

    captureStarting(json: any): void {
        const self = this;

        self.isStarting = true;
        self.launchId = json.launchId;

        self.discordEmitter.emit('sendManagementMsg', `${self.serverName} is starting`);
    }

    captureRunning(json: any): void {
        const self = this;

        self.isRunning = true;
        self.launchId = json.launchId;

        self.discordEmitter.emit('sendManagementMsg', `${self.serverName} is onnline at ${json.socket}`);
    }

    captureStopping(json: any): void {
        const self = this;
        self.discordEmitter.emit('sendManagementMsg', `${self.serverName} is shutting down`);
    }

    captureInfo(json: any): void {
        const self = this;

        switch (json.line) {
            case 'ready':
                self.isRunning = false;
                self.isStarting = false;
                self.isOffline = true;
                self.launchId = undefined;
                self.discordEmitter.emit('sendManagementMsg', `${self.serverName} is offline`);
                break;

            case 'provisioning virtual machine, this will take an extra minute':
                self.discordEmitter.emit('sendManagementMsg', `${self.serverName} start up is slowed`);
                break;
        }
    }

    captureLog(json: any): void {

    }

    captureConsole(json: any): void {

    }

    captureIdle(json: any): void {

    }

    async saveDocument() {
        // const self = this;

        // // connect to db
        // const mongoose = await mongoConnect();

        // try {
        //     const result = await self.serverData.save();
        // }
        // catch (error) {
        //     console.log(error);
        //     this.discordEmitter.emit('sendManagementMsg', 'Error: could not connect to database');
        // }
        // finally {
        //     mongoose.connection.close();
        // }
    }
}
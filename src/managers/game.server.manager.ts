import { ModHandler } from '../helpers/mod.handler';
import { SocketManager } from './socket.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { getServerCommand, getServerCommands, getServerCommandHelp } from '../helpers/command.list'
import { login, startServer, stopServer } from '../helpers/requests';
import { removeGameServer } from '../database/game.server.db';
import { addGameMods, getGameMods, replaceGameMods, removeGameMods } from '../database/mod.db';
import { addSaves, getSaves, removeSaves, updateSaves } from '../database/saves.db';
import { GameServerMods } from '../models/data.types';

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
        this.socketHandler = new SocketManager(this.serverToken);
        this.discordEmitter = discordEmitter;

        this.addListeners();
        this.socketHandler.connect();
    }

    addListeners() {
        this.captureConnected = this.captureConnected.bind(this);
        this.socketHandler.socketEmitter.addListener('websocketConnected', this.captureConnected);

        this.captureConnectionFail = this.captureConnectionFail.bind(this);
        this.socketHandler.socketEmitter.addListener('websocketConnectionFail', this.captureConnectionFail);

        this.captureError = this.captureError.bind(this);
        this.socketHandler.socketEmitter.addListener('websocketError', this.captureError);

        this.captureClose = this.captureClose.bind(this);
        this.socketHandler.socketEmitter.addListener('websocketClose', this.captureClose);

        this.captureVisit = this.captureVisit.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedVisit', this.captureVisit);

        this.captureOptions = this.captureOptions.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedOptions', this.captureOptions);

        this.captureSlot = this.captureSlot.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedSlot', this.captureSlot);

        this.captureMods = this.captureMods.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedMods', this.captureMods);

        this.captureStarting = this.captureStarting.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedStarting', this.captureStarting);

        this.captureRunning = this.captureRunning.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedRunning', this.captureRunning);

        this.captureStopping = this.captureStopping.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedStopping', this.captureStopping);

        this.captureInfo = this.captureInfo.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedInfo', this.captureInfo);

        this.captureLog = this.captureLog.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedLog', this.captureLog);

        this.captureConsole = this.captureConsole.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedConsole', this.captureConsole);

        this.captureIdle = this.captureIdle.bind(this);
        this.socketHandler.socketEmitter.addListener('receivedIdle', this.captureIdle);
    }

    async handleCommand(commandId: string, args: string[]) {
        const self = this;

        // confirm command and args are valid
        const command = getServerCommand(commandId);
        if (command === undefined) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `I do not know how to do that: ${commandId}`);
            return;
        }
        else if (command.argCount !== args.length) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, getServerCommandHelp(commandId));
            return;
        }

        switch (commandId) {
            case 'slot-list':
                self.listSlots(args);
                break;

            case 'mod-install':
                self.installMod(args);
                break;

            case 'mod-delete':
                self.deleteMod(args);
                break;

            case 'server-mod-list':
                self.listModOnServer(args);
                break;

            case 'mod-update':
                self.updateMod(args);
                break;

            case 'start':
                self.serverStart(args)
                break;

            case 'stop':
                self.serverStop();
                break;

            case 'msg':
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

            case 'slot-mod-list':
                self.listModsBySlot(args);
                break;

            case 'commands':
            // TODO: send a list of command specific to server channels (commands we handle here)
            default:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, getServerCommands());
                break;
        }
    }

    async remove() {
        const self = this;
        self.socketHandler.close();
        await removeGameServer(self.guildId, self.serverToken);
        await removeSaves(self.guildId, self.serverToken);
        await removeGameMods(self.guildId, self.serverToken);
    }

    listSlots(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'listing slots');
    }

    installMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'installing mod');
    }

    deleteMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'deleting mod');
    }

    listModOnServer(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'listing mods');
    }

    updateMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'updating mod');
    }

    async serverStart(args: string[]) {
        const self = this;

        // TODO: confirm server is not already online
        const slotName = args[0];
        if (!["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7", "slot8", "slot9"].includes(args[0])) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${args[0]} is not a valid slot`);
            return;
        }
        
        // confirm connected to socket
        if (self.visitSecret === undefined) {
            self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Disconnected from game servers, reconnecting');
            this.socketHandler.reconnect();
            // TODO: should probably attempt to start server on our own?
            // setTimeout(self.serverStart, 10000); // how do i get args into this?
            return;
        }
        
        await startServer(self.visitSecret, 'us-west', slotName, '1.1.27');
    }

    async serverStop() {
        // TODO: confirm server isnt offline already
        const self = this;
        if (self.visitSecret !== undefined && self.launchId !== undefined) {
            await stopServer(self.visitSecret, self.launchId);
            return;
        }

        self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server offline'); // better way to confirm this?
    }

    sendMessage(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'sending message to server');
    }

    promote(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'promoting user');
    }

    addPromote(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'adding user to promote list');
    }

    removePromote(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'removing user from promote list');
    }

    promoteList(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'print promote list');
    }

    activateMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'activating mod');

        // slotName, modName


        // get the slot info from server

        // if we cant find slot, we're done

        // check the slot mods list, remove the mod if its there and inform guild

        // if slot didnt contain mod, do nothing but inform the guild


    }

    deactivateMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'deactivating mod');
    }

    listModsBySlot(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'listing mods by slot');
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

    async captureVisit(json: any) {
        const self = this;
        console.log('captured visit');
        self.visitSecret = json.secret;
        if (self.visitSecret !== undefined) {
            await login(self.visitSecret, self.serverToken)
        }
    }

    async captureOptions(json: any) {
        const self = this;
   
        switch (json.name) {
            case 'saves':
                // confirm document exists, if it doesnt create it
                const saves = await getSaves(self.guildId, self.serverToken);
                if (saves === undefined) {
                    await addSaves(self.guildId, self.serverToken);
                }

                // update document
                await updateSaves(self.guildId, self.serverToken, {
                    guildId: self.guildId,
                    token: self.serverToken,
                    slot1: json.options.slot1,
                    slot2: json.options.slot2,
                    slot3: json.options.slot3,
                    slot4: json.options.slot4,
                    slot5: json.options.slot5,
                    slot6: json.options.slot6,
                    slot7: json.options.slot7,
                    slot8: json.options.slot8,
                    slot9: json.options.slot9,
                });
                break;

            case 'regions':
                console.log('capture regions');
                break;

            case 'versions':
                console.log('capture versions');
                break;
        }
    }

    async captureSlot(json: any) {
        // this happens too fast, we cannot use it to access db
    }

    async captureMods(json: any) {
        const self = this;

        // confirm mods document exists
        const serverMods: any = await getGameMods(self.guildId, self.serverToken);
        if (serverMods === undefined) {
            await addGameMods(self.guildId, self.serverToken);
        }


        // replace game mods document with the game mods we receive here
        const updatedModsList: GameServerMods = {
            guildId: self.guildId,
            token: self.serverToken,
            mods: []
        }

        for (const mod of json.mods) {
            const split = (mod.text as string).trim().split(/ +/);
            let modVersion = split.pop();
            let modName = split.join(' ');
            
            const found = serverMods.data.mods.find((m:any) => m.name === modName);
            if (found === undefined) {
                // mod we dont know about
                updatedModsList.mods.push({
                    name: modName === undefined ? 'UnknownName' : modName,
                    version: modVersion === undefined ? '0' : modVersion,
                    modId: mod.id,
                    activeOn: ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7", "slot8", "slot9"]
                });
            }
            else {
                // mod we know about
                updatedModsList.mods.push({
                    name: modName === undefined ? 'UnknownName' : modName,
                    version: modVersion === undefined ? '0' : modVersion,
                    modId: mod.id,
                    activeOn: found.activeOn
                });
            }

        }
        // update document
        await replaceGameMods(self.guildId, self.serverToken, serverMods);
    }

    captureStarting(json: any): void {
        const self = this;
        self.isStarting = true;
        self.launchId = json.launchId;
        self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server is spinning up`);
    }

    captureRunning(json: any): void {
        const self = this;
        self.isRunning = true;
        self.launchId = json.launchId;
        self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server online at ${json.socket}`);
    }

    captureStopping(json: any): void {
        const self = this;
        self.launchId = undefined; // should we place this here? makes sense since the shut downprocess has started
        self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server shutting down`);
    }
    
    captureInfo(json: any): void {
        const self = this;

        switch (json.line) {
            case 'ready':
                self.isRunning = false;
                self.isStarting = false;
                self.isOffline = true;
                self.launchId = undefined;
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server offline`);
                break;

            case 'provisioning virtual machine, this will take an extra minute':
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Start up is slowed, provisioning virtual machine`);
                break;
        }
    }

    captureLog(json: any): void {

    }

    captureConsole(json: any): void {

    }

    captureIdle(json: any): void {

    }
}
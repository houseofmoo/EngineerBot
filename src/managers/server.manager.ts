import discord from 'discord.js'
import { EOL } from 'os';
import { ModHandler } from '../helpers/mod.handler';
import { SocketManager } from './socket.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { getServerCommand, getServerCommands, getServerCommandHelp } from '../helpers/commands'
import { login, startServer, stopServer, chat, promote } from '../helpers/requests';
import { getServer, updateServer, removeServer } from '../database/server.db';
import { addGameMods, getGameMods, replaceGameMods, removeGameMods, updateGameMod } from '../database/mod.db';
import { addSaves, getSaves, removeSaves, updateSaves } from '../database/saves.db';
import { Server, ServerMods, GameMod } from '../models/data.types';
import { ServerState } from '../models/server.state';

// mananges a single game server for guild
export class ServerManager {
    guildId: string;
    serverName: string;
    serverToken: string;

    visitSecret: string;
    launchId: string;
    serverState: ServerState;
    serverIp: string;
    readonly validSlots: string[];

    modHandler: ModHandler;                     // handle game server mod related tasks
    socketHandler: SocketManager;               // handles websocket connection between us and game server
    discordEmitter: DiscordMessageEmitter;      // allows us to send discord messages


    constructor(guildId: string, serverName: string, serverToken: string, discordEmitter: DiscordMessageEmitter) {
        this.guildId = guildId;
        this.serverName = serverName;
        this.serverToken = serverToken;

        this.visitSecret = '';
        this.launchId = '';
        this.serverState = ServerState.Offline;
        this.serverIp = '';
        this.validSlots = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7", "slot8", "slot9"];

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

    removeListeners() {
        this.socketHandler.socketEmitter.removeAllListeners('websocketConnected');
        this.socketHandler.socketEmitter.removeAllListeners('websocketConnectionFail');
        this.socketHandler.socketEmitter.removeAllListeners('websocketError');
        this.socketHandler.socketEmitter.removeAllListeners('websocketClose');
        this.socketHandler.socketEmitter.removeAllListeners('receivedVisit');
        this.socketHandler.socketEmitter.removeAllListeners('receivedOptions');
        this.socketHandler.socketEmitter.removeAllListeners('receivedSlot');
        this.socketHandler.socketEmitter.removeAllListeners('receivedMods');
        this.socketHandler.socketEmitter.removeAllListeners('receivedStarting');
        this.socketHandler.socketEmitter.removeAllListeners('receivedRunning');
        this.socketHandler.socketEmitter.removeAllListeners('receivedStopping');
        this.socketHandler.socketEmitter.removeAllListeners('receivedInfo');
        this.socketHandler.socketEmitter.removeAllListeners('receivedLog');
        this.socketHandler.socketEmitter.removeAllListeners('receivedConsole');
        this.socketHandler.socketEmitter.removeAllListeners('receivedIdle');
    }

    async handleCommand(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        // confirm command and args are valid
        const command = getServerCommand(commandId);
        if (command === undefined) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `I do not know how to do that: ${commandId}`);
            return;
        }
        else if (command.argCount !== args.length) {
            // special cases
            if (command.commandId === 'msg' && args.length >= command.argCount) {
                // we're good, arg is a array of words that make up chat message, size just has to be greater than 1
            }
            else if (command.commandId === 'mod-activate' && args.length >= command.argCount) {
                // we're good, 1 arg is slotId, 2nd arg is name which will be an arbitrary length
            }
            else if (command.commandId === 'mod-deactivate' && args.length >= command.argCount) {
                // we're good, 1 arg is slotId, 2nd arg is name which will be an arbitrary length
            }
            else {
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, getServerCommandHelp(commandId));
                return;
            }
        }

        switch (commandId) {
            case 'save-list':
                self.listSaves(args);
                break;

            case 'mod-install':
                self.installMod(args);
                break;

            case 'mod-delete':
                self.deleteMod(args);
                break;

            case 'mod-list':
                self.listMods(args);
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
                self.sendMessage(args, message.author.username);
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
        self.removeListeners();
        await removeGameMods(self.guildId, self.serverToken);
        await removeSaves(self.guildId, self.serverToken);
        await removeServer(self.guildId, self.serverToken);
        self.socketHandler.endConnection();
    }

    isValidSlot(slotId: string) {
        const self = this;
        return self.validSlots.includes(slotId)
    }

    async listSaves(args: string[]) {
        const self = this;
        const saves: any = await getSaves(self.guildId, self.serverToken);

        const savesEmbed = new discord.MessageEmbed();
        savesEmbed.setColor('#0099ff');
        savesEmbed.setTitle('Server Saves');
        savesEmbed.addField('slot1', saves.data.slot1);
        savesEmbed.addField('slot2', saves.data.slot2);
        savesEmbed.addField('slot3', saves.data.slot3);
        savesEmbed.addField('slot4', saves.data.slot4);
        savesEmbed.addField('slot5', saves.data.slot5);
        savesEmbed.addField('slot6', saves.data.slot6);
        savesEmbed.addField('slot7', saves.data.slot7);
        savesEmbed.addField('slot8', saves.data.slot8);
        savesEmbed.addField('slot9', saves.data.slot9);

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, savesEmbed);
    }

    installMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'installing mod: not yet implemented');
    }

    deleteMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'deleting mod: not yet implemented');
    }

    async listMods(args: string[]) {
        const self = this;
        const mods: any = await getGameMods(self.guildId, self.serverToken);

        const modEmbed = new discord.MessageEmbed();
        modEmbed.setColor('#0099ff');
        modEmbed.setTitle('Server Mods');

        if (mods.data.mods.length === 0) {
            modEmbed.addField('No mods available', `install a mod with !mod-install modName`);
        }
        else {
            for (const mod of mods.data.mods) {
                modEmbed.addField(`${mod.name} ${mod.version}`, mod.activeOn.filter((m:any) => m !== '').join(', '));
            }
        }

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, modEmbed);
    }

    updateMod(args: string[]): void {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'updating mod: not yet implemented');
    }

    async serverStart(args: string[]) {
        const self = this;

        const slotId = args[0];
        if (!self.isValidSlot(slotId)) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${slotId} is not a valid slot`);
            return;
        }

        // confirm connected to socket
        if (self.visitSecret === '') {
            self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Disconnected from game servers, reconnecting. Attempt server start after a few seconds');
            this.socketHandler.connect();
            return;
        }

        switch (self.serverState) {
            case ServerState.Online:
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server online at ${self.serverIp}`);
                return;

            case ServerState.Offline:
                await startServer(self.visitSecret, 'us-west', slotId, '1.1.27');
                return;

            case ServerState.Starting:
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server is starting up');
                return;

            case ServerState.Stopping:
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server is shutting down. Please wait for shutdown before requesting server launch');
                return;
        }
    }

    async serverStop() {
        const self = this;
        switch (self.serverState) {
            case ServerState.Online:
                await stopServer(self.visitSecret, self.launchId);
                return;

            case ServerState.Offline:
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server offline');
                return;

            case ServerState.Starting:
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Please wait for server to finish starting before attempting to shutdown');
                return;

            case ServerState.Stopping:
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Shutdown process is underway');
                return;
        }
    }

    sendMessage(args: string[], username: string): void {
        const self = this;
        switch (self.serverState) {
            case ServerState.Online:
                chat(self.visitSecret, self.launchId, username, args.join(' '));
                break;

            case ServerState.Offline:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server offline');
                return;

            case ServerState.Starting:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server booting up');
                return;

            case ServerState.Stopping:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server shutting down');
                return;
        }
    }

    promote(args: string[]): void {
        const self = this;
        const username = args[0];

        switch (self.serverState) {
            case ServerState.Online:
                promote(self.visitSecret, self.launchId, username);
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Promoting user ${username} to server admin`);
                break;

            case ServerState.Offline:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server offline');
                return;

            case ServerState.Starting:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server booting up');
                return;

            case ServerState.Stopping:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Server shutting down');
                return;
        }
    }

    async addPromote(args: string[]) {
        const self = this;
        const username = args[0];
        const serverData: any = await getServer(self.guildId, self.serverToken);

        const updatedServer: Server = {
            guildId: self.guildId,
            name: self.serverName,
            token: self.serverToken,
            region: 'us-west',
            version: '1.1.27',
            admins: serverData.data.admins,
        }
        updatedServer.admins.push(username);
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Adding ${username} to auto promote list`);
        await updateServer(updatedServer, serverData.ref);
    }

    async removePromote(args: string[]) {
        const self = this;
        const username = args[0];
        const serverData: any = await getServer(self.guildId, self.serverToken);

        const updatedServer: Server = {
            guildId: self.guildId,
            name: self.serverName,
            token: self.serverToken,
            region: 'us-west',
            version: '1.1.27',
            admins: serverData.data.admins,
        }
        const index = updatedServer.admins.indexOf(username);
        if (index === -1) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${username} is not on the promote list`);
            return;
        }

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Removing ${username} from auto promote list`);
        updatedServer.admins.splice(index, 1);
        await updateServer(updatedServer, serverData.ref);
    }

    async promoteList(args: string[]) {
        const self = this;
        const serverData: any = await getServer(self.guildId, self.serverToken);
        const promotable = serverData.data.admins;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, promotable.join(', '));
    }

    async activateMod(args: string[]) {
        const self = this;

        const slotId = args.shift();
        const modName = args.join(' ');

        let modFound = false;
        let slotNotFound = false;

        // confirm valid slot
        if (slotId === undefined || !self.isValidSlot(slotId)) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${slotId} is not a valid slot`);
            return;
        }

        // get mods for this server
        const mods: any = await getGameMods(self.guildId, self.serverToken);
        let updatedMod: GameMod = {
            name: '',
            version: '',
            modId: '',
            activeOn: []
        }

        // iterate over mods and look for the mod we want to add activate
        for (const mod of mods.data.mods) {
            if (mod.name === modName) {
                modFound = true;
                if (!mod.activeOn.includes(slotId)) {
                    slotNotFound = true;
                    updatedMod = {
                        name: mod.name,
                        version: mod.version,
                        modId: mod.modId,
                        activeOn: mod.activeOn
                    };
                    const slotNum = Number(slotId.charAt(slotId.length - 1));
                    updatedMod.activeOn[slotNum - 1] = slotId;
                }

                // once we found the mod, we're done
                break;
            }
        }

        // update document
        if (modFound && slotNotFound) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} is now activated on ${slotId}`);
            await updateGameMod(self.guildId, self.serverToken, updatedMod);
        }
        else if (!slotNotFound) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was already active on ${slotId}`);
        }
        else {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was not found on server`);
        }
    }

    async deactivateMod(args: string[]) {
        const self = this;

        const slotId = args.shift();
        const modName = args.join(' ');

        let modFound = false;
        let slotFound = false;

        // confirm valid slot
        if (slotId === undefined || !self.isValidSlot(slotId)) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${slotId} is not a valid slot`);
            return;
        }

        // get mods for this server
        const mods: any = await getGameMods(self.guildId, self.serverToken);
        let updatedMod: GameMod = {
            name: '',
            version: '',
            modId: '',
            activeOn: []
        }

        // iterate over mods and look for the mod we want to add activate
        for (const mod of mods.data.mods) {
            if (mod.name === modName) {
                modFound = true;
                if (mod.activeOn.includes(slotId)) {
                    slotFound = true;
                    updatedMod = {
                        name: mod.name,
                        version: mod.version,
                        modId: mod.modId,
                        activeOn: mod.activeOn
                    };

                    const slotNum = Number(slotId.charAt(slotId.length - 1));
                    updatedMod.activeOn[slotNum - 1] = '';
                }

                // once we found the mod, we're done
                break;
            }
        }

        // update document
        if (modFound && slotFound) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} is now deactivated on ${slotId}`);
            await updateGameMod(self.guildId, self.serverToken, updatedMod)
        }
        else if (!slotFound) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was not active for ${slotId}`);
        }
        else {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was not found on server`);
        }
    }

    captureConnected() {
        const self = this;
        console.error(`${self.serverName} websocket is connected`);
    }

    captureConnectionFail() {
        const self = this;
        self.visitSecret = '';
        self.launchId = '';
        console.error(`${self.serverName} websocket connection failed`);
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Failed to connect to server, attempting reconnect');
        setTimeout(self.socketHandler.connect, 10000);
    }

    captureError() {
        const self = this;
        self.visitSecret = '';
        self.launchId = '';
        console.error(`${self.serverName} websocket had an error`);
    }

    captureClose() {
        const self = this;
        self.visitSecret = '';
        self.launchId = '';
        console.error(`${self.serverName} websocket connection closed`);
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'lost connection to server. attempting reconnect');
        setTimeout(self.socketHandler.connect, 10000);
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
                await updateSaves({
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
        // unused for now...
        // returns information for each slot that contains save information
    }

    async captureMods(json: any) {
        const self = this;

        // confirm mods document exists
        let serverMods: any = await getGameMods(self.guildId, self.serverToken);
        if (serverMods === undefined) {
            serverMods = await addGameMods(self.guildId, self.serverToken);
        }

        // replace game mods document with the game mods we receive here
        const updatedModsList: ServerMods = {
            guildId: self.guildId,
            token: self.serverToken,
            mods: []
        }

        for (const mod of json.mods) {
            const split = (mod.text as string).trim().split(/ +/);
            let modVersion = split.pop();
            let modName = split.join(' ');
            const found = serverMods.data.mods.find((m: any) => m.name === modName);
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
        await replaceGameMods(updatedModsList);
    }

    captureStarting(json: any): void {
        const self = this;
        self.serverState = ServerState.Starting;
        self.launchId = json.launchId;
        self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server is spinning up`);
    }

    captureRunning(json: any): void {
        const self = this;
        self.serverState = ServerState.Online;
        self.launchId = json.launchId;
        self.serverIp = json.socket;
        self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server online at ${json.socket}`);
    }

    captureStopping(json: any): void {
        const self = this;
        self.serverState = ServerState.Stopping;
        self.serverIp = '';
        self.launchId = '';
        self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Server shutting down`);
    }

    captureInfo(json: any): void {
        const self = this;

        switch (json.line) {
            case 'ready':
                self.serverState = ServerState.Offline;
                self.serverIp = '';
                self.launchId = '';
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
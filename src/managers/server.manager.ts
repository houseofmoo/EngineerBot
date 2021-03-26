import discord from 'discord.js'
import { ModHandler } from '../helpers/mod.handler';
import { SocketManager } from './socket.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { getServerCommand, getServerCommands, getServerCommandHelp, addServerAction } from '../helpers/commands'
import { login, startServer, stopServer, chat, promote, enableMod } from '../helpers/requests';
import { getServer, updateServer, removeServer } from '../database/server.db';
import { getGameMods, getGameMod, addGameMod, removeGameMod, removeAllMods, updateGameMod } from '../database/mods.db';
import { addSaves, getSaves, removeSaves, updateSaves } from '../database/saves.db';
import { Server } from '../models/data.types';
import { ServerState } from '../models/server.state';
import { ServerCommand } from '../models/command.id';

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

        this.addActions();
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

    addActions() {
        const self = this;
        self.listSaves = self.listSaves.bind(self);
        addServerAction(ServerCommand.saves, self.listSaves);

        self.installMod = self.installMod.bind(self);
        addServerAction(ServerCommand.modinstall, self.installMod);

        self.updateMod = self.updateMod.bind(self);
        addServerAction(ServerCommand.modupdate, self.updateMod);
        
        self.deleteMod = self.deleteMod.bind(self);
        addServerAction(ServerCommand.moddelete, self.deleteMod);

        self.activateMod = self.activateMod.bind(self);
        addServerAction(ServerCommand.modon, self.activateMod);

        self.deactivateMod = self.deactivateMod.bind(self);
        addServerAction(ServerCommand.modoff, self.deactivateMod);

        self.listMods = self.listMods.bind(self);
        addServerAction(ServerCommand.mods, self.listMods);

        self.serverStart = self.serverStart.bind(self);
        addServerAction(ServerCommand.start, self.serverStart);

        self.serverStop = self.serverStop.bind(self);
        addServerAction(ServerCommand.stop, self.serverStop);

        self.sendMessage = self.sendMessage.bind(self);
        addServerAction(ServerCommand.msg, self.sendMessage);

        self.promote = self.promote.bind(self);
        addServerAction(ServerCommand.promote, self.promote);

        self.addPromote = self.addPromote.bind(self);
        addServerAction(ServerCommand.promoteadd, self.addPromote);

        self.removePromote = self.removePromote.bind(self);
        addServerAction(ServerCommand.promoteremove, self.removePromote);

        self.promoteList = self.promoteList.bind(self);
        addServerAction(ServerCommand.promotelist, self.promoteList);
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
        else if (args.length < command.minArgCount || args.length > command.maxArgCount) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, getServerCommandHelp(commandId));
            return;
        }

        // if user is asking for a list of commands
        if (command.commandId === ServerCommand.commands) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, getServerCommands());
            return;
        }

        // perform requested action
        command.action(commandId, args, message);
    }

    async remove() {
        const self = this;
        self.removeListeners();
        await removeAllMods(self.guildId, self.serverToken);
        await removeSaves(self.guildId, self.serverToken);
        await removeServer(self.guildId, self.serverToken);
        self.socketHandler.endConnection();
    }

    isValidSlot(slotId: string) {
        const self = this;
        return self.validSlots.includes(slotId)
    }

    async listSaves(commandId: string, args: string[], message: discord.Message) {
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

    async installMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'installing mod: not yet implemented');
    }

    async updateMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'updating mod: not yet implemented');
    }

    async deleteMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'deleting mod: not yet implemented');
    }

    async activateMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        const slotId = args.shift();
        const modName = args.join(' ');
        console.log(modName);
        let multipleMods = [];
        if (modName.includes(',')) {
            multipleMods = modName.split(',');
            console.log(multipleMods);
            return;
        }

        // confirm valid slot
        if (slotId === undefined || !self.isValidSlot(slotId)) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${slotId} is not a valid slot`);
            return;
        }

        // get mods for this server
        const mod: any = await getGameMod(self.guildId, self.serverToken, modName);
        if (mod === undefined) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was not found on server`);
            return;
        }

        const modifiedMod = {
            guildId: self.guildId,
            token: self.serverToken,
            name: mod.data.name,
            version: mod.data.version,
            modId: mod.data.modId,
            activeOn: mod.data.activeOn
        }

        if (!modifiedMod.activeOn.includes(slotId)) {
            const slotNum = Number(slotId.charAt(slotId.length - 1));
            modifiedMod.activeOn[slotNum - 1] = slotId;
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} is now activated on ${slotId}`);
            await updateGameMod(modifiedMod, mod.ref);
            return;
        }

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was already active on ${slotId}`);
    }

    async deactivateMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        const slotId = args.shift();
        const modName = args.join(' ');

        // confirm valid slot
        if (slotId === undefined || !self.isValidSlot(slotId)) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${slotId} is not a valid slot`);
            return;
        }

        // get mods for this server
        const mod: any = await getGameMod(self.guildId, self.serverToken, modName);
        if (mod === undefined) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was not found on server`);
            return;
        }

        const modifiedMod = {
            guildId: self.guildId,
            token: self.serverToken,
            name: mod.data.name,
            version: mod.data.version,
            modId: mod.data.modId,
            activeOn: mod.data.activeOn
        }

        if (modifiedMod.activeOn.includes(slotId)) {
            const slotNum = Number(slotId.charAt(slotId.length - 1));
            modifiedMod.activeOn[slotNum - 1] = '';
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} is now deactivated on ${slotId}`);
            await updateGameMod(modifiedMod, mod.ref);
            return;
        }

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${modName} was already inactive on ${slotId}`);
    }

    async listMods(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        const mods: any = await getGameMods(self.guildId, self.serverToken);

        const modEmbed = new discord.MessageEmbed();
        modEmbed.setColor('#0099ff');
        modEmbed.setTitle(`Server Mods`);

        if (mods !== undefined) {
            if (mods.data.length !== 0) {
                modEmbed.setTitle(`Server Mods (${mods.data.length})`);
                for (const mod of mods.data) {
                    modEmbed.addField(`${mod.data.name} ${mod.data.version}`, mod.data.activeOn.filter((m: any) => m !== '').join(', '));
                }

                this.discordEmitter.emit('sendGameServerMsg', self.serverName, modEmbed);
            }
            else {
                modEmbed.addField('No mods available', `install a mod with !mod-install modName`);
            }
        }
        else {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'Unable to get find mods in database');
        }
    }

    async serverStart(commandId: string, args: string[], message: discord.Message) {
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
                // activate mods appropriate for slot
                const mods: any = await getGameMods(self.guildId, self.serverToken);
                if (mods != undefined) {
                    const requests = [];
                    for (const mod of mods.data) {
                        if (mod.data.activeOn.includes(slotId)) {
                            requests.push(enableMod(self.visitSecret, mod.data.modId, true));
                        }
                        else {
                            requests.push(enableMod(self.visitSecret, mod.data.modId, false));
                        }
                    }

                    await Promise.all(requests);
                }

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

    async serverStop(commandId: string, args: string[], message: discord.Message) {
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

    async sendMessage(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        switch (self.serverState) {
            case ServerState.Online:
                chat(self.visitSecret, self.launchId, message.author.username, args.join(' '));
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

    async promote(commandId: string, args: string[], message: discord.Message) {
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

    async addPromote(commandId: string, args: string[], message: discord.Message) {
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

    async removePromote(commandId: string, args: string[], message: discord.Message) {
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

    async promoteList(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        const serverData: any = await getServer(self.guildId, self.serverToken);
        const promotable = serverData.data.admins;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, promotable.join(', '));
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
                let saves: any = await getSaves(self.guildId, self.serverToken);
                if (saves === undefined) {
                    saves = await addSaves(self.guildId, self.serverToken);
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
                }, saves.ref);
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

        // check for mods
        const response: any = await getGameMods(self.guildId, self.serverToken);
        if (response !== undefined && response.data.length !== 0) {
            // remove all mods since server is the baseline
            await removeAllMods(self.guildId, self.serverToken);
            const knownMods = response.data;
            let serverMods = json.mods;

            for (const mod of serverMods) {
                const split = (mod.text as string).trim().split(/ +/);
                const modVersion = split.pop();
                const modName = split.join(' ');
                const modId = mod.Id;

                const found = knownMods.find((m: any) => m.data.name === modName)
                await addGameMod({
                    guildId: self.guildId,
                    token: self.serverToken,
                    name: modName,
                    version: modVersion === undefined ? '0' : modVersion,
                    modId: modId,
                    activeOn: found === undefined ? // if we didnt find a record use defaults. if record didnt have any active on info, use default
                        self.validSlots : found.data.activeOn === undefined ?
                            self.validSlots : found.data.activeOn
                });
            }
        }
        else {
            // no mods existed
            let serverMods = json.mods;
            for (const mod of serverMods) {
                const split = (mod.text as string).trim().split(/ +/);
                const modVersion = split.pop();
                const modName = split.join(' ');
                const modId = mod.Id;

                await addGameMod({
                    guildId: self.guildId,
                    token: self.serverToken,
                    name: modName,
                    version: modVersion === undefined ? '0' : modVersion,
                    modId: modId,
                    activeOn: self.validSlots
                })
            }
        }
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
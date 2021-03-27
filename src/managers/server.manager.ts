import discord from 'discord.js'
import fs from 'fs';
import { ModHandler } from '../helpers/mod.handler';
import { SocketManager } from './socket.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { login, startServer, stopServer, chat, promote, enableMod, getModAuthToken, getModInfo, downloadMod, uploadModToServer } from '../helpers/requests';
import { getServer, updateServer, removeServer } from '../database/server.db';
import { getGameMods, getGameMod, addGameMod, removeAllMods, updateGameMod } from '../database/mods.db';
import { addSaves, getSaves, removeSaves, updateSaves } from '../database/saves.db';
import { Server } from '../models/data.types';
import { ServerState } from '../models/server.state';
import { ServerCommand } from '../models/command.id';
import { ServerCommands } from '../commands/server.commands';
import config from '../data/config.json'

export class ServerManager {
    readonly guildId: string;
    readonly serverName: string;
    readonly serverToken: string;

    visitSecret: string;
    launchId: string;
    serverState: ServerState;
    serverIp: string;
    previousLog: string; // we need this cause the game server likes to send duplicate logs...
    readonly validSlots: string[];

    modHandler: ModHandler;
    socketHandler: SocketManager;
    discordEmitter: DiscordMessageEmitter;

    serverCommands: ServerCommands;


    constructor(guildId: string, serverName: string, serverToken: string, discordEmitter: DiscordMessageEmitter) {
        this.guildId = guildId;
        this.serverName = serverName;
        this.serverToken = serverToken;

        this.visitSecret = '';
        this.launchId = '';
        this.serverState = ServerState.Offline;
        this.serverIp = '';
        this.previousLog = '';
        this.validSlots = ["slot1", "slot2", "slot3", "slot4", "slot5", "slot6", "slot7", "slot8", "slot9"];

        this.modHandler = new ModHandler();
        this.socketHandler = new SocketManager(this.serverToken);
        this.discordEmitter = discordEmitter;

        this.serverCommands = new ServerCommands();

        this.addActions();
        this.addListeners();
        this.socketHandler.connect();
    }

    private addListeners() {
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

    private addActions() {
        const self = this;
        self.listSaves = self.listSaves.bind(self);
        self.serverCommands.addServerAction(ServerCommand.saves, self.listSaves);

        self.installMod = self.installMod.bind(self);
        self.serverCommands.addServerAction(ServerCommand.modinstall, self.installMod);

        self.updateMod = self.updateMod.bind(self);
        self.serverCommands.addServerAction(ServerCommand.modupdate, self.updateMod);

        self.deleteMod = self.deleteMod.bind(self);
        self.serverCommands.addServerAction(ServerCommand.moddelete, self.deleteMod);

        self.activateMod = self.activateMod.bind(self);
        self.serverCommands.addServerAction(ServerCommand.modon, self.activateMod);

        self.deactivateMod = self.deactivateMod.bind(self);
        self.serverCommands.addServerAction(ServerCommand.modoff, self.deactivateMod);

        self.listMods = self.listMods.bind(self);
        self.serverCommands.addServerAction(ServerCommand.mods, self.listMods);

        self.serverStart = self.serverStart.bind(self);
        self.serverCommands.addServerAction(ServerCommand.start, self.serverStart);

        self.serverStop = self.serverStop.bind(self);
        self.serverCommands.addServerAction(ServerCommand.stop, self.serverStop);

        self.sendMessage = self.sendMessage.bind(self);
        self.serverCommands.addServerAction(ServerCommand.msg, self.sendMessage);

        self.promote = self.promote.bind(self);
        self.serverCommands.addServerAction(ServerCommand.promote, self.promote);

        self.addPromote = self.addPromote.bind(self);
        self.serverCommands.addServerAction(ServerCommand.promoteadd, self.addPromote);

        self.removePromote = self.removePromote.bind(self);
        self.serverCommands.addServerAction(ServerCommand.promoteremove, self.removePromote);

        self.promoteList = self.promoteList.bind(self);
        self.serverCommands.addServerAction(ServerCommand.promotelist, self.promoteList);

        self.status = self.status.bind(self);
        self.serverCommands.addServerAction(ServerCommand.status, self.status);

        self.info = self.info.bind(self);
        self.serverCommands.addServerAction(ServerCommand.info, self.info);
    }

    private removeListeners() {
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

    private isValidSlot(slotId: string) {
        const self = this;
        return self.validSlots.includes(slotId)
    }

    async handleCommand(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        // confirm command and args are valid
        const command = self.serverCommands.getServerCommand(commandId);
        if (command === undefined) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `I do not know how to do that: ${commandId}. type !commands for help`);
            return;
        }
        else if (args.length < command.minArgCount || args.length > command.maxArgCount) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, self.serverCommands.getServerCommandHelp(commandId));
            return;
        }

        // if user is asking for a list of commands
        if (command.commandId === ServerCommand.commands) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, self.serverCommands.getServerCommands());
            return;
        }

        // perform requested action
        command.action(commandId, args, message);
    }

    private setState(newState: ServerState) {
        const self = this;

        if (newState === self.serverState) {
            return;
        }

        // set the new state and emit a message about state change
        self.serverState = newState;
        switch (self.serverState) {
            case ServerState.Online:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Online at ${self.serverIp}`);
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

    async remove() {
        const self = this;
        self.removeListeners();
        await removeAllMods(self.guildId, self.serverToken);
        await removeSaves(self.guildId, self.serverToken);
        await removeServer(self.guildId, self.serverToken);
        self.socketHandler.endConnection();
    }

    async listSaves(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        const saves: any = await getSaves(self.guildId, self.serverToken);

        const savesEmbed = new discord.MessageEmbed();
        savesEmbed.setColor('#0099ff');
        savesEmbed.setTitle('Save Slots');
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

        // https://factorio.zone/api/mod/upload
        // expects a visitSecret, file: (binary), size: number
        // responds with 200 if OK, websocket sents a type.info that says "uploaded mod <modname>" and "stored mod <modname>"

        // // download mod
        // let modName = args[0].trim();

        // // get auth token
        // const token: any = await getModAuthToken(config.factorioModsLogin.username, config.factorioModsLogin.password);

        // // get download url
        // let infoResponse: any = await getModInfo(modName);

        // if (infoResponse !== undefined && infoResponse.status === 200 &&
        //     token !== undefined && token.status === 200) {
        //     console.log('attempting download');
        //     // build download url
        //     const subUrl = infoResponse.data.releases[0].download_url;
        //     const filename = infoResponse.data.releases[0].file_name

        //     // download file
        //     self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Downloading ${modName}`);
        //     const file = fs.createWriteStream(filename);
        //     const download: any = await downloadMod(config.factorioModsLogin.username, token.data[0], subUrl);
        //     await download.data.pipe(file);
        //     self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Download complete`);
        //     console.log('download complete');

        //     // upload to server
        //     //const mod = fs.createReadStream(filename);
        //     const stats = fs.statSync(filename);
        //     console.log(filename);
        //     console.log(stats);
        //     const mod = fs.createReadStream(filename);
        //     //const uploadResponse = await uploadModToServer(self.visitSecret, mod, stats.size);
        //     //console.log(uploadResponse);
        //     //self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Uploading mod to server`);

        //     // mod.on('end', async () => {
        //     //     self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Uploading mod to server`);
        //     //     const uploadResponse = await uploadModToServer(self.visitSecret, mod);
        //     //     console.log(uploadResponse);
        //     //     // delete local file
        //     //     // fs.unlinkSync(filename, (err) => {
        //     //     //     console.log(err);
        //     //     //     console.log('error deleting file');
        //     //     // });
        //     // });
        // }
        // else {
        //     this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Error attempting to install: ${modName}`);
        //     this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Mod names are case sensitive, please try again`);
        // }
    }

    async updateMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'updating mod: not yet implemented');
    }

    async deleteMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'deleting mod: not yet implemented');

        // https://factorio.zone/api/mod/delete
        // expects visitSecret and modId
    }

    async activateMod(commandId: string, args: string[], message: discord.Message) {
        const self = this;


        const slotId = args.shift();
        const modName = args.join(' ');

        // confirm valid slot
        if (slotId === undefined || !self.isValidSlot(slotId)) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${slotId} is not a valid slot`);
            return;
        }

        // // assume multiple mods
        // if (modName.includes(',')) {
        //     let multipleMods = [];
        //     multipleMods = modName.split(',');
        //     for (const mod in multipleMods) {
        //         // TODO: how can we activate multiple mods at once efficiently?
        //     }
        // }

        // get mod for this server
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

        if (mods !== undefined) {
            const modEmbed = new discord.MessageEmbed();
            modEmbed.setColor('#0099ff');
            modEmbed.setTitle(`Game Mods`);
            if (mods.data.length !== 0) {
                modEmbed.setTitle(`Server Mods (${mods.data.length})`);
                for (const mod of mods.data) {
                    modEmbed.addField(`${mod.data.name} ${mod.data.version}`, mod.data.activeOn.filter((m: any) => m !== '').join(', '));
                }
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, modEmbed);
            }
            else {
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, 'No mods installed on server');
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
                    self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Enabling mods for ${slotId}`);
                    const requests = [];
                    for (const mod of mods.data) {
                        if (mod.data.activeOn.includes(slotId)) {
                            requests.push(enableMod(self.visitSecret, mod.data.modId, true));
                        }
                        else {
                            requests.push(enableMod(self.visitSecret, mod.data.modId, false));
                        }
                    }

                    // send request
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
        updatedServer.admins.push(username.toLowerCase()); // always insert names using lower case
        await updateServer(updatedServer, serverData.ref);

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Added ${username} to auto promote list`);
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
        const index = updatedServer.admins.indexOf(username.toLowerCase()); // all user names are lower case
        if (index === -1) {
            this.discordEmitter.emit('sendGameServerMsg', self.serverName, `${username} is not on the promote list`);
            return;
        }

        updatedServer.admins.splice(index, 1);
        await updateServer(updatedServer, serverData.ref);

        this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Removed ${username} from auto promote list`);
    }

    async promoteList(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        const serverData: any = await getServer(self.guildId, self.serverToken);
        const promotable = serverData.data.admins;
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, promotable.join(', '));
    }

    async status(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        switch (self.serverState) {
            case ServerState.Online:
                this.discordEmitter.emit('sendGameServerMsg', self.serverName, `Online at ${self.serverIp}`);
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

    async info(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        const infoEmbed = new discord.MessageEmbed();
        infoEmbed.setColor('#0099ff');
        infoEmbed.addField('Name ', self.serverName);
        infoEmbed.addField('Token ', self.serverToken);
        infoEmbed.addField('Status', self.serverState);
        if (self.serverState === ServerState.Online) {
            infoEmbed.addField('IP', self.serverIp);
        }
        this.discordEmitter.emit('sendGameServerMsg', self.serverName, infoEmbed);
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
                //console.log('capture regions');
                break;

            case 'versions':
                //console.log('capture versions');
                break;
        }
    }

    async captureSlot(json: any) {
        // unused for now...
        // returns information for each slot that contains save information
    }

    async captureMods(json: any) {
        const self = this;

        // when we first connect, or when a mod is uploaded/deleted we receive this event

        // check for mods
        const response: any = await getGameMods(self.guildId, self.serverToken);
        if (response !== undefined && response.data.length !== 0) {
            // remove all mods since server is the baseline
            await removeAllMods(self.guildId, self.serverToken);
            const knownMods = response.data;
            const serverMods = json.mods;
            const requests = [];

            for (const mod of serverMods) {
                const split = (mod.text as string).trim().split(/ +/);
                const modVersion = split.pop();
                const modName = split.join(' ');
                const modId = mod.id;

                const found = knownMods.find((m: any) => m.data.name === modName)
                requests.push(addGameMod({
                    guildId: self.guildId,
                    token: self.serverToken,
                    name: modName,
                    version: modVersion === undefined ? '0' : modVersion,
                    modId: modId,
                    activeOn: found === undefined ? // if we didnt find a record use defaults. if record didnt have any active on info, use default
                        self.validSlots : found.data.activeOn === undefined ?
                            self.validSlots : found.data.activeOn
                }));
            }

            await Promise.all(requests);
        }
        else {
            // no mods existed
            const serverMods = json.mods;
            const requests = [];
            for (const mod of serverMods) {
                const split = (mod.text as string).trim().split(/ +/);
                const modVersion = split.pop();
                const modName = split.join(' ');
                const modId = mod.id;

                requests.push(addGameMod({
                    guildId: self.guildId,
                    token: self.serverToken,
                    name: modName,
                    version: modVersion === undefined ? '0' : modVersion,
                    modId: modId,
                    activeOn: self.validSlots
                }));
            }

            await Promise.all(requests);
        }
    }

    captureStarting(json: any): void {
        const self = this;
        self.setState(ServerState.Starting);
        self.launchId = json.launchId;
    }

    captureRunning(json: any): void {
        const self = this;
        self.launchId = json.launchId;
        self.serverIp = json.socket;
        self.setState(ServerState.Online);
    }

    captureStopping(json: any): void {
        const self = this;
        self.setState(ServerState.Stopping);
        self.serverIp = '';
        self.launchId = '';
    }

    captureInfo(json: any): void {
        const self = this;

        switch (json.line) {
            case 'provisioning virtual machine, this will take an extra minute':
                self.discordEmitter.emit('sendGameServerMsg', self.serverName, `Start up is slowed, provisioning virtual machine`);
                break;
        }
    }

    async captureLog(json: any) {
        const self = this;

        // ignore log message more than 1 minute old
        if (new Date().getTime() - json.time > 60000) {
            return;
        }

        // if we recieve a duplicate message, ignore it
        if (self.previousLog === json.line) {
            return;
        }
        // capture log to check in the future
        self.previousLog = json.line;

        // handle specific events we care about
        if (json.line.includes('[JOIN]')) {
            // TODO: auto promote does not work!
            const serverData: any = await getServer(self.guildId, self.serverToken);
            console.log(serverData);
            if (serverData !== undefined) {
                // search for a valid user name in the text
                const words = json.line.split(' ');
                console.log(words);
                for (const word of words) {
                    console.log(word);
                    if (serverData.data.admins.includes(word.toLowerCase())) {
                        await promote(self.visitSecret, self.launchId, word);
                    }
                }
            }

            self.discordEmitter.emit('sendGameServerMsg', self.serverName, json.line);
        }
        // things we care about, ignore everything else
        else if (json.line.includes('[LEAVE]') ||
            json.line.includes('[CHAT]') ||
            json.line.includes('already an admin') ||
            json.line.includes('[PROMOTE]') ||
            json.line.includes('[COMMAND]')) {

            // ignore pings on land and pings on train... want to ignore all pings but this is good enough
            if (json.line.includes('[gps=') || json.line.includes('[train=')) {
                return;
            }

            self.discordEmitter.emit('sendGameServerMsg', self.serverName, json.line);
        }
    }

    captureConsole(json: any): void {
        // do not care!
    }

    captureIdle(json: any): void {
        const self = this;
        self.setState(ServerState.Offline);
        self.serverIp = '';
        self.launchId = '';
    }
}
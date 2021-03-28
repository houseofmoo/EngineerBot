import discord from 'discord.js'
import websocket from 'websocket';
import { GuildCommands } from '../commands/guild.commands';
import { GuildCommandId } from '../models/enumerations';
import { getCommandFromMessage, getCommandArgsFromMessage } from '../helpers/command.helpers.';
import { DiscordManager } from './discord.manager';
import { ServerManager } from './server.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { login } from '../helpers/requests';
import { getServers, getServerByToken, addServer } from '../database/server.db';
import { addSaves } from '../database/saves.db';
import urls from '../data/api.urls.json';

export class GuildManager {
    botClient: discord.Client;
    guildId: string;                       
    guildCommands: GuildCommands;     
    discordManager: DiscordManager;  
    gameServerManagers: ServerManager[];  
    discordEmitter: DiscordMessageEmitter;     

    constructor(guildId: string, bot: discord.Client) {
        this.guildId = guildId;
        this.botClient = bot;
        this.gameServerManagers = [];
        this.discordEmitter = new DiscordMessageEmitter();
        this.discordManager = new DiscordManager(this.guildId, this.discordEmitter, bot);
        this.guildCommands = new GuildCommands();
        this.addActions();
    }

    async initManagers() {
        const self = this;

        // get serverList
        const serverList: any = await getServers(self.guildId);
        
        // if no servers just init discord manager
        if (serverList === undefined) {
            await self.discordManager.initDiscordManager([]);
            return;
        }

        // init discord manager for servers we know about
        await self.discordManager.initDiscordManager(serverList.data);

        // init a game server manager for each server this guild has
        for (const server of serverList.data) {
            const gsm = new ServerManager(self.guildId, server.data.name, server.data.token, self.discordEmitter);
            self.gameServerManagers.push(gsm);
        }
    }

    addActions() {
        const self = this;
        self.createServer = self.createServer.bind(self);
        self.guildCommands.addGuildAction(GuildCommandId.servercreate, self.createServer);

        self.addServer = self.addServer.bind(self);
        self.guildCommands.addGuildAction(GuildCommandId.serveradd, self.addServer);

        self.removeServer = self.removeServer.bind(self);
        self.guildCommands.addGuildAction(GuildCommandId.serverremove, self.removeServer);

        self.listServers = self.listServers.bind(self);
        self.guildCommands.addGuildAction(GuildCommandId.list, self.listServers);

        self.listServers = self.listServers.bind(self);
        self.guildCommands.addGuildAction(GuildCommandId.servers, self.listServers);

        self.newPlayer = self.newPlayer.bind(self);
        self.guildCommands.addGuildAction(GuildCommandId.newplayer, self.newPlayer);
    }

    async remove() {
        const self = this;
        await Promise.all(self.gameServerManagers.map(async (gsm) => {
            await gsm.remove();
        }));

        // if we're kicked from a channel we cannot clean up after ourselves
        //await self.discordManager.remove();
    }

    receivedMessage(message: discord.Message) {
        const self = this;

        // get command and args
        const commandId = getCommandFromMessage(message);
        const args = getCommandArgsFromMessage(message);

        // is this a management message
        if (self.discordManager.isManagementChannel(message)) {
            self.handleCommand(commandId, args, message);
        }

        // is this a game server message
        if (self.discordManager.isGameServerChannel(message)) {
            const channelName = self.discordManager.getChannelName(message);
            const gsm = self.getGameServerManager(channelName);
            gsm?.handleCommand(commandId, args, message);
        }
    }

    async handleCommand(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        // confirm command and args are valid
        const command = self.guildCommands.getGuildCommand(commandId);
        if (command === undefined) {
            this.discordEmitter.emit('sendManagementMsg', `I do not know how to do that: ${commandId}`);
            return;
        }
        else if (args.length < command.minArgCount || args.length > command.maxArgCount) {
            this.discordEmitter.emit('sendManagementMsg', self.guildCommands.getGuildCommandHelp(commandId));
            return;
        }

        // if user is asking for a list of commands
        if (command.commandId === GuildCommandId.commands) {
            this.discordEmitter.emit('sendManagementMsg', self.guildCommands.getGuildCommands());
            return;
        }

        //  perform requested action
        command.action(commandId, args, message);
    }

    getGameServerManager(channelName: string | undefined): ServerManager | undefined {
        if (channelName === undefined) {
            this.discordEmitter.emit('sendManagementMsg', `Could not get channel name`);
            return undefined;
        }

        const server = this.gameServerManagers.find(r => r.serverName.toLowerCase() === channelName.toLowerCase());
        if (server === undefined) {
            this.discordEmitter.emit('sendManagementMsg', `Unknown server named ${channelName}`);
            return undefined
        }

        return server;
    }

    isKnownServerName(serverName: string) {
        const self = this;
        const serverByName = self.gameServerManagers.find(gsm => gsm.serverName === serverName);
        return serverByName !== undefined;
    }

    async isKnownToken(serverToken: string) {
        const self = this;
        // check if token is being used by this guild
        const serverByToken = self.gameServerManagers.find(gsm => gsm.serverToken === serverToken);
        if (serverByToken !== undefined) {
            return true;
        }

        // check if token is being used by another guild
        const found = await getServerByToken(serverToken);
        return found !== undefined;
    }

    async openTempTokenSocket(serverName: string, token: string | null): Promise<void> {
        // create a temporary websocket just to validate token
        const self = this;
        const socket = new websocket.client();
        socket.on('connectFailed', error => {
            return false;
        });

        socket.on('connect', connection => {
            connection.on('error', error => {
                console.error(error);
                connection.close(); // clean up
            })

            connection.on('close', () => {
                console.log('temp websocket closed');
            })

            connection.on('message', async message => {
                if (message === undefined || message.utf8Data === undefined) {
                    return;
                }

                const json = JSON.parse(message.utf8Data);
                if (json.type === 'visit') {
                    await self.validateToken(serverName, token, json);
                    connection.close();
                }
            })
        });

        socket.connect(urls.gameServer.websocket);
    }

    // validates token, if token is null gets a new token
    async validateToken(serverName: string, token: string | null, json: any): Promise<void> {
        const self = this;
        const response = await login(json.secret, token);

        // token is invalid
        if (response.status !== 200) {
            self.discordEmitter.emit('sendManagementMsg', `${token} is an invalid token. !server-create can create a server for you`);
            return;
        }

        // token was valid or we were provided with a new token
        self.createServerManager(serverName, response.data.userToken);
    }

    // add new server data to db and create game server manager
    async createServerManager(serverName: string, token: string) {
        const self = this;

        // add data to database
        const serverResult = await addServer({
            guildId: self.guildId,
            name: serverName,
            token: token,
            region: 'us-west',
            admins: []
        });
        const savesResult = await addSaves(self.guildId, token);

        // create a server manager
        const gsm = new ServerManager(self.guildId, serverName, token, self.discordEmitter);
        self.gameServerManagers.push(gsm);

        // create discord channel
        await self.discordManager.addNewChannel(gsm.serverName.toLowerCase());

        // send results to management channel
        self.discordEmitter.emit('sendManagementMsg', `${serverName} using ${token} is now being managed`);
    }

    async createServer(commandId: string, args: string[], message: discord.Message) {
        const serverName = args[0];

        // check values are good
        if (this.isKnownServerName(serverName)) {
            this.discordEmitter.emit('sendManagementMsg', `${serverName} already in use`)
            return;
        }

        // confirm valid token -> if we confirm the server token is good we create the server
        this.openTempTokenSocket(serverName, null);
    }

    async addServer(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        const serverName = args[0];
        const serverToken = args[1];

        // check values are good
        if (self.isKnownServerName(serverName)) {
            self.discordEmitter.emit('sendManagementMsg', `${serverName} already in use`)
            return;
        }

        const knownToken = await self.isKnownToken(serverToken)
        if (knownToken) {
            self.discordEmitter.emit('sendManagementMsg', `${serverToken} already in use`);
            return;
        }

        // confirm valid token -> if we confirm the server token is good we create the server
        this.openTempTokenSocket(serverName, serverToken);
    }

    async removeServer(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        // get server name from arguments
        const serverName = args[0];
        const token = args[1];

        // look for manager
        const server = self.gameServerManagers.find(gsm => gsm.serverName.toLowerCase() === serverName.toLowerCase());
        if (server === undefined) {
            self.discordEmitter.emit('sendManagementMsg', `Could not find provided server name in servers list`);
            return;
        }

        // confirm token matches
        if (server.serverToken !== token) {
            self.discordEmitter.emit('sendManagementMsg', `Token does not match server name, try again with correct token`);
            return;
        }

        // tell server we're done
        server.remove();

        // remove manager from managers list
        const serverIndex = self.gameServerManagers.indexOf(server);
        self.gameServerManagers.splice(serverIndex, 1);

        const channel = self.discordManager.getChannel(serverName);
        if (channel !== undefined) {
            self.discordManager.removeChannel(channel);
        }
        self.discordEmitter.emit('sendManagementMsg', `${serverName} using ${token} removed from server list`);
    }

    async listServers(commandId: string, args: string[], message: discord.Message) {
        const self = this;

        if (self.gameServerManagers.length <= 0) {
            self.discordEmitter.emit('sendManagementMsg', 'I am not managing any servers yet');
            return;
        }

        const serverList = new discord.MessageEmbed();
        serverList.setColor('#0099ff');
        serverList.setTitle('Servers');
        for (const server of self.gameServerManagers) {
            serverList.addField(server.serverName, server.serverToken);
        }
        self.discordEmitter.emit('sendManagementMsg', serverList);
    }

    async listCheats(commandId: string, args: string[], message: discord.Message) {
        this.discordEmitter.emit('sendManagementMsg', 'a list of cheats!');
    }

    async newPlayer(commandId: string, args: string[], message: discord.Message) {
        const self = this;
        self.discordManager.assignNerdRole(message.author.id);
        this.discordEmitter.emit('sendManagementMsg', 'You have been deemed worthy');
    }
}
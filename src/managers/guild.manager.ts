import discord from 'discord.js'
import websocket, { server } from 'websocket';
import { EOL } from 'os';
import { getGuildCommandHelp, getGuildCommands, getGuildCommand, getCommandFromMessage,  getCommandArgsFromMessage } from '../helpers/commands';
import { DiscordManager } from './discord.manager';
import { ServerManager } from './server.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { login } from '../helpers/requests';
import { getServers, getServerByToken, addServer, removeServer } from '../database/server.db';
import { addGameMods } from '../database/mod.db';
import { addSaves } from '../database/saves.db';
import urls from '../data/api.urls.json';

export class GuildManager {
    botClient: discord.Client;

    guildId: string;                            // this guilds ID

    discordManager: DiscordManager;             // handles dealing with this guild discord messaging
    gameServerManagers: ServerManager[];    // manages game server

    discordEmitter: DiscordMessageEmitter;      // discord manager response to emitted events

    constructor(guildId: string, bot: discord.Client) {
        this.guildId = guildId;
        this.botClient = bot;
        this.gameServerManagers = [];
        this.discordEmitter = new DiscordMessageEmitter();
        this.discordManager = new DiscordManager(this.guildId, this.discordEmitter, bot);
    }

    async initManagers() {
        const self = this;

        // get serverList
        const serverList:any = await getServers(self.guildId);

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

    async remove() {
        const self = this;
        await Promise.all(self.gameServerManagers.map(async (gsm) => {
            await gsm.remove();
        }));

        await self.discordManager.remove();
    }

    receivedMessage(message: discord.Message) {
        const self = this;

        // get command and args
        const commandId = getCommandFromMessage(message);
        const args = getCommandArgsFromMessage(message);

        // is this a management message
        if (self.discordManager.isManagementChannel(message)) {
            // confirm command and args are valid
            const command = getGuildCommand(commandId);
            if (command === undefined) {
                this.discordEmitter.emit('sendManagementMsg', `I do not know how to do that: ${commandId}`);
                return;
            }
            else if (command.argCount !== args.length) {
                this.discordEmitter.emit('sendManagementMsg', getGuildCommandHelp(commandId));
                return;
            }
            
            self.handleCommand(commandId, args);
        }

        // is this a game server message
        if (self.discordManager.isGameServerChannel(message)) {
            const channelName = self.discordManager.getChannelName(message);
            const gsm = self.getGameServerManager(channelName);
            gsm?.handleCommand(commandId, args, message);
        }
    }

    async handleCommand(commandId: string, args: string[]) {
        switch (commandId) {
            case 'server-create':
                await this.createServer(args);
                break;

            case 'server-add':
                await this.addServer(args);
                break;

            case 'server-remove':
                this.removeServer(args);
                break;

            case 'server-list':
                this.listServers(args);
                break;

            case 'cheats':
                this.listCheats(args);
                break;

            case 'commands':
                // TODO: send a list of commands specific to the management channel (meaning commands we handle here)
            default:
                this.discordEmitter.emit('sendManagementMsg', getGuildCommands());
                break;

        }
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
            version: '1.1.27',
            admins: []
        });
        const modResult = await addGameMods(self.guildId, token);
        const savesResult = await addSaves(self.guildId, token);

        // create a server manager
        const gsm = new ServerManager(self.guildId, serverName, token, self.discordEmitter);
        self.gameServerManagers.push(gsm);

        // create discord channel
        await self.discordManager.addNewChannel(gsm.serverName);

        // send results to management channel
        self.discordEmitter.emit('sendManagementMsg', `${serverName} using ${token} is now being managed`);
    }

    async createServer(args: string[]): Promise<void> {
        const serverName = args[0];

        // check values are good
        if (this.isKnownServerName(serverName)) {
            this.discordEmitter.emit('sendManagementMsg', `${serverName} already in use`)
            return;
        }

        // confirm valid token -> if we confirm the server token is good we create the server
        this.openTempTokenSocket(serverName, null);
    }

    async addServer(args: string[]): Promise<void> {
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

    async removeServer(args: string[]): Promise<void> {
        const self = this;

        // get server name from arguments
        const serverName = args[0];

        // look for manager
        const server = self.gameServerManagers.find(gsm => gsm.serverName.toLowerCase() === serverName.toLowerCase());
        if (server === undefined) {
            self.discordEmitter.emit('sendManagementMsg', `Could not find provided server name in servers list`);
            return;
        }

        // get server token
        const serverToken = server.serverToken;

         // tell server we're done
         server.remove();

         // remove manager from managers list
         const serverIndex = self.gameServerManagers.indexOf(server);
         self.gameServerManagers.splice(serverIndex, 1);

         const channel = self.discordManager.getChannel(serverName);
         if (channel !== undefined) {
             self.discordManager.removeChannel(channel.channel);
         }
         self.discordEmitter.emit('sendManagementMsg', `${serverName} using ${serverToken} removed from server list`);
    }

    listServers(args: string[]): void {
        const self = this;

        let list = '';
        for (const server of self.gameServerManagers) {
            list += `${server.serverName}  ${server.serverToken}${EOL}`;
        }

        if (list === '') {
            self.discordEmitter.emit('sendManagementMsg', 'I am not managing any servers yet');
        }
        else {
            self.discordEmitter.emit('sendManagementMsg', list);
        }
    }

    listCheats(args: string[]): void {
        this.discordEmitter.emit('sendManagementMsg', 'a list of cheats!');
    }
}
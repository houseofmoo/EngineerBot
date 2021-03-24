import discord from 'discord.js'
import websocket from 'websocket';
import { EOL } from 'os';
import { getGuildCommandHelp, getGuildCommands, GetGuildCommand } from '../helpers/command.list';
import { DiscordManager } from './discord.manager';
import { GameServerManager } from './game.server.manager';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import { login } from '../helpers/requests';
import { getGameServers, addGameServer, removeGameServer } from '../database/game.server.db';
import { addGameMods } from '../database/mod.db';
import { addSaves } from '../database/saves.db';
import config from '../data/config.json';
import urls from '../data/api.urls.json';

export class GuildServerManager {
    botClient: discord.Client;

    guildId: string;                            // this guilds ID

    discordManager: DiscordManager;             // handles dealing with this guild discord messaging
    gameServerManagers: GameServerManager[];    // manages game server

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
        const serverList:any = await getGameServers(self.guildId);
        if (serverList === undefined) {
            // TODO: how to handle this?
            return;
        }

        // only called on first start up
        await self.discordManager.initDiscordManager(serverList.data);

        // init a game server manager for each server this guild has
        for (const server of serverList.data) {
            const gsm = new GameServerManager(self.guildId, server.data.name, server.data.token, self.discordEmitter);
            self.gameServerManagers.push(gsm);
        }

    }

    async remove() {
        const self = this;
        await Promise.all(self.gameServerManagers.map(async (gsm) => {
            await gsm.remove();
        }));
    }

    receivedMessage(message: discord.Message) {
        const self = this;

        // get command and args
        const commandId = self.getCommandFromMessage(message);
        const args = self.getCommandArgsFromMessage(message);

        // is this a management message
        if (self.discordManager.isManagementChannel(message)) {
            // confirm command and args are valid
            const command = GetGuildCommand(commandId);
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
            gsm?.handleCommand(commandId, args);
        }
    }

    async handleCommand(commandId: string, args: string[]) {
        switch (commandId) {
            case 'server-create':
                await this.createGameServer(args);
                break;

            case 'server-add':
                await this.addGameServer(args);
                break;

            case 'server-remove':
                this.removeGameServer(args);
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

    // returns command provided from discord message
    getCommandFromMessage(message: discord.Message): string {
        // parse message into arguments
        let args = message.content.slice(config.bot.commandPrefix.length).trim().split(/ +/);

        // get first index, thats the command
        let command = args.shift();

        if (command !== undefined) {
            return command.toLowerCase();
        }

        return 'none';
    }

    // returns arguments provided from discord message
    getCommandArgsFromMessage(message: discord.Message): string[] {
        let args = message.content.slice(config.bot.commandPrefix.length).split(/ +/);
        args.shift();   // we don't care about the first element, that is the command
        return args;    // return just the args
    }

    getGameServerManager(channelName: string | undefined): GameServerManager | undefined {
        if (channelName === undefined) {
            this.discordEmitter.emit('sendManagementMsg', `Could not get channel name`);
            return undefined;
        }

        const server = this.gameServerManagers.find(r => r.serverName === channelName);
        if (server === undefined) {
            this.discordEmitter.emit('sendManagementMsg', `Unknown server named ${channelName}`);
            return undefined
        }

        return server;
    }

    isKnownServerName(serverName: string): boolean {
        const self = this;

        const serverByName = self.gameServerManagers.find(gsm => gsm.serverName == serverName);
        return serverByName !== undefined;
    }

    isKnownToken(serverToken: string): boolean {
        const self = this;

        const serverByToken = self.gameServerManagers.find(gsm => gsm.serverToken == serverToken);
        return serverByToken !== undefined;
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
        self.createGameServerManager(serverName, response.data.userToken);
    }

    // add new server data to db and create game server manager
    async createGameServerManager(serverName: string, token: string) {
        const self = this;

        // add data to database
        const serverResult = await addGameServer({
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
        const gsm = new GameServerManager(self.guildId, serverName, token, self.discordEmitter);
        self.gameServerManagers.push(gsm);

        // create discord channel
        await self.discordManager.addNewChannel(gsm.serverName);

        // send results to management channel
        self.discordEmitter.emit('sendManagementMsg', `${serverName} using ${token} is now being managed`);
    }

    async createGameServer(args: string[]): Promise<void> {
        const serverName = args[0];

        // check values are good
        if (this.isKnownServerName(serverName)) {
            this.discordEmitter.emit('sendManagementMsg', `${serverName} already in use`)
            return;
        }

        // confirm valid token -> if we confirm the server token is good we create the server
        this.openTempTokenSocket(serverName, null);
    }

    async addGameServer(args: string[]): Promise<void> {
        const self = this;

        const serverName = args[0];
        const serverToken = args[1];

        // check values are good
        if (self.isKnownServerName(serverName)) {
            self.discordEmitter.emit('sendManagementMsg', `${serverName} already in use`)
            return;
        }

        if (self.isKnownToken(serverToken)) {
            self.discordEmitter.emit('sendManagementMsg', `${serverToken} already in use`);
            return;
        }

        // confirm valid token -> if we confirm the server token is good we create the server
        this.openTempTokenSocket(serverName, serverToken);
    }

    async removeGameServer(args: string[]): Promise<void> {
        const self = this;

        // get server name from arguments
        const serverName = args[0];

        // look for manager
        const server = self.gameServerManagers.find(gsm => gsm.serverName === serverName);
        if (server === undefined) {
            self.discordEmitter.emit('sendManagementMsg', `Could not find provided server name in servers list`);
            return;
        }

        // get server token
        const serverToken = server.serverToken;

        // remove manager from list and save document
        const result = await removeGameServer(self.guildId, serverToken);
        if (result !== undefined) {
            // tell server we're done
            server.remove();

            // remove manager from managers list
            const serverIndex = self.gameServerManagers.indexOf(server);
            self.gameServerManagers.splice(serverIndex, 1);

            self.discordManager.removeChannel(serverName);
            self.discordEmitter.emit('sendManagementMsg', `${serverName} using ${serverToken} removed from server list`);
        }
        else {
            console.error(result);
            self.discordEmitter.emit('sendManagementMsg', `Something went wrong removing ${serverName} from database`);
        }
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
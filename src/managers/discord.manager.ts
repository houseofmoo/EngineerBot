import discord from 'discord.js';
import { EOL } from 'os';
import { DiscordMessageEmitter } from '../handlers/emitters';
import { IGameServer } from '../models/data.models';

import config from '../data/config.json';

// manages discord interactions with a guild
export class DiscordManager {
    readonly bot: discord.Client;

    readonly guildId: string;
    readonly guild: discord.Guild | undefined;

    managementChannel: discord.TextChannel | undefined;

    gameServerChannels: {
        channel: discord.TextChannel,
        webhook: discord.Webhook
    }[];

    discordEmitter: DiscordMessageEmitter;

    readonly managedRole = '@everyone';

    constructor(guildId: string, discordEmitter: DiscordMessageEmitter, bot: discord.Client) {
        this.bot = bot;
        this.guildId = guildId;
        this.guild = bot.guilds.cache.find(g => g.id === guildId);
        this.discordEmitter = discordEmitter;
        this.gameServerChannels = [];
    }

    async initDiscordManager(gameServers: IGameServer[]) {
        const self = this;

        try {
            // create category for our channels
            const categoryChannel = await self.createCategory(config.discord.categoryName);

            // get management channel
            self.managementChannel = await self.createChannel(config.discord.managementName, categoryChannel);

            // create game server specific channels and associated webhook
            for (const server of gameServers) {
                const newChannel = await self.createChannel(server.serverName, categoryChannel);
                const newWebhook = await self.createWebhook(newChannel);
                if (newChannel !== undefined && newWebhook !== undefined) {
                    self.gameServerChannels.push({
                        channel: newChannel,
                        webhook: newWebhook
                    })
                }
            }

            // add event listeners
            self.addListeners();
        }
        catch (error) {
            console.error(error);
        }
    }

    addListeners() {
        const self = this;

        self.sendToManagementChannel = self.sendToManagementChannel.bind(self); // bind the this context to self when callback is made
        self.discordEmitter.addListener('sendManagementMsg', self.sendToManagementChannel);

        self.sendToChannel = self.sendToChannel.bind(self);
        self.discordEmitter.addListener('sendGameServerMsg', self.sendToChannel);

        self.sendToChannelViaWebhook = self.sendToChannelViaWebhook.bind(self);
        self.discordEmitter.addListener('sendToGameServerWebHook', self.sendToChannelViaWebhook);
    }

    sendToManagementChannel(msg: string | discord.MessageEmbed): void {
        const self = this;
        self.managementChannel?.send(msg);
    }

    sendToChannel(serverName: string, msg: string | discord.MessageEmbed): void {
        const self = this;
        const channelInfo = self.gameServerChannels.find(chan => chan.channel.name === serverName);
        channelInfo?.channel.send(msg);
    }

    sendToChannelViaWebhook(serverName: string, msg: string | discord.MessageEmbed, username: string): void {
        const self = this;
        const channelInfo = self.gameServerChannels.find(chan => chan.channel.name === serverName);
        channelInfo?.webhook.send(msg, { username: username });
    }

    isManagementChannel(message: discord.Message) : boolean {
        const self = this;
        return message.channel.id === self.managementChannel?.id
    }

    isGameServerChannel(message: discord.Message) : boolean {
        const self = this;
        const gsc = self.gameServerChannels.find(chan => chan.channel.id === message.channel.id)
        return gsc !== undefined;
    }

    getChannelName(message: discord.Message) : string | undefined {
        const self = this;
        const gsc = self.gameServerChannels.find(chan => chan.channel.id === message.channel.id)
        return gsc?.channel.name;
    }

    // send list of commands to channel
    sendCommandList(commandList: any[]): void {
        const example = new discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Some title')
            .setURL('https://discord.js.org/')
            .setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
            .setDescription('Some description here')
            .setThumbnail('https://i.imgur.com/wSTFkRM.png')
            .addFields(
                { name: 'Regular field title', value: 'Some value here' },
                { name: '\u200B', value: '\u200B' },
                { name: 'Inline field title', value: 'Some value here', inline: true },
                { name: 'Inline field title', value: 'Some value here', inline: true },
            )
            .addField('Inline field title', 'Some value here', true)
            .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
            .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');

        this.sendToManagementChannel(example);


        const idPad = 20;
        const formatPad = 40;

        // format response
        let response = '```'; // open code block
        response += 'I respond to:' + EOL;
        response += 'command'.padEnd(idPad, ' ');
        response += 'format'.padEnd(formatPad);
        //response += 'description' + EOL;

        // insert commands to response
        for (const command of commandList) {
            response += `${command.commandId.padEnd(idPad, ' ')}`;
            response += `${command.format.padEnd(formatPad, ' ')}` + EOL;
            //response += `${command.description}` + EOL;
        }

        // close codeblock tag
        response += "```";

        // send
        this.sendToManagementChannel(response);
    }

    // send information about how a command is expected
    sendCommandUsage(command: any) {
        // get list of commands
        if (command !== undefined) {
            // get specific command
            let response = '```';
            response += `${command.description}` + EOL + EOL;
            response += `example usage: ${command.format}` + EOL;
            response += "```";

            // send
            this.sendToManagementChannel(response);
        }
    }

    // adds a new channel for new game servers
    async addNewChannel(channelName: string) {
        const self = this;

        try {
            // create or get category for our channels
            const categoryChannel = await self.createCategory(config.discord.categoryName);

            // create game server specific channels and associated webhook
            const newChannel = await self.createChannel(channelName, categoryChannel);
            const newWebhook = await self.createWebhook(newChannel);
            if (newChannel !== undefined && newWebhook !== undefined) {
                self.gameServerChannels.push({
                    channel: newChannel,
                    webhook: newWebhook
                })
            }
        }
        catch (error) {
            console.error(error);
        }
    }

    async removeChannel(channelName: string) {
        const self = this;

        try {
            // if guild exists...which it should
            if (self.guild !== undefined) {

                const channel = self.gameServerChannels.find(gsc => gsc.channel.name === channelName);
                if (channel !== undefined) {
                    await channel.webhook.delete();
                    await channel.channel.delete();
                }
            }
        }
        catch (error) {
            console.error(error);
        }
    }

    // creates facotrio server category if it does not exist
    private async createCategory(categoryName: string): Promise<discord.CategoryChannel | undefined> {
        const self = this;

        try {
            // if guild exists...which it should since we're in it
            if (self.guild !== undefined) {

                // check if category already exists
                const exists = self.guild.channels.cache.find(category => category.name === categoryName);
                if (exists !== undefined) {
                    return exists as discord.CategoryChannel;
                }

                // create the channel but remove management controsl for @everyone
                const everyoneRole = self.guild.roles.cache.find(r => r.name === self.managedRole);
                if (everyoneRole !== undefined) {
                    return await self.guild.channels.create(categoryName, {
                        type: 'category',
                        permissionOverwrites: [
                            {
                                id: everyoneRole,
                                deny: ['MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_WEBHOOKS']
                            }
                        ]
                    });
                }
                // @everyone doesnt exist, create channel as is
                else {
                    return await self.guild.channels.create(categoryName, {
                        type: 'category'
                    });
                }
            }
            // we couldn't find the guild...thats weird
            console.error('We couldnt find the guild we are in...');
            return undefined;
        }
        catch (error) {
            console.error('Errored out while creating category');
            console.error(error);
            return undefined;
        }
    }

    // adds channels to factorio server catefory if it does not exist
    private async createChannel(channelName: string, categoryChannel: discord.CategoryChannel | undefined): Promise<discord.TextChannel | undefined> {
        const self = this;

        try {
            // if guild exists...which it should
            if (self.guild !== undefined) {

                // find the category we want, which should exist since we created it
                if (categoryChannel === undefined) {
                    categoryChannel = self.guild.channels.cache.find(category => category.name === config.discord.categoryName) as discord.CategoryChannel;
                }

                // create new channel under category channel if channel doesnt exist
                if (categoryChannel !== undefined && categoryChannel.type === 'category') {
                    const category = categoryChannel as discord.CategoryChannel;

                    // check if channels already exist
                    const channel = category.children.find(c => c.name === channelName);
                    if (channel === undefined) {
                        const sm = await self.guild.channels.create(channelName);
                        sm.setParent(category);
                        return sm;
                    }
                    (channel as discord.TextChannel).send('Hello!');
                    return channel as discord.TextChannel;
                }

                // couldnt find category channel we needed
                return undefined;
            }

            // not a memeber of any guilds
            return undefined;
        }
        catch (error) {
            console.error(error);
            return undefined;
        }
    }

    // creates a webhook
    private async createWebhook(channel: discord.TextChannel | undefined): Promise<discord.Webhook | undefined> {
        const self = this;

        if (channel === undefined) {
            return;
        }

        try {
            // how could we ever be null!?
            if (self.bot.user !== null) {

                // check for webhook with out name
                const webhooks = await channel.fetchWebhooks();
                const webhook = webhooks.find(w => w.name === self.bot.user?.username);
                // couldnt find it? create it
                if (webhook === undefined) {
                    return await channel.createWebhook(self.bot.user.username);
                }

                // return webhook
                return webhook;
            }

            return undefined;
        }
        catch (error) {
            console.error(error);
            return undefined;
        }
    }
}
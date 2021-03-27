import discord, { Permissions } from 'discord.js';
import { EOL } from 'os';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import config from '../data/config.json';

// manages discord interactions with a guild
export class DiscordManager {
    readonly bot: discord.Client;
    nerdRole: discord.Role | undefined;

    readonly guildId: string;
    readonly guild: discord.Guild | undefined;

    managementChannel: discord.TextChannel | undefined;
    discordEmitter: DiscordMessageEmitter;
    gameServerChannels: {
        channel: discord.TextChannel,
        webhook: discord.Webhook,
        voice: discord.VoiceChannel
    }[];


    constructor(guildId: string, discordEmitter: DiscordMessageEmitter, bot: discord.Client) {
        this.bot = bot;
        this.guildId = guildId;
        this.guild = bot.guilds.cache.find(g => g.id === guildId);
        this.discordEmitter = discordEmitter;
        this.gameServerChannels = [];
    }

    async initDiscordManager(gameServers: any) {
        const self = this;

        try {
            // create factorio-player role
            self.nerdRole = await self.createRole(config.discord.roleName, config.discord.color);

            // create category for our channels
            const categoryChannel = await self.createCategory(config.discord.categoryName);

            // get management channel
            self.managementChannel = await self.createChannel(config.discord.managementName, categoryChannel);

            // create game server specific channels, associated webhook, and voice chat for that server
            for (const server of gameServers) {
                await self.addNewChannel(server.data.name.toLowerCase());
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

        self.sendAndPinToChannel = self.sendAndPinToChannel.bind(self);
        self.discordEmitter.addListener('pinGameServerMsg', self.sendAndPinToChannel);
    }

    removeListeners() {
        const self = this;
        self.discordEmitter.removeAllListeners('sendManagementMsg');
        self.discordEmitter.removeAllListeners('sendGameServerMsg');
        self.discordEmitter.removeAllListeners('sendToGameServerWebHook');
    }

    async remove() {
        const self = this;
        // this is unused since it was created for kick events... but if we're kicked we cannot do anything to that server
        self.removeListeners();
        for (const chan of self.gameServerChannels) {
            await self.removeChannel(chan.channel);
        }

        if (self.managementChannel !== undefined) {
            await self.removeChannel(self.managementChannel);
        }

        await self.deleteCategory(config.discord.categoryName);
    }

    sendToManagementChannel(msg: string | discord.MessageEmbed): void {
        const self = this;
        self.managementChannel?.send(msg);
    }

    sendToChannel(serverName: string, msg: string | discord.MessageEmbed): void {
        const self = this;
        const channelInfo = self.gameServerChannels.find(chan => chan.channel.name.toLowerCase() === serverName.toLowerCase());
        channelInfo?.channel.send(msg);
    }

    sendAndPinToChannel(serverName: string, msg: string | discord.MessageEmbed) {
        const self = this;
        const channelInfo = self.gameServerChannels.find(chan => chan.channel.name.toLowerCase() === serverName.toLowerCase());
        channelInfo?.channel.send(msg).then((msg) => msg.pin());
    }

    sendToChannelViaWebhook(serverName: string, msg: string | discord.MessageEmbed, username: string): void {
        const self = this;
        const channelInfo = self.gameServerChannels.find(chan => chan.channel.name.toLowerCase() === serverName.toLowerCase());
        channelInfo?.webhook.send(msg, { username: username });
    }

    isManagementChannel(message: discord.Message): boolean {
        const self = this;
        return message.channel.id === self.managementChannel?.id
    }

    isGameServerChannel(message: discord.Message): boolean {
        const self = this;
        const gsc = self.gameServerChannels.find(chan => chan.channel.id === message.channel.id)
        return gsc !== undefined;
    }

    getChannelName(message: discord.Message): string | undefined {
        const self = this;
        const gsc = self.gameServerChannels.find(chan => chan.channel.id === message.channel.id)
        return gsc?.channel.name;
    }

    async addRoleToUser(message: discord.Message) {
        const self = this;

        // get member
        const member = await self.guild?.members.cache.find(m => m.id === message.author.id);

        // give them role
        if (member !== undefined && self.nerdRole !== undefined) {
            await member?.roles.add(self.nerdRole);
        }
    }

    async addNewChannel(channelName: string) {
        const self = this;

        try {
            // create or get category for our channels
            const categoryChannel = await self.createCategory(config.discord.categoryName);

            // create game server specific channels and associated webhook
            const newChannel = await self.createChannel(channelName, categoryChannel);
            const newWebhook = await self.createWebhook(newChannel);
            const voiceChannel = await self.createVoiceChannel(channelName, categoryChannel);

            if (newChannel !== undefined && newWebhook !== undefined && voiceChannel !== undefined) {
                self.gameServerChannels.push({
                    channel: newChannel,
                    webhook: newWebhook,
                    voice: voiceChannel
                })
            }
        }
        catch (error) {
            console.error(error);
        }
    }

    getChannel(channelName: string) {
        const self = this;
        return self.gameServerChannels.find(gsc => gsc.channel.name.toLowerCase() === channelName.toLowerCase());
    }

    async removeChannel(channel: discord.Channel) {
        const self = this;

        try {
            const localChanRef = self.gameServerChannels.find(gsc => gsc.channel.id === channel.id);
            if (localChanRef !== undefined) {
                const index = self.gameServerChannels.indexOf(localChanRef);

                if (index !== -1) {
                    self.gameServerChannels.splice(index, 1);
                }
            }

            // delete channel from discord
            await channel.delete();
        }
        catch (error) {
            console.error(error);
        }
    }

    private async createRole(roleName: string, roleColor: string) {
        const self = this;

        const roles = self.guild?.roles.cache.find(r => r.name === roleName);
        if (roles !== undefined) {
            return roles; // role exists
        }

        return await self.guild?.roles.create({
            data: {
                name: roleName,
                color: roleColor
            },
            reason: 'Factorio players can see server channels'
        });
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

                // create the category channnel
                return await self.guild.channels.create(categoryName, {
                    type: 'category',
                });
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

    // deletes factorio server category
    private async deleteCategory(categoryName: string) {
        const self = this;

        try {
            // if guild exists...which it should since we're in it
            if (self.guild !== undefined) {

                // find category channel and delete it
                const exists = self.guild.channels.cache.find(category => category.name === categoryName);
                if (exists !== undefined) {
                    await exists.delete()
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
    private async createChannel(channelName: string, categoryChannel: discord.CategoryChannel | undefined) {
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
                    if (channel !== undefined) {
                        return channel as discord.TextChannel;
                    }

                    // create channel with permissions if it is not the management channel
                    if (channelName !== config.discord.managementName) {
                        const sm = await self.guild.channels.create(channelName, {
                            type: 'text',
                        });
                        await sm.setParent(category);

                        // do not allow everyone to see this channel
                        await sm.updateOverwrite(self.guild.roles.everyone, { VIEW_CHANNEL: false});

                        // allow role to see channel
                        if (self.nerdRole !== undefined) {
                            await sm.updateOverwrite(self.nerdRole, { VIEW_CHANNEL: true})
                        }

                        return sm;
                    }
                    else {
                        const sm = await self.guild.channels.create(channelName, {
                            type: 'text'
                        });
                        sm.setParent(category);
                        return sm;
                    }
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

    private async createVoiceChannel(channelName: string, categoryChannel: discord.CategoryChannel | undefined) {
        const self = this;
        channelName = channelName + ' yelling place';
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
                    if (channel !== undefined) {
                        return channel as discord.VoiceChannel;
                    }

                    // create channel with permissions if it is not the management channel
                    if (channelName !== config.discord.managementName) {
                        const sm = await self.guild.channels.create(channelName, {
                            type: 'voice',
                        });
                        await sm.setParent(category);

                        // do not allow everyone to see this channel
                        await sm.updateOverwrite(self.guild.roles.everyone, { VIEW_CHANNEL: false});

                        // allow role to see channel
                        if (self.nerdRole !== undefined) {
                            await sm.updateOverwrite(self.nerdRole, { VIEW_CHANNEL: true})
                        }

                        return sm;
                    }
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
}
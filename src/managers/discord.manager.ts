import discord from 'discord.js';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import config from '../data/config.json';
import roleNames from '../data/roles.json';
import { removeListener } from 'node:process';

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
            self.nerdRole = await self.createRole(roleNames.names);
            await self.assignNerdRole(self.bot?.user?.id);

            // create category for our channels
            const categoryChannel = await self.createCategory(config.discord.categoryName);

            // get management channel
            self.managementChannel = await self.createTextChannel(config.discord.managementName, categoryChannel);

            // create game server specific channels and voice chat for that server
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

        self.sendAndPinToChannel = self.sendAndPinToChannel.bind(self);
        self.discordEmitter.addListener('pinGameServerMsg', self.sendAndPinToChannel);
    }

    removeListeners() {
        const self = this;
        self.discordEmitter.removeAllListeners('sendManagementMsg');
        self.discordEmitter.removeAllListeners('sendGameServerMsg');
        self.discordEmitter.removeAllListeners('pinGameServerMsg');
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


    private async createRole(roleNames: string[]) {
        const self = this;

        // look for an unused role name that we can manage
        let unusedName = '';
        for (const rolename of roleNames) {
            let roleExists = self.guild?.roles.cache.find(r => r.name === rolename);
            if (roleExists === undefined) {
                unusedName = rolename;
                break;
            }
        }

        // create role
        return await self.guild?.roles.create({
            data: {
                name: unusedName,
                color: "Blue",
                permissions: []
            },
            reason: 'Factorio players can see server channels'
        });
    }

    async assignNerdRole(id: string | undefined) {
        const self = this;

        if (id === undefined) {
            return;
        }

        // get member
        const member = await self.guild?.members.cache.find(m => m.id === id);

        // give them role
        if (member !== undefined && self.nerdRole !== undefined) {
            await member?.roles.add(self.nerdRole);
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

                // create the category channnel
                const cataChannel = await self.guild.channels.create(categoryName, {
                    type: 'category'
                });

                // do not allow everyone to see this channel
                const botRole = self.guild.roles.cache.find(r => r.name === self.bot?.user?.username);
                if (botRole !== undefined) {
                    await cataChannel.updateOverwrite(botRole, { VIEW_CHANNEL: true });
                    await cataChannel.updateOverwrite(botRole, { MANAGE_CHANNELS: true });
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

    private async deleteChannel(channel: discord.Channel) {
        const self = this;
        try {
            // delete channel from discord
            await channel.delete();
        }
        catch (error) {
            console.error(error);
        }
    }

    async addNewChannel(channelName: string) {
        const self = this;

        try {
            // create or get category for our channels
            const categoryChannel = await self.createCategory(config.discord.categoryName);

            // create game server specific channels and associated webhook
            const newChannel = await self.createTextChannel(channelName, categoryChannel);
            const voiceChannel = await self.createVoiceChannel(channelName, categoryChannel);

            if (newChannel !== undefined && voiceChannel !== undefined) {
                self.gameServerChannels.push({
                    channel: newChannel,
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

    // adds channels to factorio server catefory if it does not exist
    private async createTextChannel(channelName: string, categoryChannel: discord.CategoryChannel | undefined) {
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
                        await sm.updateOverwrite(self.guild.roles.everyone, { VIEW_CHANNEL: false });

                        // allow role to see channel
                        if (self.nerdRole !== undefined) {
                            await sm.updateOverwrite(self.nerdRole, { VIEW_CHANNEL: true });
                        }

                        const botRole = self.guild.roles.cache.find(r => r.name === self.bot?.user?.username);
                        if (botRole !== undefined) {
                            await sm.updateOverwrite(botRole, { VIEW_CHANNEL: true });
                            await sm.updateOverwrite(botRole, { MANAGE_CHANNELS: true });
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
                        await sm.updateOverwrite(self.guild.roles.everyone, { VIEW_CHANNEL: false });

                        // allow role to see channel
                        if (self.nerdRole !== undefined) {
                            await sm.updateOverwrite(self.nerdRole, { VIEW_CHANNEL: true })
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

    async removeAllChannels() {
        const self = this;
        // this is unused since it was created for kick events... but if we're kicked we cannot do anything to that server
        self.removeListeners();
        for (const chan of self.gameServerChannels) {
            await self.deleteChannel(chan.channel);
            await self.deleteChannel(chan.voice);
        }

        // reset array
        self.gameServerChannels = [];

        if (self.managementChannel !== undefined) {
            await self.deleteChannel(self.managementChannel);
        }

        await self.deleteCategory(config.discord.categoryName);
    }

    async removeChannel(channel: {
        channel: discord.TextChannel,
        voice: discord.VoiceChannel
    }) {
        const self = this;

        // look for index of items
        const channels = self.gameServerChannels.find(gsc => gsc.channel.id === channel.channel.id);
        if (channels !== undefined) {
            const index = self.gameServerChannels.indexOf(channels);
            await self.deleteChannel(channel.channel);
            await self.deleteChannel(channel.voice);
            self.gameServerChannels.splice(index, 1);
        }
    }
}
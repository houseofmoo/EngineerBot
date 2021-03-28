import discord from 'discord.js';
import { DiscordMessageEmitter } from '../emitters/discord.message.emitter';
import config from '../data/config.json';
import roleNames from '../data/roles.json';

// manages discord interactions with a guild
export class DiscordManager {
    readonly bot: discord.Client;
    nerdRole: discord.Role | undefined;

    readonly guildId: string;
    guild: discord.Guild | undefined;

    categoryChannel: discord.CategoryChannel | undefined;
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
            // make sure guild is set
            self.guild = self.bot.guilds.cache.find(g => g.id === self.guildId);

            // create factorio-player role
            self.nerdRole = await self.createRole(roleNames.names);
            await self.assignNerdRole(self.bot?.user?.id);

            // create category for our channels
            self.categoryChannel = await self.createCategory(config.discord.categoryName);

            // get management channel
            if (self.categoryChannel !== undefined) {
                self.managementChannel = await self.createManagementChannel(config.discord.managementName, self.categoryChannel);
            }

            // create game server specific channels and voice chat for that server
            for (const server of gameServers) {
                await self.addServerChannels(server.data.name.toLowerCase());
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

        try {
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
        catch (err) {
            console.log(err);
            console.log('error assiging role');
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
                const category = await self.guild.channels.create(categoryName, {
                    type: 'category'
                });

                // do not allow everyone to see this channel
                const botRole = self.guild.roles.cache.find(r => r.name === self.bot?.user?.username);
                if (botRole !== undefined) {
                    await category.updateOverwrite(botRole, { VIEW_CHANNEL: true });
                    await category.updateOverwrite(botRole, { MANAGE_CHANNELS: true });
                }

                return category;
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

    async addServerChannels(channelName: string) {
        const self = this;

        try {
            // create or get category for our channels
            if (self.categoryChannel === undefined) {
                self.categoryChannel = await self.createCategory(config.discord.categoryName);
            }

            // create game server specific channels and associated webhook
            if (self.categoryChannel !== undefined) {
                const textChannel = await self.createDiscordChannel(channelName, self.categoryChannel, "text");
                const voiceChannel = await self.createDiscordChannel(channelName, self.categoryChannel, "voice");

                if (textChannel !== undefined && voiceChannel !== undefined) {
                    self.gameServerChannels.push({
                        channel: textChannel as discord.TextChannel,
                        voice: voiceChannel as discord.VoiceChannel
                    });
                }
                else {
                    // TODO: how do we handle not creating the channels
                    console.log('text/voice channel creation failure');
                }
            }
            else {
                // TODO: how do we handle not having a category?
                console.log('category was undefined when attempting to create text/voice channels');
            }
        }
        catch (error) {
            console.error(error);
            console.log('error while attempting to create text/voice channels');
        }
    }

    private async createManagementChannel(managementName: string, categoryChannel: discord.CategoryChannel) {
        const self = this;

        try {
            // if guild exists...which it should
            if (self.guild !== undefined) {

                // check if management channel already exists
                const channel = categoryChannel.children.find(c => c.name === managementName);
                if (channel !== undefined) {
                    return channel as discord.TextChannel;
                }

                // create management channel, everyone can see it
                const managementChannel = await self.guild.channels.create(managementName, {
                    type: 'text'
                });
                
                await managementChannel.setParent(categoryChannel);
                await managementChannel.updateOverwrite(self.guild.roles.everyone, { VIEW_CHANNEL: true });
                return managementChannel;
            }

            // not a memeber of any guilds
            console.log('guild undefined');
            return undefined;
        }
        catch (error) {
            console.error(error);
            return undefined;
        }
    }

    private async createDiscordChannel(channelName: string, categoryChannel: discord.CategoryChannel, channelType: "text" | "voice") {
        const self = this;
        // if we're creating a voice channel
        if (channelType === "voice") {
            channelName = channelName + ' yelling place';
        }

        try {
            // if guild exists...which it should
            if (self.guild !== undefined) {

                // check if channels already exist
                const channel = categoryChannel.children.find(c => c.name === channelName);
                if (channel !== undefined) {
                    /// update channel permissions to include viewable by nerd role
                    if (self.nerdRole !== undefined) {
                        channel.updateOverwrite(self.nerdRole, { VIEW_CHANNEL: true });
                    }

                    return channel;
                }

                // create channel
                const newChannel = await self.guild.channels.create(channelName, {
                    type: channelType,
                });

                // make channel child of category
                await newChannel.setParent(categoryChannel);

                // make sure bot can manage new channel
                const botRole = self.guild.roles.cache.find(r => r.name === self.bot?.user?.username);
                if (botRole !== undefined) {
                    await newChannel.updateOverwrite(botRole, { VIEW_CHANNEL: true });
                    await newChannel.updateOverwrite(botRole, { MANAGE_CHANNELS: true });
                }


                // @everyone cannot see this channel
                await newChannel.updateOverwrite(self.guild.roles.everyone, { VIEW_CHANNEL: false });

                // allow nerd role to see channel
                if (self.nerdRole !== undefined) {
                    await newChannel.updateOverwrite(self.nerdRole, { VIEW_CHANNEL: true })
                }

                return newChannel;
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

    getChannel(channelName: string) {
        const self = this;
        return self.gameServerChannels.find(gsc => gsc.channel.name.toLowerCase() === channelName.toLowerCase());
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
}
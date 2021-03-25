import discord from 'discord.js';
import { GuildManager } from './managers/guild.manager';
import config from './data/config.json';

async function onLaunch(bot: any) {
    try {
        // build managers for each guild
        await Promise.all(bot.guilds.cache.map(async (g: any) => {
            const newGuildServer = new GuildManager(g.id, bot);
            await newGuildServer.initManagers();
            managers.set(g.id, newGuildServer);
        }));
    }
    catch (err) {
        console.log(err);
        console.log('error onLaunch()');
    }
}

async function onJoinGuild(guild: discord.Guild) {
    try {
        const newGuildServer = new GuildManager(guild.id, bot);
        await newGuildServer.initManagers();
        managers.set(guild.id, newGuildServer);
    }
    catch (err) {
        console.log(err);
        console.log('error onJoinGuild()');
    }
}

async function onLeaveGuild(guild: discord.Guild) {
    try {
        // tell manager to shut it down
        const manager = managers.get(guild.id);
        if (manager !== undefined) {
            await manager.remove();
            managers.delete(guild.id);
        }
    }
    catch (err) {
        console.log(err);
        console.log('error onLeaveGuild()');
    }
}

// create new bot client
const bot = new discord.Client();

// create a list of game
const managers: Map<string, GuildManager> = new Map<string, GuildManager>();

// once the bot is online
bot.once('ready', async () => {
    console.log('Engineer MKII is online');
    await onLaunch(bot);
});

// on message
bot.on('message', message => {
    // confirm this is a command
    if (!message.content.startsWith(config.bot.commandPrefix) || message.author.bot) {
        return;
    }

    // route message to appropriate manager
    if (message.guild !== null) {
        const manager = managers.get(message.guild.id)
        if (manager !== undefined) {   // this should ALWAYS be true
            manager.receivedMessage(message);
        }
        else {
            console.error('we got a message from a guild we do not know about! (main.ts)');
        }
    }
});

// when we're invited to a new guild
bot.on('guildCreate', async (guild) => {
    await onJoinGuild(guild);
});

// when we're kicked from a guild... jerks
bot.on('guildDelete', async (guild) => {
    await onLeaveGuild(guild);
});

// launch bot
bot.login(config.bot.token);
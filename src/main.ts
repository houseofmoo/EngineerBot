import discord from 'discord.js';
import { getGuild, addGuild, removeGuild } from './database/guild.db';
import { GuildServerManager } from './managers/guild.server.manager';
import config from './data/config.json';


async function onLaunch() {
    try {
        // build managers for each guild
        await Promise.all(bot.guilds.cache.map(async (g) => {
            // find guild in db
            let guildData: any = await getGuild(g.id);

            // if unknown guild, create an entry
            if (guildData === undefined) {
                // create new guild entry
                const newGuild = {
                    guildId: g.id,
                    guildName: g.name
                }
                guildData = await addGuild(newGuild);
            }

            // only create manager if we successfully added guild data to db
            if (guildData !== undefined) {
                const newGuildServer = new GuildServerManager(g.id, bot);
                await newGuildServer.initManagers();
                managers.set(g.id, newGuildServer);
            }
        }));
    }
    catch (err) {
        console.log(err);
        console.log('error onLaunch()');
    }
}

async function onJoinGuild(guild: discord.Guild) {
    try {
        // just confirm we don't know about this guild
        let guildData: any = await getGuild(guild.id);
        if (guildData === undefined) {
            const newGuild = {
                guildId: guild.id,
                guildName: guild.name
            }
            guildData = await addGuild(newGuild);

            // only create manager if we successfully added guild data to db
            if (guildData !== undefined) {
                const newGuildServer = new GuildServerManager(guild.id, bot);
                await newGuildServer.initManagers();
                managers.set(guild.id, newGuildServer);
            }
        }
    }
    catch (err) {
        console.log(err);
        console.log('error onJoinGuild()');
    }
}

async function onLeaveGuild(guild: discord.Guild) {
    try {
        // remove guild data from db
        let guildData = await removeGuild(guild.id);
        if (guildData !== undefined) {
            // tell manager to shut it down and delete documents from db
            const manager = managers.get(guild.id);
            if (manager !== undefined) {
                await manager.remove();
                managers.delete(guild.id);
            }
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
const managers: Map<string, GuildServerManager> = new Map<string, GuildServerManager>();

// once the bot is online
bot.once('ready', async () => {
    console.log('Engineer MKII is online');
    await onLaunch();
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
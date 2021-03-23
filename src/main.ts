import discord from 'discord.js';
//import { mongoConnect } from './helpers/mongo';
import { GuildServerManager } from './managers/guild.server.manager';
//import { DiscordGuild } from './models/data.models';
import config from './data/config.json';

async function onLaunch() {
    // open db connection
    const mongoose = await mongoConnect();

    try {
        // build managers for each guild
        await Promise.all(bot.guilds.cache.map(async (g) => {
            let result = await DiscordGuild.findOne({ guildId: g.id });
            if (result === null) {
                // create since it doesnt exist
                result = await new DiscordGuild({
                    guildId: g.id,
                    guildName: g.name
                }).save();
            }

            const newGuildServer = new GuildServerManager(result.guildId, bot);
            await newGuildServer.initManagers();
            managers.set(g.id, newGuildServer);
        }));
    }
    catch (error) {
        console.log('errored out');
        console.log(error.message);
    }
    finally {
        // always close the connection
        mongoose.connection.close();
    }
}

async function onJoinGuild(guild: discord.Guild) {
    // open db connection
    const mongoose = await mongoConnect();

    try {

        let result = await DiscordGuild.findOne({ guildId: guild.id });
        if (result === null) {
            // create since it doesnt exist
            result = await new DiscordGuild({
                guildId: guild.id,
                guildName: guild.name
            }).save();
        }

        const newGuildServer = new GuildServerManager(result.guildId, bot);
        await newGuildServer.initManagers();
        managers.set(guild.id, newGuildServer);

    }
    catch (error) {
        console.log('errored out');
        console.log(error.message);
    }
    finally {
        // always close the connection
        mongoose.connection.close();
    }
}

async function onLeaveGuild(guild: discord.Guild) {
       // open db connection
       const mongoose = await mongoConnect();

       try {
           // find the entry that matches the guild we left
           let result = await DiscordGuild.findOneAndDelete({ guildId: guild.id });
           if (result === null) {
               console.error('we should have found a guild in the database but did not');
           }
           managers.delete(guild.id);
       }
       catch (error) {
           console.log('errored out');
           console.log(error.message);
       }
       finally {
           // always close the connection
           mongoose.connection.close();
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
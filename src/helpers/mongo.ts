import mongoose from 'mongoose';
import { DiscordGuild, GameServer, GameMod } from '../models/data.models';
import config from '../data/config.json';

// allows us to connect to mongoDB server
export async function mongoConnect() {
    await mongoose.connect(config.database.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    return mongoose;
}

export async function getPopulatedGuildData(guildId: string) {
    // connect to db
    const mongoose = await mongoConnect();

    try {
        return await DiscordGuild.findOne({ guildId: guildId }).populate({
            path: 'gameServers',
            model: 'GameServer',
            populate: [{
                path: 'serverMods',
                model: 'GameMod'
            },
            {
                path: 'serverSlots',
                mode: 'ServerSlot',
            }]
        });
    }
    catch (error) {
        console.log(error);
        return null;
    }
    finally {
        mongoose.connection.close();
    }
}

export async function addNewGameServerToGuildData(guildId: string, serverName: string, serverToken: string) {
    // connect to db
    const mongoose = await mongoConnect();

    try {
        // get serverList
        const serverList = await DiscordGuild.findOne({ guildId: guildId });
        if (serverList !== undefined && serverList !== null) {

            // create and save game server data
            const result = await new GameServer({
                guildId: guildId,
                serverToken: serverToken,
                serverName: serverName,
                serverRegion: 'us-west',
                gameVersion: '',
                serverAdmins: [],
                serverMods: [],
                serverSlots: []
            }).save();

            // push id into serversList arrray
            serverList.gameServers.push(result._id);
            return await serverList.save();
        }
    }
    catch (error) {
        console.log(error);
        return undefined;
    }
    finally {
        mongoose.connection.close();
    }

    return undefined;
}

export async function deleteGameServerFromGuildData(guildId: string, serverToken: string) {
    console.log('removing gsm');
    console.log(guildId);
    console.log(serverToken);
    // connect to db
    const mongoose = await mongoConnect();

    try {
        // find and remove game server data
        const gsd = await GameServer.findOneAndDelete({ guildId: guildId, serverToken: serverToken});
        if (gsd === null) {
            console.error('could not find game server data')
            return undefined;
        }

        // remove game server id from guild data
        const serverData = await DiscordGuild.findOne({ guildId: guildId });
        if (serverData !== undefined && serverData !== null) {
            const index = serverData.gameServers.indexOf(gsd);
            serverData.gameServers.splice(index, 1);
            return await serverData.save();
        }
        console.error('coulndt find guild data');
        return undefined;
    }
    catch (error) {
        console.log(error);
        return undefined;
    }
    finally {
        mongoose.connection.close();
    }
}

export async function updateGameServerMods(guildId: string, serverToken: string,
    mods:
        {
            modName: string,
            modServerName: string,
            modServerId: string,
            version: string,
            enabled: boolean
        }[]) {

    // connect to db
    const mongoose = await mongoConnect();

    try {
        // get game server data
        const gsd = await GameServer.findOne({
            guildId: guildId,
            serverToken: serverToken
        });

        if (gsd !== undefined && gsd !== null) {

            await Promise.all(mods.map(async (mod) => {
                const result = await new GameMod({
                    guildId: guildId,
                    serverName: '',
                    serverToken: serverToken,
                    modName: mod.modName,
                    modServerName: mod.modServerName,
                    modServerId: mod.modServerId,
                    version: mod.version,
                    enabled: mod.enabled
                }).save();

                gsd.serverMods.push(result._id);
            }));

            await gsd.save();
        }
    }
    catch (error) {
        console.log(error);
    }
    finally {
        mongoose.connection.close();
    }
}

export async function getPopulatedGameServerData(guildId: string, serverToken: string) {
    // connect to db
    const mongoose = await mongoConnect();

    try {
        return await GameServer.findOne({ guildId: guildId }).populate([
            {
                path: 'serverMods',
                model: 'ServerMod',
            },
            {
                path: 'serverSlots',
                mode: 'ServerSlot',
            }
        ]);
    }
    catch (error) {
        console.log(error);
        return null;
    }
    finally {
        mongoose.connection.close();
    }
}
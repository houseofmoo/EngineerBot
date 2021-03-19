import mongoose, { Schema, Document } from 'mongoose'

export interface IGameMod extends Document {
    guildId: string,
    serverName: string,     
    serverToken: string,
    modName: string,        // mod name for seraching mods.factorio.mod
    modServerName: string,  // mod name once installed on game server (server combines name + version)
    modServerId: string,    // ID for mod once installed on game server
    version: string,        // version number
}

const GameModSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'GameServer' },
    guildId: String,
    serverName: String,
    serverToken: String,
    modName: String,
    modServerName: String,
    modServerId: String,
    version: String,
});

export interface IServerSlot extends Document {
    slotNumber: string,     // slot number (1-9)
    guildId: string,
    serverName: string,     
    serverToken: string,
    slotName: string,       // slot name
    slotMods: string[]      // contains the names of mods that are enabled for this slot
}

const ServerSlotSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'GameServer' },
    guildId: String,
    serverName: String,
    serverToken: String,
    slotNumber: Number,
    slotName: String,
    slotMods: [String]
});

export interface IGameServer extends Document {
    guildId: string,                // id of the guild this server belongs to
    serverName: string,             // name of server
    serverToken: string,            // token for this server
    serverRegion: string,           // region of server
    gameVersion: string,            // game version
    serverAdmins: string[],         // list of admins for server
    serverMods: IGameMod[],         // list of mods installed to server
    serverSlots: IServerSlot[]        // list of slots currently in use on game server
}

const GameServerSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'DiscordGuild' },
    guildId: String,
    serverName: String,
    serverToken: { type: String, unique: true },
    serverRegion: String,
    gameVersion: String,
    serverAdmins: [String],
    serverMods: [{
        type: Schema.Types.ObjectId,
        ref: 'GameMod'
    }],
    serverSlots: [{
        type: Schema.Types.ObjectId,
        ref: 'ServerSlot'
    }]
});

export interface IDiscordGuild extends Document {
    guildId: string,                        // ID of discord server
    guildName: string,                      // name of discord server
    gameServers: IGameServer[]              // list of game servers being managed
}

const DiscordGuildSchema = new Schema({
    guildId: { type: String, require: true, unique: true },
    guildName: String,
    gameServers: [{
        type: Schema.Types.ObjectId,
        ref: 'GameServer'
    }]
});

export const DiscordGuild = mongoose.model<IDiscordGuild>('DiscordGuild', DiscordGuildSchema);
export const GameServer = mongoose.model<IGameServer>('GameServer', GameServerSchema);
export const ServerSlot = mongoose.model<IServerSlot>('ServerSlot', ServerSlotSchema);
export const GameMod = mongoose.model<IGameMod>('GameMod', GameModSchema);
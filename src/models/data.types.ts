export type DiscordGuild = {
    guildId: string;
    guildName: string;
}

export type GameServer = {
    guildId: string;
    name: string;
    token: string;
    region: string;
    version: string;
    admins: string[];
}

export type Save = {
    guildId: string;
    token: string;
    slot1: string;
    slot2: string;
    slot3: string;
    slot4: string;
    slot5: string;
    slot6: string;
    slot7: string;
    slot8: string;
    slot9: string;
}

export type GameServerMods = {
    guildId: string;
    token: string;
    mods: Mod[];    // list of mods available on server
}

export type Mod = {
    name: string;
    version: string;
    modId: string;
    activeOn: string[];
}
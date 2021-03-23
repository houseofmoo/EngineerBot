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

export type GameServerSlots = {
    guildId: string;
    token: string;
    slots: Slot[];  // 9 is number of slots. always.
}

export type Slot = {
    name: string;
    slotId: string;
    utilized: boolean;  // does this slot contain a saved game
    mods: string[]      // list of mods enabled for this slot
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
}
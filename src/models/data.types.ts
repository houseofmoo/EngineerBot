export type Server = {
    guildId: string;
    name: string;
    token: string;
    region: string;
    admins: string[];
}

export type ServerSaves = {
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

export type GameMod = {   
    guildId: string;
    token: string;
    name: string;
    version: string;
    modId: string;
    activeOn: string[];
}
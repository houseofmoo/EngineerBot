export enum ServerCommandId {
    saves = "saves",
    modinstall = "modinstall",
    modupdate = "modupdate",
    moddelete = "moddelete",
    modon = "modon",
    modoff = "modoff",
    mods = "mods",
    start = "start",
    stop = "stop",
    msg = "msg",
    promote = "promote",
    promoteadd = "promoteadd",
    promoteremove = "promoteremove",
    promotelist = "promotelist",
    status = "status",
    info = "info",
    commands = "commands"
}

export enum GuildCommandId {
    servercreate = "servercreate",
    serveradd = "serveradd",
    serverremove = "serverremove",
    list = "list",
    servers = "servers",
    cheats = "cheats",
    newplayer = "newplayer",
    commands = "commands"
}

export enum ServerEvent {
    Join,
    Other
}

export enum ServerState {
    Offline = "offline",
    Starting = "starting",
    Online = "online",
    Stopping = "stoppinng"
}
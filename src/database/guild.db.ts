import faunadb from 'faunadb';
import config from '../data/config.json';
import { DiscordGuild } from '../models/data.types';


const q = faunadb.query;
const client = new faunadb.Client({ secret: config.database.secret });

export async function getGuildList() {
    try {
        const resp: any = await client.query(
            q.Map(
                q.Paginate(q.Match(q.Index("all_discord_guilds"))),
                q.Lambda("guildRef", q.Get(q.Var("guildRef")))
            )
        );

        // convert to DiscordGuild type
        if (resp !== undefined) {
            let guildList: DiscordGuild[] = [];
            for (const guildData of resp.data) {
                guildList.push({
                    guildId: guildData.data.guildId,
                    guildName: guildData.data.guildName
                });
            }

            return guildList;
        }

        return undefined;
    }
    catch (err) {
        console.log(err);
        console.log('error getting all guilds via inndex');
        return undefined;
    }
}

export async function getGuild(guildId: string) {
    try {
        const resp: any = await client.query(
            q.Get(q.Match(q.Index("discord_guild_by_guildId"), guildId))
        );

        if (resp !== undefined) {
            const guild: DiscordGuild = {
                guildId: resp.data.guildId,
                guildName: resp.data.guildName
            }

            return guild;
        }

        return undefined;
    }
    catch (err) {
        console.log(err);
        console.log('error geting a guild by guildId');
        return undefined;
    }
}

export async function removeGuild(guildId: string) {
    try {
        const guild: any = await getGuild(guildId);

        return await client.query(
            q.Delete(guild.ref)
        );
    }
    catch (err) {
        console.log(err);
        console.log('error while removing a guild by guild id');
        return undefined;
    }
}

export async function addGuild(newGuild: DiscordGuild) {
    try {
        return await client.query(
            q.Create(
                q.Collection("discord_guilds"),
                {
                    data: {
                        guildId: newGuild.guildId,
                        guildName: newGuild.guildName
                    }
                }
            )
        );
    }
    catch (err) {
        console.log(err);
        console.log('error while adding a guild to db');
        return undefined;
    }
}
// import faunadb from 'faunadb';
// import config from '../data/config.json';
// import { Guild } from '../models/data.types';

// const q = faunadb.query;
// const client = new faunadb.Client({ secret: config.database.secret });

// export async function getGuildList() {
//     try {
//         return await client.query(
//             q.Map(
//                 q.Paginate(q.Match(q.Index("all_discord_guilds"))),
//                 q.Lambda("guildRef", q.Get(q.Var("guildRef")))
//             )
//         );
//     }
//     catch (err) {
//         console.log(err);
//         console.log('error getting all guilds via inndex');
//         return undefined;
//     }
// }

// export async function getGuild(guildId: string) {
//     try {
//         return await client.query(
//             q.Get(q.Match(q.Index("discord_guild_by_guildId"), guildId))
//         );
//     }
//     catch (err) {
//         console.log(err);
//         console.log('error geting a guild by guildId');
//         return undefined;
//     }
// }

// export async function removeGuild(guildId: string) {
//     try {
//         const guild: any = await getGuild(guildId);

//         return await client.query(
//             q.Delete(guild.ref)
//         );
//     }
//     catch (err) {
//         console.log(err);
//         console.log('error while removing a guild by guild id');
//         return undefined;
//     }
// }

// export async function addGuild(newGuild: Guild) {
//     try {
//         return await client.query(
//             q.Create(
//                 q.Collection("discord_guilds"),
//                 {
//                     data: {
//                         guildId: newGuild.guildId,
//                         guildName: newGuild.guildName
//                     }
//                 }
//             )
//         );
//     }
//     catch (err) {
//         console.log(err);
//         console.log('error while adding a guild to db');
//         return undefined;
//     }
// }
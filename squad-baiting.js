import DiscordBasePlugin from './discord-base-plugin.js';

export default class SquadBaiting extends DiscordBasePlugin {
    static get description() {
        return "Squad Baiting plugin";
    }

    static get defaultEnabled() {
        return true;
    }

    static get optionsSpecification() {
        return {
            ...DiscordBasePlugin.optionsSpecification,
            channelID: {
                required: true,
                description: 'The ID of the channel to log admin broadcasts to.',
                default: '',
                example: '667741905228136459'
            },
            warnInGameAdmins: {
                required: false,
                default: true,
                description: ''
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onSquadCreated = this.onSquadCreated.bind(this)
        this.warnAdmins = this.warnAdmins.bind(this)
        // this.discordLog = this.discordLog.bind(this)

        this.playerBaiting = new Map();
        this.squadsBaiting = new Map();

        this.broadcast = (msg) => { this.server.rcon.broadcast(msg); };
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
    }

    async mount() {
        this.server.on('SQUAD_CREATED', this.onSquadCreated);
        let oldSquads = [];

        setInterval(async () => {
            await this.server.updateSquadList();
            // const squads = this.verbose(1, '', (await this.server.rcon.execute('ListSquads')).split('\n').map(e => /^ID:\s*(?<squadID>\d+)\s*\|\s*Name:\s*(?<squadName>[^|\s].*?)\s*\|\s*Size:\s*(?<size>\d+)\s*\|\s*Locked:\s*(?<locked>True|False)\s*\|\s*Creator Name:\s*(?<creator_name>[^|\s].*?)\s*\|\s*Creator Steam ID:\s*(?<creator_steam_id>\d+)$/i.exec(e)?.groups).filter(e => e != null));
            const players = (await this.server.rcon.execute('ListPlayers')).split('\n').map(e => /^ID: (?<id>\d+)\s+\|\s+SteamID: (?<steamID>\d+)\s+\|\s+Name: (?<name>[^|]+)\s+\|\s+Team ID: (?<teamID>\d)\s+\|\s+Squad ID: (?<squadID>\d)\s+\|\s+Is Leader: (?<isLeader>True|False)\s+\|\s+Role: (?<role>.+)$/.exec(e)?.groups).filter(e => e != null);
            // this.verbose(1, '', players)

            const newSquads = this.server.squads.map(e => ({ ...e, leader: players.find(p => p.squadID == e.squadID && p.teamID == e.teamID && p.isLeader == 'True') }));
            oldSquads.forEach(async s => {
                const match = newSquads.find(ns => ns.squadID == s.squadID && ns.teamID == s.teamID && ns.squadName == s.squadName)
                const baiting = match && match.leader.steamID != s.leader.steamID;
                const sqUid = `${s.teamID};${s.squadID};${s.squadName}`;
                this.verbose(1, 'baiting', sqUid, s.leader.name)
                if (baiting) {
                    const plBaitingAmount = (this.playerBaiting.get(s.leader.steamID) || 0) + 1;
                    this.playerBaiting.set(s.leader.steamID, plBaitingAmount)

                    const sqBaitsAmount = (this.squadsBaiting.get(sqUid) || 0) + 1;
                    this.squadsBaiting.set(sqUid, sqBaitsAmount)

                    await this.warn(s.leader.steamID, 'Squad baiting is not allowed!')
                    await this.warnAdmins(`[${s.leader.name}] is doing squad baiting.\n  Player's baits: ${plBaitingAmount}\n  Squad Info:\n   Name: ${s.squadName}\n   Number: ${s.squadID}\n   Team: ${s.teamID}\n   Baits: ${sqBaitsAmount}`)
                }
            })

            oldSquads = [ ...newSquads ];
        }, 5000)
    }

    onSquadCreated(info) {
        this.verbose(1, "Squad Created:", info.player.teamID, info.player.squadID)

    }

    async unmount() {
        this.verbose(1, 'Un-mounted.');
    }

    async warnAdmins(message) {
        const admins = await this.server.getAdminsWithPermission('canseeadminchat');
        for (const player of this.server.players) {
            if (!admins.includes(player.steamID)) continue;

            if (this.options.warnInGameAdmins)
                await this.warn(player.steamID, message);
        }
    }
}
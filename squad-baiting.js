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
            },
            resetPlayerCountersAtNewGame: {
                required: false,
                default: true,
                description: ''
            },
            playerRules: {
                required: false,
                default: [],
                description: 'Set of rules that will be applied on player events',
                example: [
                    {
                        name: 'Friendly and human-readable name',
                        enabled: true,
                        baitingCounter: {
                            min: 0,
                            max: 10
                        },
                        actions: [
                            {
                                type: 'rcon',
                                content: 'AdminWarn {}'
                            }
                        ]
                    }
                ]
            },
            squadRules: {
                required: false,
                default: [],
                description: 'Set of rules that will be applied on squad events',
                example: [
                    {
                        name: 'Martian-readable name',
                        enabled: true,
                        baitingCounter: {
                            min: 5,
                            max: Infinity
                        },
                        actions: [
                            {
                                type: 'rcon',
                                content: 'AdminWarn {}'
                            }
                        ]
                    }
                ]
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onSquadCreated = this.onSquadCreated.bind(this)
        this.warnAdmins = this.warnAdmins.bind(this)
        this.onSquadBaiting = this.onSquadBaiting.bind(this)
        this.formatActionContent = this.formatActionContent.bind(this)
        this.onPlayerDisconnected = this.onPlayerDisconnected.bind(this);
        this.onPlayerConnected = this.onPlayerConnected.bind(this);
        this.onNewGame = this.onNewGame.bind(this);
        this.resetPlayerCounters = this.resetPlayerCounters.bind(this);
        this.sendDiscordRuleLog = this.sendDiscordRuleLog.bind(this);
        // this.discordLog = this.discordLog.bind(this)

        this.playerBaiting = new Map();
        this.squadsBaiting = new Map();

        this.broadcast = (msg) => { this.server.rcon.broadcast(msg); };
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
    }

    async mount() {
        this.server.on('SQUAD_CREATED', this.onSquadCreated);
        this.server.on('PLAYER_DISCONNECTED', this.onPlayerDisconnected);
        this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
        this.server.on('NEW_GAME', this.onNewGame);

        let oldSquads = [];

        setInterval(async () => {
            await this.server.updateSquadList();
            // const squads = this.verbose(1, '', (await this.server.rcon.execute('ListSquads')).split('\n').map(e => /^ID:\s*(?<squadID>\d+)\s*\|\s*Name:\s*(?<squadName>[^|\s].*?)\s*\|\s*Size:\s*(?<size>\d+)\s*\|\s*Locked:\s*(?<locked>True|False)\s*\|\s*Creator Name:\s*(?<creator_name>[^|\s].*?)\s*\|\s*Creator Steam ID:\s*(?<creator_steam_id>\d+)$/i.exec(e)?.groups).filter(e => e != null));
            const playerRegex = /^ID:\s*(?<id>\d+)\s*\|\s*SteamID:\s*(?<steamID>\d+)\s*\|\s*Name:\s*(?<name>.*?)\s*\|\s*Team ID:\s*(?<teamID>\d+)\s*\|\s*Squad ID:\s*(?<squadID>\d+)\s*\|\s*Is Leader:\s*(?<isLeader>True|False)\s*\|\s*Role:\s*(?<role>[^|\s].*?)\s*$/im;
            const players = (await this.server.rcon.execute('ListPlayers')).split('\n').map(e => playerRegex.exec(e)?.groups).filter(e => e != null);
            // this.verbose(1, '', players)

            const newSquads = this.server.squads.map(e => ({ ...e, leader: players.find(p => p.squadID == e.squadID && p.teamID == e.teamID && p.isLeader == 'True') }));
            oldSquads.forEach(async s => {
                const match = newSquads.find(ns => ns.squadID == s.squadID && ns.teamID == s.teamID && ns.squadName == s.squadName)
                const baiting = match && match.leader.steamID != s.leader.steamID;
                const sqUid = `${s.teamID};${s.squadID};${s.squadName}`;
                // this.verbose(1, 'baiting', sqUid, s.leader.name)
                if (baiting) {
                    const plBaitingAmount = (this.playerBaiting.get(s.leader.steamID) || 0) + 1;
                    this.playerBaiting.set(s.leader.steamID, plBaitingAmount)

                    const sqBaitsAmount = (this.squadsBaiting.get(sqUid) || 0) + 1;
                    this.squadsBaiting.set(sqUid, sqBaitsAmount)

                    s.baitingCounter = sqBaitsAmount
                    s.leader.baitingCounter = plBaitingAmount

                    this.onSquadBaiting(s, match)
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
        if (!this.options.warnInGameAdmins) return;
        for (const player of this.server.players) {
            if (!admins.includes(player.steamID)) continue;

            await this.warn(player.steamID, message);
        }
    }

    async onSquadBaiting(oldSquad, newSquad) {
        // this.verbose(1, 'Squad baiting', oldSquad, newSquad)
        // await this.warn(oldSquad.leader.steamID, 'Squad baiting is not allowed!')
        await this.warnAdmins(`[${oldSquad.leader.name}] is doing squad baiting.\n  Player's baits: ${oldSquad.leader.baitingCounter}\n\n  Squad Info:\n   Name: ${oldSquad.squadName}\n   Number: ${oldSquad.squadID}\n   Team: ${oldSquad.teamID}\n   Baits: ${oldSquad.baitingCounter}`)

        const activePlayerRules = this.options.playerRules.filter(r => r.enabled && r.baitingCounter.min <= oldSquad.leader.baitingCounter && r.baitingCounter.max >= oldSquad.leader.baitingCounter).map(r => ({ ...r, type: 'Player' }));
        const activeSquadRules = this.options.squadRules.filter(r => r.enabled && r.baitingCounter.min <= oldSquad.baitingCounter && r.baitingCounter.max >= oldSquad.baitingCounter).map(r => ({ ...r, type: 'Squad' }));
        this.verbose(1, 'Triggered PLAYER rules', activePlayerRules.map(r => r.name))
        this.verbose(1, 'Triggered SQUAD rules', activeSquadRules.map(r => r.name))

        for (let r of activePlayerRules.concat(activeSquadRules)) {
            if (!r.enabled) continue;
            for (let a of r.actions.filter(act => act.enabled || act.enabled == undefined)) {
                const formattedContent = this.formatActionContent(a.content, oldSquad, newSquad);
                a.formattedContent = formattedContent
                // this.verbose(1, 'Formatted action content', formattedContent)
                switch (a.type.toLowerCase()) {
                    case 'rcon':
                        this.server.rcon.execute(formattedContent)
                        break;
                }
            }
            this.sendDiscordRuleLog(r, oldSquad, newSquad);
        }
    }

    async onPlayerDisconnected(info) {
        const { steamID, name: playerName, teamID } = info.player;
        // this.verbose(1, 'Disconnected', steamID, playerName, info)
        this.resetPlayerCounters(steamID)
    }
    async onPlayerConnected(info) {
        const { steamID, name: playerName, teamID } = info.player;
        this.resetPlayerCounters(steamID)
    }

    resetPlayerCounters(steamID) {
        this.playerBaiting.set(steamID, 0)
    }

    async onNewGame(info) {
        this.squadsBaiting = new Map();

        if (this.options.resetPlayerCountersAtNewGame)
            this.playerBaiting = new Map();
    }

    formatActionContent(content, oldSquad, newSquad) {
        return content
            .replace(/\{squad:teamid\}/ig, oldSquad.teamID)
            .replace(/\{squad:id\}/ig, oldSquad.squadID)
            .replace(/\{squad:squadid\}/ig, oldSquad.squadID)
            .replace(/\{squad:name\}/ig, oldSquad.squadName)
            .replace(/\{squad:teamname\}/ig, oldSquad.leader.role.split('_')[ 0 ])
            .replace(/\{old_leader:username\}/ig, oldSquad.leader.name)
            .replace(/\{old_leader:steamid\}/ig, oldSquad.leader.steamID)
            .replace(/\{old_leader:baitingcounter\}/ig, oldSquad.leader.baitingCounter)
            .replace(/\{new_leader:username\}/ig, newSquad?.leader?.name)
            .replace(/\{new_leader:steamid\}/ig, newSquad?.leader?.steamID)
            .replace(/\{new_leader:baitingcounter\}/ig, newSquad?.leader?.baitingCounter)
    }

    async sendDiscordRuleLog(rule, oldSquad, newSquad) {
        if (rule.discordLogging === false) return;
        const actionsEmbedFields = rule.actions.filter(act => act.enabled || act.enabled == undefined).map(a => ({ name: a.type.toUpperCase(), value: `\`\`\`${a.formattedContent}\`\`\``, inline: false }))
        await this.sendDiscordMessage({
            embed: {
                title: `[${oldSquad.leader.name}] Squad-Baiting`,
                color: "ee1111",
                fields: [
                    {
                        name: 'Leader\'s Username',
                        value: oldSquad.leader.name,
                        inline: true
                    },
                    {
                        name: 'Leader\'s SteamID',
                        value: `[${oldSquad.leader.steamID}](https://steamcommunity.com/profiles/${oldSquad.leader.steamID})`,
                        inline: true
                    },
                    {
                        name: 'Team & Squad',
                        value: `Team: ${oldSquad.teamID}, Squad: ${oldSquad.squadID}`,
                        inline: true
                    },
                    {
                        name: 'Squad',
                        value: oldSquad.squadName,
                        inline: true
                    },
                    {
                        name: 'Team',
                        value: oldSquad.leader.role.split('_')[ 0 ],
                        inline: true
                    },
                    {
                        name: 'Triggered Rules',
                        value: rule.name,
                        inline: false
                    },
                    {
                        name: 'Executed Actions',
                        value: ':small_red_triangle_down: :small_red_triangle_down: :small_red_triangle_down: :small_red_triangle_down: :small_red_triangle_down:',
                        inline: false
                    },
                    ...actionsEmbedFields
                ]
            },
            timestamp: (new Date()).toISOString()
        });
    }
}
import DiscordBasePlugin from './discord-base-plugin.js';

export default class SquadNameValidator extends DiscordBasePlugin {
    static get description() {
        return "Squad Name Validator plugin";
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
            warningMessage: {
                required: false,
                description: "",
                default: "Your squad has been disbanded due to non-compliant name.\n\nForbidden: %FORBIDDEN%",
            },
            rules: {
                required: false,
                description: "",
                default: [
                    {
                        type: "regex",
                        logic: "match=allow",
                        rule: /a-z\d=\$\[\]\!\.\s\-/
                    }
                ],
                example: [
                    {
                        type: "regex",
                        logic: "match=disband",
                        logic: "match=allow",
                        rule: /[^a-z\d=\$\[\]\!\.\s\-]/
                    },
                    {
                        type: "equals",
                        rule: "ARMOUR"
                    },
                    {
                        type: "includes",
                        rule: "F*CK"
                    }
                ]
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onSquadCreated = this.onSquadCreated.bind(this)
        this.discordLog = this.discordLog.bind(this)

        this.broadcast = (msg) => { this.server.rcon.broadcast(msg); };
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
    }

    async mount() {
        this.server.on('SQUAD_CREATED', this.onSquadCreated);
    }

    onSquadCreated(info) {
        let disband = false;
        let rule = null;
        for (let r of this.options.rules) {
            switch (r.type.toLowerCase()) {
                case 'regex':
                    r.rule = r.rule.replace(/^\//, '').replace(/\/$/, '')

                    const reg = new RegExp(r.rule, "gi");
                    const regRes = info.squadName.match(reg)

                    switch (r.logic.toLowerCase()) {
                        case 'match=allow':
                            if (!regRes) disband = info.squadName;
                            break;
                        case 'match=disband':
                        default:
                            if (regRes) disband = regRes.join(', ')
                    }
                    // this.verbose(1, "Testing rule", info.squadName, reg, disband)
                    break;
                case 'equals':
                    disband = info.squadName.toLowerCase() === r.rule.toLowerCase() ? info.squadName : false;
                    break;
                case 'includes':
                    disband = info.squadName.toLowerCase().includes(r.rule.toLowerCase()) ? r.rule : false
                    break;
                case 'startsWith':
                    disband = info.squadName.toLowerCase().startsWith(r.rule.toLowerCase()) ? r.rule : false
                    break;
                case 'endsWith':
                    disband = info.squadName.toLowerCase().endsWith(r.rule.toLowerCase()) ? r.rule : false
                    break;
                default:
            }

            rule = r;

            if (disband) break
        }
        this.verbose(1, "Squad Created:", info.player.teamID, info.player.squadID, disband)

        if (disband) {
            const disbandMessage = rule.warningMessage || this.options.warningMessage;
            this.server.rcon.execute(`AdminDisbandSquad ${info.player.teamID} ${info.player.squadID}`);
            this.warn(info.player.steamID, disbandMessage.replace(/\%FORBIDDEN\%/ig, disband))
            this.discordLog(info, disband, rule)
        }
    }

    async discordLog(info, forbidden, rule = null) {
        let regex = rule ? new RegExp(rule.rule, "gi").toString() : null;
        await this.sendDiscordMessage({
            embed: {
                title: `Squad Disbanded: ${info.squadName}`,
                color: "ee1111",
                fields: [
                    {
                        name: 'Creator\'s Username',
                        value: info.player.name,
                        inline: true
                    },
                    {
                        name: 'Creator\'s SteamID',
                        value: `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`,
                        inline: true
                    },
                    {
                        name: 'Team & Squad',
                        value: `Team: ${info.player.teamID}, Squad: ${info.player.squadID || 'Unassigned'}`
                    },
                    {
                        name: 'Forbidden Chars/Word',
                        value: forbidden
                    },
                    (regex ? { name: 'Logic', value: rule.logic.toLowerCase(), inline: true } : null),
                    (regex ? { name: 'Regex', value: regex.toString(), inline: true } : null)
                ].filter(e => e),
                timestamp: info.time.toISOString()
            }
        });
    }

    async unmount() {
        this.verbose(1, 'Squad Name Validator was un-mounted.');
    }
}
## SquadBaiting
Squad Baiting plugin for SquadJS

### Rule variables
- `{squad:name}` Name of the squad
- `{squad:teamid}` TeamID of the squad
- `{squad:squadid}` SquadID of the squad
- `{squad:teamname}` Short name of the team
- `{squad:baitingcounter}` Amount of squad baiting of the squad
- `{old_leader:username}` Username of the previous squadleader
- `{old_leader:steamid}` SteamID of the previous squadleader
- `{old_leader:baitingcounter}` Amount of squad baiting of the previous squadleader
- `{new_leader:username}` Username of the new squadleader
- `{new_leader:steamid}` SteamID of the new squadleader
- `{new_leader:baitingcounter}` Amount of squad baiting of the new squadleader

### Example configuration
```json
{
    "plugin": "SquadBaiting",
    "enabled": true,
    "discordClient": "discord",
    "channelID": "1116600997722661199",
    "resetPlayerCountersAtNewGame": true,
    "warnInGameAdmins": true,
    "disableDefaultAdminWarns": false,
    "playerRules": [
        {
            "name": "Squad baiting is not allowed",
            "enabled": true,
            "discordLogging": false,
            "baitingCounter": {
                "min": 0,
                "max": 6
            },
            "actions": [
                {
                    "type": "rcon",
                    "enabled": true,
                    "content": "AdminWarn {old_leader:steamid} \"Squad baiting is not allowed\""
                }
            ]
        },
        {
            "name": "Kick player",
            "enabled": true,
            "discordLogging": true,
            "baitingCounter": {
                "min": 7,
                "max": 15
            },
            "actions": [
                {
                    "type": "rcon",
                    "enabled": false,
                    "content": "AdminKick {old_leader:steamid} \"Squad baiting not allowed\""
                }
            ]
        }
    ],
    "squadRules": [
        {
            "name": "Pre-disband warnings",
            "enabled": true,
            "baitingCounter": {
                "min": 4,
                "max": 5
            },
            "actions": [
                {
                    "type": "rcon",
                    "content": "AdminBroadcast \"Squad {squad:squadid} Team {squad:teamid} will be disbanded due to squad-baiting\""
                },
                {
                    "type": "rcon",
                    "content": "AdminDisbandSquad {squad:teamid} {squad:squadid}"
                },
                {
                    "type": "warn-admins",
                    "content": "{old_leader:name} is doing squadbaiting"
                }
            ]
        },
        {
            "name": "Disband warnings",
            "enabled": true,
            "baitingCounter": {
                "min": 6,
                "max": 10
            },
            "actions": [
                {
                    "type": "rcon",
                    "content": "AdminBroadcast \"Squad {squad:squadid} Team {squad:teamid} has been disbanded due to squad-baiting\""
                },
                {
                    "type": "rcon",
                    "content": "AdminDisbandSquad {squad:teamid} {squad:squadid}"
                }
            ]
        }
    ]
}
```

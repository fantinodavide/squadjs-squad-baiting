## SquadNameValidator
Squad Name Validator plugin for SquadJS.
Automatically disbans squads if their name is not compliant to specific rules.
Every rule is CASE-INSENSITIVE

### Rule format
```json
{
    "description": "(Optional) Human-readable description",
    "type": "regex | equals | includes | startsWith | endsWith",
    "logic": "MATCH=DISBAND | match=allow",
    "rule": "[^a-z\\d=\\$\\[\\]\\!\\.\\s\\-] | WORD",
    "warningMessage": "(Optional) This warning message will override the default message.\n\nForbidden: %FORBIDDEN%", 
}
```

### Useful Rules
```json
[
    {
        "description": "Disband every ARMOR/ARMOUR/VIC/VEHICLE and other variants",
        "type": "regex",
        "logic": "match=disband",
        "rule": "/(a ?r ?m ?(?:o|e)? ?u? ?r)|(v ?i ?c)|(v ?e ?h ?i ?c ?l ?e)/"
    }
]
```

### Example configuration
```json
{
    "plugin": "SquadNameValidator",
    "enabled": true,
    "discordClient": "discord",
    "channelID": "1116600997722661199",
    "warningMessage": "Your squad has been disbanded due to non-compliant name.\n\nForbidden: %FORBIDDEN%",
    "rules": [
        {
            "type": "regex",
            "logic": "match=allow",
            "rule": "/[a-z\\d]/",
            "warningMessage": "This warning message will override the default message.\n\nForbidden: %FORBIDDEN%",    
        },
        {
            "description": "",
            "type": "regex",
            "logic": "match=disband",
            "rule": "[^a-z\\d=\\$\\[\\]\\!\\.\\s\\-]"
        },
        {
            "type": "equals",
            "rule": "ARMOUR"
        },
        {
            "type": "includes",
            "rule": "F*CK"
        }
    ]
}
```

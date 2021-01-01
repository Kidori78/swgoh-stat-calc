# SWGOH Stat Calculator for GAS Readme #

A class that calculates unit stats for EA's Star Wars: Galaxy of Heroes based on player data or global unit builds.
Accepted data formats are those found in [swgoh.help's API](http://api.swgoh.help) endpoints, specifically the 'player.roster' object from their `/player` endpoint. Examples given use [swgoh-help-api Client Wrapper by PopGoesTheWza](https://github.com/PopGoesTheWza/swgoh-help-api) to get the data from the SWGOH.HELP API.

## Setup ##
Create a new script file in your Google App Script project and then copy and paste the statCalculator.gs file to it. This file uses ES6 so you must set your Google App Script project to utilize the V8 runtime, for instructions on how to do that check [developers.google.com](https://developers.google.com/apps-script/guides/v8-runtime#enabling_the_v8_runtime). 

#### Initialization ####
```js
const statCalculator = new StatCalculator();
statCalculator.setGameData();
```

## Methods ##

### .setGameData() ###

Sets the needed data object for calculating all galactic power and stats by fetching it from https://swgoh-stat-calc.glitch.me/gameData.json and applying them to the classes properties.
As hinted at in the **Setup** code above, this needs to be called before any other methods can be used.
That link should remain active and updated, and thus can be used directly to create the data object.
To create the object from [swgoh.help's](http://api.swgoh.help) `/data` endpoint, see the code in [dataBuilder.js](https://glitch.com/edit/#!/swgoh-stat-calc?path=statCalc/dataBuilder.js). (A separate package for this code will be created in the future, but for now, it's just hiding in that project).

#### Example ####

```js
const statCalculator = new StatCalculator();
statCalculator.setGameData();
```

### .setMaxValues(newValues) ###

Changes the set values in the maxValue property for the class. 
This property is currently only used with the .getMaxValueUnits Method.

#### Parameters ####

`newValues` *Object*\
The object containing the new value to set for the specified key(s).
```js
{
  rarity: <integer>,     // Unit Rarity/Stars
  level: <integer>,      // Unit Level
  gear: <integer>,       // Character Gear Level
  relic: <integer>,      // In-game Relic Level + 2, 1 = locked, 2 = unlocked, 3 = Level 1
  modRarity: <integer>,  // Dots of the mod, represented by a roman numeral in the name of the mod
  modLevel: <integer>,   // Level of the mod
  modTier:: <integer>    // Color of the mod, represented by the letter A(5) to E(1) in the name of the mod
}  
```

### .getMaxValueUnits(options) ###

Calculates stats for all ships and/or characters based on the *maxValues* property and returns it as an object.
Allows for customizing the object returned including stat calculations and adding gp.

#### Parameters ####

`options` *Object*\
The object containing flags for indicating what unit type you want to return and options for the calculations.
```js
{
  char: <bool>,            // true returns all characters with specified calculations
  ship: <bool>,            // true returns all ships with specified calculations
  gpIncludeMods: <bool>,   // OPTIONAL: true returns galactic power with mod ratings included, must use with calcGP
  calcOptions: {           // OPTIONAL: for setting calculation options
                 gameStyle: <bool>,   // true returns final stats and activates percentVals, see `Options` below for a breakdown
                 calcGP: <bool>       // true adds gp to each unit object
                 percentVals: <bool>  // true returns percent values for stats using ratings, see `Options` below for a breakdown
                 language: {Object}   // Changes the key for stat values from an integer to a named value, see `Options` below for a breakdown
  }
}
```

#### Return Value ####

An object with the games full roster for the specified type(s).
Both true: `ships:true, char:true`
```js
{
  character: {
               BASEID: {object},  // Roster object including .stats
               ...
             }
  ship: {
          BASEID: {object},      // Roster object including .stats
          ...
        }
}
```
Only one true: `ships:true` or `char:true`
```js
{
  BASEID: {object},  // Roster object including .stats
  ...
}
```

### .calcCharStats(char [,options] ) ###

Calculates stats for a single character.

#### Parameters ####

`char` *Object*\
The character object to calculate stats for.  Only a single character is allowed.  See `Object Formats` below for more info.

`options` *Object* `| Optional`\
Optional adjustments to various aspects of the calculations and returned object.  See `Options` below for a breakdown.

#### Return Value ####

Adds .stats object to the character object given.

#### Example ####

```js
// get Player roster from api.swgoh.help
 const client = new swgohhelpapi.exports.Client(this.settings);
 let player = client.fetchPlayer({
  allycode: 231686213,
  language: "ENG_US",
  project: {
    roster: {
      defId: true,
      nameKey: true,
      rarity: true,
      level: true,
      gear: true,
      equipped: true,
      combatType: true,
      skills: true,
      mods: true,
      relic: true
    }
  }
});
// pull Darth Sion out of roster as an example
let char = player.roster.find( unit => unit.defId == "DARTHSION" );
// get stats
char.stats = statCalculator.calcCharStats( char );
```

### .calcShipStats(ship, crew [,options] ) ###

Calculates stats for a single ship.

#### Parameters ####

`ship` *Object*\
The ship object to calculate stats for.  Only a single character is allowed.  See `Object Formats` below for more info.

`crew` *Array*\
Array of crew members belonging to the ship.  Each element is regular character object.  See `Object Formats` below for more info.

`options` *Object* `| Optional`\
Optional adjustments to various aspects of the calculations and returned object.  See `Options` below for a breakdown.

#### Return Value ####

Adds .stats object to the ship object given.

#### Example ####

```js
// get Player roster from api.swgoh.help
 const client = new swgohhelpapi.exports.Client(this.settings);
 let player = client.fetchPlayer({
  allycode: 231686213,
  language: "ENG_US",
  project: {
    roster: {
      defId: true,
      nameKey: true,
      rarity: true,
      level: true,
      gear: true,
      equipped: true,
      combatType: true,
      skills: true,
      mods: true,
      relic: true,
      crew: true
    }
  }
});
// pulls Hound's Tooth out of roster as an example
let ship = player.roster.find( unit => unit.defId == "HOUNDSTOOTH" );
// pulls Bossk out of roster for example crew
let crew = player.roster.find( unit => unit.defId == "BOSSK" );
// get stats
ship.stats = statCalculator.calcShipStats( ship, [crew] );
```

### .calcRosterStats(units [, options] ) ###

Goes through a players entire roster and calls `.calcCharStats()` or `.calcShipStats()` depending on each unit's `combatType`.

#### Parameters ####

`units` *Array*\
Array of unit objects to calculate stats for.  Each element is regular unit object.  See `Object Formats` below for more info.

`options` *Object* `| Optional`\
Optional adjustments to various aspects of the calculations and returned object.  See `Options` below for a breakdown.

#### Return Value ####

The number of units that had stats calculated.
The original `units` array has been altered such that each element now has a `.stats` property with the calculated stats.

#### Example ####

```js
// get Player roster from api.swgoh.help
 const client = new swgohhelpapi.exports.Client(this.settings);
 let player = client.fetchPlayer({
  allycode: 231686213,
  language: "ENG_US",
  project: {
    roster: {
      defId: true,
      nameKey: true,
      rarity: true,
      level: true,
      gear: true,
      equipped: true,
      combatType: true,
      skills: true,
      mods: true,
      relic: true,
      crew: true
    }
  }
});
// get stats for full roster
let count = statCalculator.calcRosterStats( player.roster );
```

### .calcPlayerStats(players [, options] ) ###

Calls `.calcRosterStats()` for each roster object in the player profile(s) submitted.

#### Parameters ####

`players` *Object* or *Array*\
Full player profile(s).  Either a single player or an array of players is accepted.  See `Object Formats` below for more info.

`options` *Object* `| Optional`\
Optional adjustments to various aspects of the calculations and returned object.  See `Options` below for a breakdown.

#### Return Value ####

The number of units that had stats calculated.
The original `players` object/array has been altered such that each unit in each `player.roster` object now has a `.stats` property with the calculated stats.

#### Example ####

```js
// get Player roster from api.swgoh.help
 const client = new swgohhelpapi.exports.Client(this.settings);
 let player = client.fetchPlayer({
  allycode: 231686213,
  language: "ENG_US",
  project: {
    roster: {
      defId: true,
      nameKey: true,
      rarity: true,
      level: true,
      gear: true,
      equipped: true,
      combatType: true,
      skills: true,
      mods: true,
      relic: true,
      crew: true
    }
  }
});
// get stats for full roster
let count = statCalculator.calcPlayerStats( player );
```

### .calcCharGP(char [,options]) ###

Calculates galactic power for a single character.

#### Parameters ####

`char` *Object*\
The character object to calculate gp for.  Only a single character is allowed.  See `Object Formats` below for more info.

`options` *Object* `| Optional`\
Optional adjustments to various aspects of the calculations and returned object.  See `Options` below for a breakdown.

#### Return Value ####

The `gp` object for the given character.

#### Example ####

```js
// get Player roster from api.swgoh.help
 const client = new swgohhelpapi.exports.Client(this.settings);
 let player = client.fetchPlayer({
  allycode: 231686213,
  language: "ENG_US",
  project: {
    roster: {
      defId: true,
      nameKey: true,
      rarity: true,
      level: true,
      gear: true,
      equipped: true,
      combatType: true,
      skills: true,
      mods: true,
      relic: true
    }
  }
});
// pull Darth Sion out of roster as an example
let char = player.roster.find( unit => unit.defId == "DARTHSION" );
// get gp
char.gp = statCalculator.calcCharGP( char );
```

### .calcShipGP(ship, crew [, options]) ###

Calculates galactic power for a single ship.

#### Parameters ####

`ship` *Object*\
The character object to calculate gp for.  Only a single character is allowed.  See `Object Formats` below for more info.

`options` *Object* `| Optional`\
Optional adjustments to various aspects of the calculations and returned object.  See `Options` below for a breakdown.

#### Return Value ####

The `gp` object for the given ship.

#### Example ####

```js
// get Player roster from api.swgoh.help
 const client = new swgohhelpapi.exports.Client(this.settings);
 let player = client.fetchPlayer({
  allycode: 231686213,
  language: "ENG_US",
  project: {
    roster: {
      defId: true,
      nameKey: true,
      rarity: true,
      level: true,
      gear: true,
      equipped: true,
      combatType: true,
      skills: true,
      mods: true,
      relic: true
    }
  }
});
// pulls Hound's Tooth out of roster as an example
let ship = player.roster.find( unit => unit.defId == "HOUNDSTOOTH" );
// pulls Bossk out of roster for example crew
let crew = player.roster.find( unit => unit.defId == "BOSSK" );
// get gp
ship.gp = statCalculator.calcShipGP( ship, [crew] );
```

## Options ##

The `options` parameter of all calculation methods is an object that can contain any of the following properties.
The *Default* explanations below are what is used when the related flag(s) are not used.

#### Example ####
```js
{ gameStyle: true, unscaled: true }
```

### Calculation control ###
`calcGP: true`\ 
Adds the gp property to the unit object with the correct Galactic Power.
Only works in .calcRosterStats, .calcPlayerStats, and .getMaxValueUnits.

`withoutModCalc: true`\
Speeds up character calculations by ignoring stats from mods.\
*Default* - calculate mods stats for all characters that include them.

`useValues: {Object}`\
Overrides unit parameters with specific values.
Object structure and total options are as defined below.
Parameters provided here can be missing in the original unit.
```js
{
  char: { // used when calculating character stats
    rarity: 1-7,
    level: 1-90,
    gear: 1-12,
    equipped: "all" || "none" || [1,2,3,4,5,6], // See Below
    relic: 1-9 // 1='locked', 2='unlocked', 3=R1, 4=R2, ...9=R7
  },
  ship: { // used when calculating ship stats
    rarity: 1-7,
    level: 1-90
  },
  crew: { // used for characters when calculating ship stats
    rarity: 1-7,
    level: 1-90,
    gear: 1-12,
    equipped: "all" || "none" || [1,2,3,4,5,6] || 1-6, // See Below
    skills: "max" || "maxNoZeta" || 1-8, // See Below
    modRarity: 1-7,
    modLevel: 1-15,
    relic: 1-9 // 1='locked', 2='unlocked', 3=R1, 4=R2, ...9=R7
  }
}
```
>`char.equipped` / `crew.equipped` - gear currently equipped on characters/crew:
>* *"all"* - all possible gear at the current level.
>* *"none"* - no gear at the current level.
>* *Array* - List of filled slots.  Slots are numbered 1-6, left to right, starting at the top by in-game UI.
>* *Integer* - Number, 1-6, of gear pieces equipped at current level.  Only valid for crew.

>`char.relic` / `crew.relic` - Relic 'Tier' to use\
>Used as the `relic.currentTier` property in .help's data format.\
>Values of 1 and 2 are for 'locked' and 'unlocked', while values >2 are 2 more than the actual Relic Level.

>`crew.skills` - skill level to use for all crew members' abilities:
>* *"max"* - Max possible level.
>* *"maxNoZeta"* - Leaves zeta abilities at level 7, but uses max level for all others.
>* *Integer* - Number, 1-8, to use for all abilities, if possible.\
8 or higher is identical to *"max"*.


*Default* - uses the values defined by the unit objects submitted.\
This applies to each individual property of the `useValues` object, not just the option as a whole.

### Value control ###

`percentVals: true`\
Converts internal flat values for Defense (Armor/Resistance) and Crit Chance (Special/Physical) to the percentages displayed in-game.
Uses the decimal form (i.e. 10% is returned as 0.1)\
*Default* - return the flat values for above stats.

`scaled: true` / `unscaled: true`\
Matches scaling status of values used internally to the game (as seen in portions of [swgoh.help's](http://api.swgoh.help) `/data` endpoint).\
>`scaled` - multiplies all values by 10,000.  All non-modded stats should be integers at this scale.\
`unscaled` - multiplies all values by 100,000,000.  All stats (including mods) fit as integers at this scale.\
*Default* - Stats returned at the expected scale as seen in-game.  Non-percent stats (like Speed) should be integers, all percent stats (like Potency) will be decimals

### Stats Object Style ###

*Default*\
The default Stats Object Style has the following properties:
>`base` *all units* - The base value of of the unit's stats without any stats from mods/gear/crew.
For characters, these are the values used in mods with a percent bonus.
>`gear` *characters* - Amount of stat granted by currently equipped gear (and unused within mod calculations).\
>`mods` *characters* - Amount of stat granted by mods.\
>`crew` *ships* - Amount of stat granted by crew rating.

`gameStyle: true`\
Activates the `percentVals` flag above, and also changes the Stats Object to have the following properties:
>`final` *all units* - Sums values from base, gear, mods, and/or crew into the total stat value.\
>`gear` *characters* - Amount of stat granted by currently equipped gear (and unused within mod calculations).\
>`mods` *characters* - Amount of stat granted by mods.\
>`crew` *ships* - Amount of stat granted by crew rating.

### Stat Naming Options ###

`language: {Object}`\
Tells the calculator to rename the stats using the submitted object.
Used mostly for localization.
*Object* must be such that `options.language[ statID ]` is the stat name, i.e. `{"1": "Health",...}`.\
```js
{
   "1": "Health",
   "2": "Strength (STR)",
   "3": "Agility (AGI)",
   "4": "Tactics (TAC)",
   "5": "Speed",
   "6": "Physical Damage",
   "7": "Special Damage",
   "8": "Armor",
   "9": "Resistance",
   "10": "Armor Penetration",
   "11": "Resistance Penetration",
   "12": "Dodge Chance",
   "13": "Deflection Chance",
   "14": "Physical Critical Rating",
   "15": "Special Critical Rating",
   "16": "Critical Damage",
   "17": "Potency",
   "18": "Tenacity",
   "27": "Health Steal",
   "28": "Protection",
   "37": "Physical Accuracy",
   "38": "Special Accuracy",
   "39": "Physical Critical Avoidance",
   "40": "Special Critical Avoidance"
   
   //The following stats are used only for mod calculations and are not usually displayed in the stats object. They are listed here for reference only.
   "41": "Offense"
   "42": "Defense"
   "48": "Offense Percent"
   "49": "Defense Percent"
   "52": "Accuracy Percent"
   "53": "Critical Chance Percent"
   "54": "Critical Avoidance Percent"
   "55": "Health Percent"
   "56": "Protection Percent"
}
```
**Note on `language` keys:** The object/array for `options.language` does not need to be as complete as the above examples
(which cover all 60 possible stats in game code).  Some statIDs that exist in game code are not used (such as id 59 - "UnitStat_Taunt"),
and even more are not returned by this API (such as id 57 - "Speed %" - which converted to the flat "Speed" value, id 5).\
Any statIDs that are not in `options.language` will remain indexed as that integer ID in the return object.

`noSpace: true`\
Converts any stat name strings used in the `language` option into standard camelCase with no spaces.
Only affects stat names defined in that parameter.\
I.e. if the `language[6]` is `Physical Damage`, return object will use `physicalDamage` as the name.

## Object Formats ##

### "*Native*" format -- [swgoh.help's](http://api.swgoh.help) `/player` ###

Player profile object.  Contains a `.roster` property with an array of unit objects.

**Full profile:**
```js
{
  roster: [
    {
      defId: <String>,
      rarity: <Integer>,
      level: <Integer>,
      gear: <Integer>,
      equipped: [
        {
          equipmentId: <String>
        },
      ... ],
      skills: [ // skill list only required for crew members when calculating ship stats
        {
          tier: <Integer>
        },
      ... ],
      mods: [ // can be skipped if using `withoutModCalc` flag for characters only
        {
          pips: <Integer>,
          set: <Integer>,
          level: <Integer>,
          primaryStat: {
            unitStat: <Integer>,
            value: <Number>
          },
          secondaryStat: [
            {
              unitStat: <Integer>,
              value: <Number>
            },
          ... ]
        }
      ... ],
      relic: {
        currentTier: <Integer>
      }
    },
  ... ]
}
```
Used directly by `.calcPlayerStats()`, which also accepts an array of these objects (and [swgoh.help's](http://api.swgoh.help) `/player` endpoint always returns an array)

**player.roster**\
Used directly by `.calcRosterStats()`

**Unit**  *single element of* `player.roster`\
Used directly by `.calcCharStats()` and `.calcShipStats()` (for both the ship and the crew members).

# Changelog #
* Version 1.0.0
  * Initial Release

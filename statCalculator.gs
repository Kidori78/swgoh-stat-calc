/**
 * @OnlyCurrentDoc
 *
 * CREDITS: This class is a converted version of swgoh-stat-calc by Crinolo (https://github.com/Crinolo/swgoh-stat-calc)
 *
 * StatCalculator class for Google App Script (GAS)
 * Available Methods
    .setGameData(gameData) - Line 48
    .setMaxValues(options) - Line 77
    .getMaxValueUnits(options) - Line 95
    .calcCharStats(char, options) - Line 180
    .calcShipStats(ship, crew, options) - Line 370
    .calcRosterStats(roster, options) - Line 464
    .calcPlayerStats(player, options) - Line 556
    .calcCharGP(char, options) - Line 575
    .calcShipGP(ship, crew, options) - Line 615
 *
 * Functions - Specific to this class - Starts Line 668
 *
 * Options Readme - Line 997
 * Object Format Readme - Line 1166
 */
 /*******************************************************************************************  
 * @Class StatCalculator
 */
function StatCalculator() {
  /** Constructor */
  this.unitData = undefined;
  this.gearData = undefined;
  this.modSetData = undefined;
  this.crTables = undefined;
  this.gpTables = undefined;
  this.relicData = undefined;
  this.maxValues = {
      rarity: 7,
      level: 85,
      gear: 13,
      relic: 10, // In-game Relic level + 2 
      modRarity: 6,
      modLevel: 15,
      modTier: 5
  };
}
/***********************************************************************************************
 * Gets needed data files from swgoh-stat-calc api and sets them as global variables
   - File made from (https://glitch.com/edit/#!/swgoh-stat-calc?path=statCalc/dataBuilder.js)
 **********************************************************************************************/
StatCalculator.prototype.setGameData = function() {
  // Get gameData file for conversions
  const parameters = {'muteHttpExceptions': true};
  var gameData = undefined;
  // Check boosted url first
  var apiResponse = UrlFetchApp.fetch('https://swgoh-stat-calc.glitch.me/gameData.json',parameters);
  if (apiResponse.getResponseCode() === 200){
    gameData = JSON.parse(apiResponse.getContentText());
  }
  else {
    // Check backup url if first fails
    apiResponse = UrlFetchApp.fetch('https://swgoh-api-stat-calc.glitch.me/gameData.json',parameters);
    if (apiResponse.getResponseCode() === 200){
      gameData = JSON.parse(apiResponse.getContentText());
    }else{
      throw new Error(apiResponse.getResponseCode() + ' : There was a problem getting the gameData object from https://swgoh-stat-calc.glitch.me/gameData.json. If you keep getting this message you may check on its status at the SWGOH.HELP Discord.');
    }
  }
  this.unitData = gameData.unitData;
  this.gearData = gameData.gearData;
  this.modSetData = gameData.modSetData;
  this.crTables = gameData.crTables;
  this.gpTables = gameData.gpTables;
  this.relicData = gameData.relicData;
}
/***********************************************************************************************
 * Adjusts the max values in the game
 * @param (Object) newValues - Holds the values that need to be changed
 **********************************************************************************************/
StatCalculator.prototype.setMaxValues = function(newValues) {
  this.maxValues = {
      rarity: newValues.rarity || this.maxValues.rarity,
      level: newValues.level || this.maxValues.level,
      gear: newValues.gear || this.maxValues.gear,
      relic: newValues.relic || this.maxValues.relic,
      modRarity: newValues.modRarity || this.maxValues.modRarity,
      modLevel: newValues.modLevel || this.maxValues.modLevel,
      modTier: newValues.modTier || this.maxValues.modTier
  };
}
/*****************************************************************************************************
 * Get the stats for all units or a specified unit type based on maxValues. Does not include mods
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Object) units - Returns the roster for the selected unit type
 *
 * @options - char: bool, ship:bool, rosterFormat: bool, gpIncludeMods: bool, calcOptions: {}
 **********************************************************************************************/
StatCalculator.prototype.getMaxValueUnits = function(options) {
  const unitData = this.unitData;
  const maxValues = this.maxValues;
  var units = { characters: {}, ships: {} };
  var ships = [];
  var crew = {};
  var unitStats = {};
  var calcOptions = options.calcOptions || {};
  var equippedMods = [];
  var crw
  if(!options){ throw new Error("Failed: Need to select options."); }
  
  if(options.gpIncludeMods){
    for(var i=0; i < 6; i++){
      equippedMods.push({pips: maxValues.modRarity, level: maxValues.modLevel, tier: maxValues.modTier});
    }
  }
  
  Object.keys(unitData).forEach( unitID => {
    if(unitData[unitID].combatType === 2){
          unitStats = {
          defId: unitID,
          combatType: 2,
          rarity: this.maxValues.rarity,
          level: this.maxValues.level,
          skills: (unitData[unitID].skills.map( skill => { return {id: skill.id, tier: skill.maxTier}; })),
          crew: (unitData[unitID].crew.map( crew => { return {unitId: crew }; }))
      };
      units.ships[unitID] = unitStats;
      ships.push(unitID);
    } else {
      unitStats = {
          defId: unitID,
          combatType: 1,
          rarity: this.maxValues.rarity,
          level: this.maxValues.level,
          gear: this.maxValues.gear,
          relic: { currentTier: this.maxValues.relic },
          equipped: [],
          skills: (unitData[unitID].skills.map( skill => { return {id: skill.id, tier: skill.maxTier}; })),
          mods: []
      };
      units.characters[unitID] = unitStats;
      units.characters[unitID].stats = this.calcCharStats(unitStats,calcOptions);
      if(calcOptions.calcGP){
        units.characters[unitID].mods = equippedMods;
        units.characters[unitID].gp = this.calcCharGP(unitStats);
      }
      crew[unitID] = unitStats;
    }
  });
  if(options.ship){
    ships.forEach( shipID => {
      crw = units.ships[shipID].crew.map(id => crew[id.unitId] );
      units.ships[shipID].stats = this.calcShipStats(units.ships[shipID],crw, calcOptions);
      if(calcOptions.calcGP){
        crw.forEach( c => {
          c.mods = equippedMods;
        });
        units.ships[shipID].gp = this.calcShipGP(units.ships[shipID],crw);
      }
    });
  }
  
  if(options.char && options.ship){
    if(options.rosterFormat){ return {roster: Object.assign(units.ships, units.characters)}; }
    else { return units; }
  } else if (!options.ship){
    if(options.rosterFormat){ return {roster: units.characters}; }
    else { return units.characters; }
  } else if (!options.char){
    if(options.rosterFormat){ return {roster: units.ships}; }
    else { return units.ships; }
  } else {
    throw new Error("Failed to return maxValueUnits. Must select unit types in options.");
  }
}
/***********************************************************************************************
 * Returns a stats object for a single character
 * @param (Object) char - Unit data, see Line 1166 for needed object layout
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Object) stats - Stat data for the unit
 *
 * @options - withoutModCalc: bool, calcGP: bool, gameStyle: bool, useValues: {}, percentVals: bool, scaled: bool, unscaled: bool, language: {}, noSpace: bool
 **********************************************************************************************/
StatCalculator.prototype.calcCharStats = function(char, options = {}) {
  const unitData = this.unitData;
  const gearData = this.gearData;
  const crTables = this.crTables;
  const relicData = this.relicData;
  const modSetData = this.modSetData;
  
  if (options.useValues){
    char = useValuesChar(char, options.useValues, unitData);
  }
  let stats = getCharRawStats(char);
  stats = calculateBaseStats(stats, char.level, char.defId, unitData, crTables);
  if (!options.withoutModCalc) { 
    stats.mods = calculateModStats(stats.base, char);
  }
  stats = formatStats(stats, char.level, options);
  stats = renameStats(stats, options);
  
  return stats;
  
  // Private Method Function ----------------------------------------------------------------
  function getCharRawStats(char) {
    const stats = {
      base: Object.assign({}, unitData[char.defId].gearLvl[char.gear].stats ),
      growthModifiers: Object.assign({}, unitData[char.defId].growthModifiers[char.rarity] ),
      gear: {}
    };
    // calculate stats from current gear:
    char.equipped.forEach(gearPiece => {
      let gearID;
      if (!stats.gear || !gearData[ gearID = gearPiece.equipmentId ]) { return; } // Unknown gear -- no stats
      const gearStats = gearData[ gearID ].stats;
      for (var statID in gearStats) {
        if (statID == 2 || statID == 3 || statID == 4) {
          // Primary Stat, applies before mods
          stats.base[ statID ] += gearStats[ statID ];
        } else {
          // Secondary Stat, applies after mods
          stats.gear[ statID ] = (stats.gear[ statID ] || 0) + gearStats[ statID ];
        }
      }
    });
    if (char.relic && char.relic.currentTier > 2) {
      // calculate stats from relics
      let relic = relicData[ unitData[char.defId].relic[ char.relic.currentTier ] ];
      for (var statID in relic.stats) {
        stats.base[ statID ] = (stats.base[ statID ] || 0) + relic.stats[ statID ];
      }
      for (var statID in relic.gms) {
        stats.growthModifiers[ statID ] += relic.gms[ statID ];
      }
    }
    return stats;
  } 
  // Private Method Function ----------------------------------------------------------------
  function calculateModStats(baseStats, char) {
    // return empty object if no mods
    if ( !char.mods && !char.equippedStatMod ) return {};
  
    // calculate raw totals on mods
    const setBonuses = {};
    const rawModStats = {};
    if (char.mods) {
      char.mods.forEach(mod => {
        if (!mod.set) { return; } // ignore if empty mod (/units format only) 
        // add to set bonuses counters (same for both formats)
        if (setBonuses[ mod.set ]) {
          // set bonus already found, increment
          ++(setBonuses[ mod.set ].count);
          if (mod.level == 15) ++(setBonuses[mod.set].maxLevel);
        } else {
          // new set bonus, create object
          setBonuses[ mod.set ] = { count: 1, maxLevel: mod.level == 15 ? 1 : 0 };
        }
        // add Primary/Secondary stats to data
        if (mod.stat) {
          // using /units format
          mod.stat.forEach( stat => {
            rawModStats[ stat[0] ] = (rawModStats[ stat[0] ] || 0) + scaleStatValue(stat[0], stat[1]);
          });
        } else {
          // using /player.roster format
          let stat = mod.primaryStat,
              i = 0;
          do {
            rawModStats[ stat.unitStat ] = (rawModStats[ stat.unitStat ] || 0) + scaleStatValue(stat.unitStat, stat.value);
            stat = mod.secondaryStat[i];
          } while ( i++ < mod.secondaryStat.length );
        }
        // Private Method Function ----------------------------------------------------------------
        function scaleStatValue(statID, value) {
          // convert stat value from displayed value to "unscaled" value used in calculations
          switch (statID) {
            case 1:  // Health
            case 5:  // Speed
            case 28: // Protection
            case 41: // Offense
            case 42: // Defense
              // Flat stats
              return value * 1e8;
            default:
              // Percent stats
              return value * 1e6;
          }
        }
      });
    } else if (char.equippedStatMod) {
      char.equippedStatMod.forEach( mod => {
        let setBonus;
        if ( setBonus = setBonuses[ +mod.definitionId[0] ] ) {
          // set bonus already found, increment
          ++setBonus.count;
          if ( mod.level == 15 ) ++setBonus.maxLevel;
        } else {
          // new set bonus, create object
          setBonuses[ +mod.definitionId[0] ] = { count: 1, maxLevel: mod.level == 15 ? 1 : 0 };
        }
        // add Primary/Secondary stats to data
        let stat = mod.primaryStat.stat, i = 0;
        do {
          rawModStats[ stat.unitStatId ] = +stat.unscaledDecimalValue + (rawModStats[ stat.unitStatId ] || 0);
          stat = mod.secondaryStat[i] && mod.secondaryStat[i].stat;
        } while ( i++ < mod.secondaryStat.length );
      });
    } else {
      // return empty object if no mods
      return {};
    }
    // add stats given by set bonuses
    for (var setID in setBonuses) {
      const setDef = modSetData[setID];
      const {count: count, maxLevel: maxCount } = setBonuses[ setID ];
      const multiplier = ~~(count / setDef.count) + ~~(maxCount / setDef.count);
      rawModStats[ setDef.id ] = (rawModStats[ setDef.id ] || 0) + (setDef.value * multiplier);
    }
    // calcuate actual stat bonuses from mods
    const modStats = {};
    for (var statID in rawModStats) {
      const value = rawModStats[ statID ];
      switch (~~statID) {
        case 41: // Offense
          modStats[6] = (modStats[6] || 0) + value; // Ph. Damage
          modStats[7] = (modStats[7] || 0) + value; // Sp. Damage
          break;
        case 42: // Defense
          modStats[8] = (modStats[8] || 0) + value; // Armor
          modStats[9] = (modStats[9] || 0) + value; // Resistance
          break;
        case 48: // Offense %
          modStats[6] = floor( (modStats[6] || 0) + (baseStats[6] * 1e-8 * value), 8); // Ph. Damage
          modStats[7] = floor( (modStats[7] || 0) + (baseStats[7] * 1e-8 * value), 8); // Sp. Damage
          break;
        case 49: // Defense %
          modStats[8] = floor( (modStats[8] || 0) + (baseStats[8] * 1e-8 * value), 8); // Armor
          modStats[9] = floor( (modStats[9] || 0) + (baseStats[9] * 1e-8 * value), 8); // Resistance
          break;
        case 53: // Crit Chance
          modStats[21] = (modStats[21] || 0) + value; // Ph. Crit Chance
          modStats[22] = (modStats[22] || 0) + value; // Sp. Crit Chance
          break;
        case 54: // Crit Avoid
          modStats[35] = (modStats[35] || 0) + value; // Ph. Crit Avoid
          modStats[36] = (modStats[36] || 0) + value; // Ph. Crit Avoid
          break;
        case 55: // Heatlth %
          modStats[1] = floor( (modStats[1] || 0) + (baseStats[1] * 1e-8 * value), 8); // Health
          break;
        case 56: // Protection %
          modStats[28] = floor( (modStats[28] || 0) + ( (baseStats[28] || 0) * 1e-8 * value), 8); // Protection may not exist in base
          break;
        case 57: // Speed %
          modStats[5] = floor( (modStats[5] || 0) + (baseStats[5] * 1e-8 * value), 8); // Speed
          break;
        default:
          // other stats add like flat values
          modStats[ statID ] = (modStats[ statID ] || 0) + value;
      }
    }
  
    return modStats;
  }
}
/***********************************************************************************************
 * Returns a ships stats obhect for a single ship
 * @param (Object) ship - Ship data, see Line 1166 for needed object layout
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Object) stats - Stat data for the unit
 *
 * @options - withoutModCalc: bool, calcGP: bool, gameStyle: bool, useValues: {}, percentVals: bool, scaled: bool, unscaled: bool, language: {}, noSpace: bool
 **********************************************************************************************/
StatCalculator.prototype.calcShipStats = function(ship, crew, options = {}) {
  const unitData = this.unitData;
  const crTables = this.crTables;

  try {
    ({ship, crew} = useValuesShip(ship, crew, options.useValues, unitData));
    let stats = getShipRawStats(ship, crew);
    stats = calculateBaseStats(stats, ship.level, ship.defId, unitData, crTables);
    stats = formatStats(stats, ship.level, options);
    stats = renameStats(stats, options);
    
    return stats;
  } catch(e) {
    console.error(e.stack);
    throw new Error(e);
  }
  
  // Private Method Functions -----------------------------------------------------------------
  function getShipRawStats(ship, crew) {
    // ensure crew is the correct crew
    if (crew.length != unitData[ship.defId].crew.length)
      throw new Error(`Incorrect number of crew members for ship ${ship.defId}.`);
    crew.forEach( char => {
      if ( !unitData[ship.defId].crew.includes(char.defId) )
        throw new Error(`Unit ${char.defId} is not in ${ship.defId}'s crew.`);
    });
    // if still here, crew is good -- go ahead and determine stats
    const crewRating = crew.length == 0 ? getCrewlessCrewRating(ship) : getCrewRating(crew);
    const stats = {
      base: Object.assign({}, unitData[ship.defId].stats),
      crew: {},
      growthModifiers: Object.assign({}, unitData[ship.defId].growthModifiers[ship.rarity] )
    };
    let statMultiplier = crTables.shipRarityFactor[ship.rarity] * crewRating;
    Object.entries(unitData[ship.defId].crewStats).forEach( ([statID, statValue]) => {
      // stats 1-15 and 28 all have final integer values
      // other stats require decimals -- shrink to 8 digits of precision through 'unscaled' values this calculator uses
      stats.crew[ statID ] = floor( statValue * statMultiplier, (statID < 16 || statID == 28) ? 8 : 0);
    });
    
    return stats;
    // Private Method Function ----------------------------------------------------------------
    function getCrewRating(crew) {
      let totalCR = crew.reduce( (crewRating, char) => {
        crewRating += crTables.unitLevelCR[ char.level ] + crTables.crewRarityCR[ char.rarity ]; // add CR from level/rarity
        crewRating += crTables.gearLevelCR[ char.gear ]; // add CR from complete gear levels
        crewRating += (crTables.gearPieceCR[ char.gear ] * char.equipped.length || 0); // add CR from currently equipped gear
        crewRating = char.skills.reduce( (cr, skill) => cr + getSkillCrewRating(skill), crewRating); // add CR from ability levels
         // add CR from mods
        if (char.mods) crewRating = char.mods.reduce( (cr, mod) => cr + crTables.modRarityLevelCR[ mod.pips ][ mod.level ], crewRating);
        else if (char.equippedStatMod) crewRating = char.equippedStatMod.reduce( (cr, mod) => cr + crTables.modRarityLevelCR[ +mod.definitionId[1] ][ mod.level ], crewRating);
    
        // add CR from relics
        if (char.relic && char.relic.currentTier > 2) {
          crewRating += crTables.relicTierCR[ char.relic.currentTier ];
          crewRating += char.level * crTables.relicTierLevelFactor[ char.relic.currentTier ];
        }
    
        return crewRating;
      }, 0);
      
      return totalCR;
      
      // Private Method Function ----------------------------------------------------------------
      function getSkillCrewRating(skill) {
        // Crew Rating for GP purposes depends on skill type (i.e. contract/hardware/etc.), but for stats it apparently doesn't.
        return crTables.abilityLevelCR[ skill.tier ];
      }
    }
    
    // Private Method Function ----------------------------------------------------------------
    function getCrewlessCrewRating(ship) {
      // temporarily uses hard-coded multipliers, as the true in-game formula remains a mystery.
      // but these values have experimentally been found accurate for the first 3 crewless ships:
      //     (Vulture Droid, Hyena Bomber, and BTL-B Y-wing)
      return cr = floor( crTables.crewRarityCR[ ship.rarity ] + 3.5*crTables.unitLevelCR[ ship.level ] + getCrewlessSkillsCrewRating( ship.skills ) );
      
      function getCrewlessSkillsCrewRating(skills) {
        return skills.reduce( (cr, skill) => {
          cr += ((skill.id.substring(0,8) == "hardware") ? 0.696 : 2.46) * crTables.abilityLevelCR[ skill.tier ];
          return cr;
        }, 0);
      }  
    }
  }  
}
/***********************************************************************************************
 * Updates the Roster Object of player to include stats
 * @param (Object) unit - Roster data, see Line 1166 for needed object layout
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Integer) count - Returns the count of units completed for that roster
 *
 * @options - useValues: {}, withoutModCalc: bool, calcGP: bool, percentVals: bool, scaled: bool, unscaled: bool, gameStyle: bool, language: {}, noSpace: bool,  
 **********************************************************************************************/
StatCalculator.prototype.calcRosterStats = function(units, options = {}) {
  const unitData = this.unitData;
  let count = 0;
  let ships = [];
  let crew = {};
  let unitStats = {};
  let crw, shp
  
  if (Object.prototype.toString.call(units) === '[object Array]') {
    // get character stats
    units.forEach( unit => {
      //let defID = unit.defId;
      //if (!unit || !unitData[defID]) return;
      if (unit.combatType == 2) { // is ship
        ships.push( unit );
      } else { // is character
        crew[ unit.defId ] = unit; // add to crew list to find quickly for ships
        unit.stats = this.calcCharStats(unit, options);
        if (options.calcGP) unit.gp = this.calcCharGP(unit, options);
      }
    });
    // get ship stats
    ships.forEach( ship => {
      crw = ship.crew.map(c => crew[c.unitId]);
      ship.stats = this.calcShipStats(ship, crw, options);
      if (options.calcGP) {
        ship.gp = this.calcShipGP(ship, crw, options);
      }
    });
    count += units.length;
  } else if (Object.prototype.toString.call(units) === '[object Object]') { // units *should* be formated poperly
    var unt
    if(units.roster){
      var ids = Object.keys(units.roster);
    }else{
      var ids = Object.keys(units);
    }
    ids.forEach( id => {
      if(units.roster){
        unt = units.roster[id];
      }else{
        unt = units[id];
      }
      if (unt.combatType == 1) {
        unitStats = { 
                      defId: id,
                      rarity: unt.rarity,
                      level: unt.level,
                      gear: unt.gear,
                      equipped: unt.equipped.map( gearID => { return {equipmentId: gearID}; }),
                      mods: unt.mods,
                      skills: unt.skills
        }
        crew[id] = unitStats;
        unt.stats = this.calcCharStats( unitStats, options);
        if (options.calcGP) unt.gp = this.calcCharGP(unitStats, options);
        count++;
      } else {
        ships.push(id);
      }
    });
    ships.forEach( id => {
      if(units.roster){
        shp = units.roster[id];
      }else{
        shp = units[id];
      }
      crw = shp.crew.map(c => crew[c.unitId]);
      unitStats = {
                    defId: id,
                    rarity: shp.rarity,
                    level: shp.level,
                    skills: shp.skills,
                    crew: shp.crew
      }
      if (options.calcGP) {
        shp.gp = this.calcShipGP(unitStats, crw, options);
      }
      shp.stats = this.calcShipStats( unitStats, crw, options);
      count++;
    });
  }
  return count;
}
/**************************************************************************************************************************
 * Updates the Roster Object of multiple players to include stats
 * @param (Object) unit - Array of Player data including their roster, see Line 1166 for needed object layout
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Integer) count - Returns the count of rosters completed
 *
 * @options - useValues: {}, withoutModCalc: bool, calcGP: bool, percentVals: bool, scaled: bool, unscaled: bool, gameStyle: bool, language: {}, noSpace: bool,  
 **********************************************************************************************/
StatCalculator.prototype.calcPlayerStats = function(players, options) {
  if (Object.prototype.toString.call(players) === '[object Array]') { // full profile array from /player
      let count = 0;
      players.forEach( player => {
        count += this.calcRosterStats(player.roster, options);
      });
      return count;
  } else { // single player object
      return this.calcRosterStats(players.roster, options);
  }
}
/*********************************************************************************************************
 * Gets the Galatic Power of a character
 * @param (Object) unit - Character data, see Line 1166 for needed object layout
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Integer)  - Returns the GP
 *
 * @options - useValues: {}
 **********************************************************************************************/
StatCalculator.prototype.calcCharGP = function(char, options = {}) {
    const gpTables = this.gpTables;
    const unitData = this.unitData;
    
    char = useValuesChar(char, options.useValues, unitData);
    let gp = gpTables.unitLevelGP[ char.level ];
    gp += gpTables.unitRarityGP[ char.rarity ];
    gp += gpTables.gearLevelGP[ char.gear ];
    // Game tables for current gear include the possibility of differect GP per slot.
    // Currently, all values are identical across each gear level, so a simpler method is possible.
    // But that could change at any time.
    gp = char.equipped.reduce( (power, piece) => power + gpTables.gearPieceGP[ char.gear ][ piece.slot ], gp);
    gp = char.skills.reduce( (power, skill) => power + getSkillGP(char.defId, skill), gp);
    if (char.purchasedAbilityId) gp += char.purchasedAbilityId.length * gpTables.abilitySpecialGP.ultimate;
    if (char.mods) gp = char.mods.reduce( (power, mod) => power + gpTables.modRarityLevelTierGP[ mod.pips ][ mod.level ][ mod.tier ], gp);
    else if (char.equippedStatMod) gp = char.equippedStatMod.reduce( (power, mod) => power + gpTables.modRarityLevelTierGP[ +mod.definitionId[1] ][ mod.level ][ mod.tier ], gp)
    
    if (char.relic && char.relic.currentTier > 2) {
      gp += gpTables.relicTierGP[ char.relic.currentTier ];
      gp += char.level * gpTables.relicTierLevelFactor[ char.relic.currentTier ];
    }
    return floor( gp*1.5 );
    
    // Private Method Function ----------------------------------------------------------------
    function getSkillGP(id, skill) {
      let oTag = unitData[ id ].skills.find( s => s.id == skill.id ).powerOverrideTags[ skill.tier ];
      if (oTag)
        return gpTables.abilitySpecialGP[ oTag ];
      else
        return gpTables.abilityLevelGP[ skill.tier ] || 0;
    }
}
/***********************************************************************************************
 * Gets the Galatic Power of a ship
 * @param (Object) unit - Ship data, see Line 1166 for needed object layout
 * @param (Object) options - Only accepts listed options. See Line 997 for a breakdown.
 * @return (Integer) gp - Returns the GP
 *
 * @options - useValues={}
 **********************************************************************************************/
StatCalculator.prototype.calcShipGP = function(ship, crew = [], options = {}) {
  const gpTables = this.gpTables;
  const unitData = this.unitData;
  ({ship, crew} = useValuesShip(ship, crew, options.useValues, unitData));
  crew.forEach( c => c.gp = this.calcCharGP( c ) );
  // ensure crew is the correct crew
  if (crew.length != unitData[ship.defId].crew.length)
    throw new Error(`Incorrect number of crew members for ship ${ship.defId}.`);
  crew.forEach( char => {
    if ( !unitData[ship.defId].crew.includes(char.defId) )
      throw new Error(`Unit ${char.defId} is not in ${ship.defId}'s crew.`);
  });
  let gp;
  if (crew.length == 0) { // crewless calculations
    let gps = getCrewlessSkillsGP( ship.defId, ship.skills );
    gps.level = gpTables.unitLevelGP[ ship.level ];
    gp = ( gps.level*3.5 + gps.ability*5.74 + gps.reinforcement*1.61 )*gpTables.shipRarityFactor[ ship.rarity ];
    gp += gps.level + gps.ability + gps.reinforcement;
  } else { // normal ship calculations
    gp = crew.reduce( (power, c) => power + c.gp, 0);
    gp *= gpTables.shipRarityFactor[ ship.rarity ] * gpTables.crewSizeFactor[ crew.length ]; // multiply crewPower factors before adding other GP sources
    gp += gpTables.unitLevelGP[ ship.level ];
    gp = ship.skills.reduce( (power, skill) => power + getSkillGP(ship.defId, skill), gp);
  }
  return floor( gp*1.5 );
  
  // Private Method Function ----------------------------------------------------------------
  function getCrewlessSkillsGP(id, skills) {
    let a = 0,
        r = 0;
    skills.forEach( skill => {
      let oTag = unitData[ id ].skills.find( s => s.id == skill.id ).powerOverrideTags[ skill.tier ];
      if (oTag && oTag.substring(0,13) == 'reinforcement')
        r += gpTables.abilitySpecialGP[ oTag ];
      else
        a += oTag ? gpTables.abilitySpecialGP[ oTag ] : gpTables.abilityLevelGP[ skill.tier ];
    });
  
    return {ability: a, reinforcement: r};
  }
  // Private Method Function ----------------------------------------------------------------
  function getSkillGP(id, skill) {
    let oTag = unitData[ id ].skills.find( s => s.id == skill.id ).powerOverrideTags[ skill.tier ];
    if (oTag)
      return gpTables.abilitySpecialGP[ oTag ];
    else
      return gpTables.abilityLevelGP[ skill.tier ] || 0;
  }  
}
/*******************************
 * END of Class Methods
*******************************/
/*
 * Functions - (kept here to keep swgoh-stat-calc work together)
 * - useValuesChar(char, useValues, unitData)  -  Line 684
 * - useValuesShip(ship, crew, useValues, unitData)  -  Line 721
 * - calculateBaseStats(stats, level, baseID, unitData, crTables)  -  Line 793
 * - formatStats(stats) level, options)  -  Line 830
 * - renameStats(stats, options)  -  Line 963
 * - fixFloat(value, digits)  -  Line 985
 * - floor(value, digits)  -  Line 989
 */
/********************************************************************************
 * Get stats for a customized roster or complete build for a character
 * @param (object) char - The unit data, see Line 1166 for needed object format
 * @param (object) useValues - The customizations to use for the units build, see Options on Line 997
 * @param (object) unitData - Unit data from the game
 * @return (object) unit - Object with new property values
-------------------------------------------------------------------------------*/
function useValuesChar(char, useValues, unitData) {
  if (!useValues || !useValues.char) return char;
  let unit = {
    defId: char.defId,
    rarity: useValues.char.rarity || char.rarity,
    level: useValues.char.level || char.level,
    gear: useValues.char.gear || char.gear,
    equipped: char.equipped,
    mods: char.mods,
    relic: useValues.char.relic ? {currentTier: useValues.char.relic } : char.relic,
    skills: useValues.char.skills || char.skills || []
  };
  if (unit.gear == 12 && useValues.char.equipped == "all") { useValues.char.equipped = [1,2,3,4,5,6]; }
  if (useValues.char.equipped == "all") {
    unit.equipped = [];
    unitData[ unit.defId ].gearLvl[ unit.gear ].gear.forEach( gearID => {
      if (+gearID < 9990) // gear IDs 9998 or 9999 are currently used for 'unknown' gear.  Highest valid gear ID through gear level 12+5 is 173.
        unit.equipped.push( { equipmentId: gearID } );
    });
  } else if (useValues.char.equipped == "none") {
    unit.equipped = [];
  } else if (useValues.char.equipped && Object.prototype.toString.call(useValues.char.equipped) === '[object Array]') { // expecting array of gear slots
    unit.equipped = useValues.char.equipped.map( slot => {
      return {equipmentId: unitData[ unit.defId ].gearLvl[ unit.gear].gear[ +slot - 1 ]};
    });
  }

  return unit;
}
/***********************************************************************************
 * Get stats for a customized roster or complete build for a ship
 * @param (object) ship - The ship data to use
 * @param (object) crew - The crew data to use
 * @param (object) useValues - The customizations to use for the unit's build, see Line 997 for details
 * @param (object) unitData - Unit data from the game
 * @return (Object) ship, crew - Ship and Crew objects with new property values
---------------------------------------------------------------------------------*/
function useValuesShip(ship, crew, useValues, unitData) {
  if (!useValues || !useValues.ship && !useValues.crew) return {ship: ship, crew: crew};
  if (!useValues.ship) { useValues.ship = {}; }
  if (!useValues.crew) { useValues.crew = {}; }
  ship = {
    defId: ship.defId,
    rarity: useValues.ship.rarity || ship.rarity,
    level: useValues.ship.level || ship.level,
    skills: ship.skills,
    "crew": ship.crew || [] 
  }
  
  let chars = unitData[ ship.defId ].crew.map( charID => {
    let char = crew.find( cmem => { return cmem.defId == charID} ); // extract defaults from submitted crew
    char = {
      defId: charID,
      rarity: useValues.crew.rarity || char.rarity,
      level: useValues.crew.level || char.level,
      gear: useValues.crew.gear || char.gear,
      equipped: char.equipped,
      skills: char.skills,
      mods: char.mods,
      relic: useValues.crew.relic ? {currentTier: useValues.crew.relic } : char.relic    
    };
    if (char.gear == 12 && useValues.crew.equipped == "all"){ char.equipped = [1,2,3,4,5,6]; } 
    if (useValues.crew.equipped == "all") {
      char.equipped = [];
      unitData[ charID ].gearLvl[ char.gear ].gear.forEach( gearID => {
        if (+gearID < 9990) // gear IDs 9998 or 9999 are currently used for 'unknown' gear.  Highest valid gear ID through gear level 12+5 is 173.
          char.equipped.push( { equipmentId: gearID } );
      });
    } else if (useValues.crew.equipped == "none") {
      char.equipped = [];
    } else if (useValues.crew.equipped && Object.prototype.toString.call(useValues.crew.equipped) === '[object Array]') { // expecting array of gear slots
      char.equipped = useValues.char.equipped.map( slot => {
        return {equipmentId: unitData[ charID ].gearLvl[ char.gear].gear[ +slot - 1 ]};
      });
    } else if (useValues.crew.equipped) { // expecting an integer, 1-6, for number of gear slots filled (specific gear pieces don't actually matter for ships)
      char.equipped = [];
      for (let i=0; i<useValues.crew.equipped; i++)
        char.equipped.push({});
    }
    
    if (useValues.crew.skills == "max") {
      char.skills = unitData[ charID ].skills.map(skill => { return {tier: skill.maxTier}; });
    } else if (useValues.crew.skills == "maxNoZeta") {
      char.skills = unitData[ charID ].skills.map(skill => { return {tier: skill.maxTier - (skill.isZeta ? 1 : 0)}; });
    } else if (useValues.crew.skills) { // expecting an integer, 1-8, for skill level to use
      char.skills = unitData[ charID ].skills.map(skill => { return {tier: Math.min(useValues.crew.skills, skill.maxTier)}; }); // can't go higher than maxTier
    }
    
    if (useValues.crew.modRarity || useValues.crew.modLevel) {
      char.mods = [];
      for (let i=0; i<6; i++) {
        char.mods.push({ pips: useValues.crew.modRarity || 6, level: useValues.crew.modLevel || 15 });
      }
    }
    
    return char;
  });
  
  return {ship: ship, crew: chars};
}
/**************************************************************************************************************************************************
 * Get Base Stats for unit 
 * @param (object) stats - Stats object
 * @param (integer) level - Units level
 * @param (string) baseID - Units defID from game data, also known as baseID
 * @param (object) unitData - Unit data from the game
 * @param (object) crTables - Game data
 * @returns (Object) stats - { base: {StatID: StatValue, ..}, gear: {statID: statValue,..}, growthModifiers: {2: STR_GM, 3: AGI_GM, 4: TAC_GM } }
--------------------------------------------------------------------------------------*/
function calculateBaseStats(stats, level, baseID, unitData, crTables) {
  // calculate bonus Primary stats from Growth Modifiers:
  stats.base[2] += floor( stats.growthModifiers[2] * level, 8) // Strength
  stats.base[3] += floor( stats.growthModifiers[3] * level, 8) // Agility
  stats.base[4] += floor( stats.growthModifiers[4] * level, 8) // Tactics
  if (stats.base[61]) {
    // calculate effects of Mastery on Secondary stats:
    let mms = crTables[ unitData[ baseID ].masteryModifierID ];
    for (var statID in mms) {
      stats.base[ statID ] = (stats.base[ statID ] || 0) + stats.base[61]*mms[ statID ];
    }
  }
  // calculate effects of Primary stats on Secondary stats:
  stats.base[1] = (stats.base[1] || 0) + stats.base[2] * 18;                                            // Health += STR * 18
  stats.base[6] = floor( (stats.base[6] || 0) + stats.base[ unitData[ baseID ].primaryStat ] * 1.4, 8); // Ph. Damage += MainStat * 1.4
  stats.base[7] = floor( (stats.base[7] || 0) + (stats.base[4] * 2.4), 8 );                             // Sp. Damage += TAC * 2.4
  stats.base[8] = floor( (stats.base[8] || 0) + (stats.base[2] * 0.14) + (stats.base[3] * 0.07), 8);    // Armor += STR*0.14 + AGI*0.07
  stats.base[9] = floor( (stats.base[9] || 0) + (stats.base[4] * 0.1), 8);                              // Resistance += TAC * 0.1
  stats.base[14] = floor( (stats.base[14] || 0) + (stats.base[3] * 0.4), 8);                            // Ph. Crit += AGI * 0.4
  // add hard-coded minimums or potentially missing stats
  stats.base[12] = (stats.base[12] || 0) + (24 * 1e8);  // Dodge (24 -> 2%)
  stats.base[13] = (stats.base[13] || 0) + (24 * 1e8);  // Deflection (24 -> 2%)
  stats.base[15] = (stats.base[15] || 0);               // Sp. Crit
  stats.base[16] = (stats.base[16] || 0) + (150 * 1e6); // +150% Crit Damage
  stats.base[18] = (stats.base[18] || 0) + (15 * 1e6);  // +15% Tenacity

  return stats
}
/**************************************************************************************************************************************************
 * Formats stats and adjusts for any options given 
 * @param (object) stats - Stats object
 * @param (integer) level - Units current level
 * @param (object) options - Options to modify functions, see Line 997 for breakdown
 * @returns (Object) stats - Array with formatted stats
 *
 * @options - scaled:true, unscaled: true, gameStyle: true, percentVals: true
--------------------------------------------------------------------------------------*/
function formatStats(stats, level, options) {
  // value/scaling flags
  let scale = 1; // also useful in some Stat Format calculations below

  if (options.scaled) { scale = 1e-4; }
  else if (!options.unscaled) { scale = 1e-8; }

  if (stats.mods) {
    for (var statID in stats.mods) stats.mods[statID] = Math.round( stats.mods[statID] );
  }

  if (scale != 1) {
    for (var statID in stats.base) stats.base[statID] *= scale;
    for (var statID in stats.gear) stats.gear[statID] *= scale;
    for (var statID in stats.crew) stats.crew[statID] *= scale;
    for (var statID in stats.growthModifiers) stats.growthModifiers[statID] *= scale;
    if (stats.mods) {
      for (var statID in stats.mods) stats.mods[statID] *= scale;
    }
  }

  if (options.percentVals || options.gameStyle) { // 'gameStyle' flag inherently includes 'percentVals'
    let vals;
    // convert Crit
    convertPercent(14, val => convertFlatCritToPercent( val, scale * 1e8 ) ); // Ph. Crit Rating -> Chance
    convertPercent(15, val => convertFlatCritToPercent( val, scale * 1e8 ) ); // Sp. Crit Rating -> Chance
    // convert Def
    convertPercent(8, val => convertFlatDefToPercent( val, level, scale * 1e8, stats.crew ? true:false ) ); // Armor
    convertPercent(9, val => convertFlatDefToPercent( val, level, scale * 1e8, stats.crew ? true:false ) ); // Resistance
    // convert Acc
    convertPercent(37, val => convertFlatAccToPercent( val, scale * 1e8 ) ); // Physical Accuracy
    convertPercent(38, val => convertFlatAccToPercent( val, scale * 1e8 ) ); // Special Accuracy
    // convert Evasion
    convertPercent(12, val => convertFlatAccToPercent( val, scale * 1e8 ) ); // Dodge
    convertPercent(13, val => convertFlatAccToPercent( val, scale * 1e8 ) ); // Deflection
    // convert Crit Avoidance
    convertPercent(39, val => convertFlatCritAvoidToPercent( val, scale * 1e8 ) ); // Physical Crit Avoidance
    convertPercent(40, val => convertFlatCritAvoidToPercent( val, scale * 1e8 ) ); // Special Crit Avoidance

    // calls 'convertFunc' for all stat values of 'statID' in stats, and replaces those values with the % granted by that stat type
    //   i.e. mods = convertFunc(base + gear + mods) - convertFunc(base + gear)
    //     or for ships: crew = convertFunc(base + crew) - convertFunc(crew)
    function convertPercent(statID, convertFunc) {
      let flat = stats.base[statID],
          percent = convertFunc(flat);
      stats.base[statID] = percent;
      let last = percent;
      if (stats.crew) { // is Ship
        if (stats.crew[statID]) {
          stats.crew[statID] = (/*percent = */convertFunc(flat += stats.crew[statID])) - last;
        }
      } else { // is Char
        if (stats.gear && stats.gear[statID]) {
          stats.gear[statID] = (percent = convertFunc(flat += stats.gear[statID])) - last;
          last = percent;
        }
        if (stats.mods && stats.mods[statID]) stats.mods[statID] = (/*percent = */convertFunc(flat += stats.mods[statID])) - last;
      }
    }
  }

  if (options.gameStyle) {
    let gsStats = { final:{} };
    // get list of all stat IDs used in base
    const statList = Object.keys(stats.base);
    const addStats = statID => { if (!statList.includes(statID)) statList.push(statID); }
    if (stats.gear) { // is Char
      Object.keys(stats.gear).forEach(addStats); // add stats from gear to list
      if (stats.mods) Object.keys(stats.mods).forEach(addStats); // add stats from mods to list
      if (stats.mods) gsStats.mods = stats.mods; // keep mod stats untouched

      statList.forEach( statID => {
        let flatStatID = statID;
        switch (~~statID) {
            // stats with both Percent Stats get added to the ID for their flat stat (which was converted to % above)
          case 21: // Ph. Crit Chance
          case 22: // Sp. Crit Chance
            flatStatID = statID - 7; // 21-14 = 7 = 22-15 ==> subtracting 7 from statID gets the correct flat stat
            break;
          case 35: // Ph. Crit Avoid
          case 36: // Sp. Crit Avoid
            flatStatID = ~~statID + 4; // 39-35 = 4 = 40-36 ==> adding 4 to statID gets the correct flat stat
            break;
          default:
        }
        gsStats.final[flatStatID] = gsStats.final[flatStatID] || 0; // ensure stat already exists
        gsStats.final[flatStatID] += (stats.base[statID] || 0) + (stats.gear[statID] || 0) + (stats.mods && stats.mods[statID] ? stats.mods[statID] : 0);
      });

    } else { // is Ship
      Object.keys(stats.crew).forEach(addStats); // add stats from crew to list
      gsStats.crew = stats.crew; // keep crew stats untouched

      statList.forEach( statID => {
        gsStats.final[statID] = (stats.base[statID] || 0) + (stats.crew[statID] || 0);
      });
    }

    stats = gsStats;
  }

  return stats;
  
  // convert def
  function convertFlatDefToPercent(value, level = 85, scale = 1, isShip = false) {
    const val = value / scale;
    const level_effect = isShip ? 300 + level*5 : level*7.5;
    return (val/(level_effect + val)) * scale;//.toFixed(2);
  }
  // convert crit
  function convertFlatCritToPercent(value, scale = 1) {
    const val = value / scale;
    return (val/2400 + 0.1) * scale;//.toFixed(4);
  }
  // convert accuracy / evasion
  function convertFlatAccToPercent(value, scale = 1) {
    const val = value / scale;
    return (val/1200) * scale;
  }  
  // convert crit avoidance
  function convertFlatCritAvoidToPercent(value, scale = 1) {
    const val = value / scale;
    return (val/2400) * scale;
  }
}
/**********************************************************************************************
 * Rename object keys  for stats based on language option
 * @param (object) stats - stats object to adjust keys for
 * @param (object) options - Options used in this function, see Line 997 for breakdown
 * @returns  - Stats object with renamed keys
 *
 * @options - language: {object}, noSpace: (true/false)
---------------------------------------------------------------------------------*/
function renameStats(stats, options) {
  if (options.language) {
    const rnStats = {};
    Object.keys(stats).forEach( statType => {
      rnStats[ statType ] = {}
      Object.keys( stats[ statType ] ).forEach( statID => {
        let statName = options.language[ statID ] || statID; // leave as statID if no localization string is found
        if (options.noSpace) {
          statName = statName.replace(/\s/g, ''); // remove spaces
          statName = statName[0].toLowerCase() + statName.slice(1); // ensure first letter is lower case
        }
        rnStats[ statType ][ statName ] = stats[ statType ][ statID ];
      });
    });
    stats = rnStats;
  }
  return stats;
}
/*********************************************************************************************************
 ****** Helper Functions ******
---------------------------------------------------------------------------------*/
// correct round-off error inherit to floats
function fixFloat(value,digits) {
  return Number(`${Math.round(`${value}e${digits}`)}e-${digits}`) || 0;
}
// floor value to specified digit
function floor(value, digits = 0) {
  return Math.floor(value / ('1e'+digits)) * ('1e'+digits);
}


/*********************************************************************************************************
 ****** Options *******
***************************************************************************
 The options object is used to control different aspects of the calculation. See below for all valid properties for the options object.
 
 * CALCULATION CONTROL
    calcGP: true    (Only works in .calcRosterStats, .calcPlayerStats, and .getMaxValueUnits)
   * Adds the gp property to the unit object with the correct Galactic Power

   withoutModCalc: true
   * Speeds up character calculations by ignoring stats from mods
   - false: Default setting that calculate mods stats for all characters that include them
   
   useValues: {Object}
   * Used to create generate stats for a unit at specified progression in the game rather than what a players actual unit may have.
     When used with player.roster objects this will overrides the actual unit parameters with specific values. All properties are required if
     not modifying a players roster, otherwise only use the properties you want adjusted.
     useValues: {
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
     * char.equipped / crew.equipped - gear currently equipped on characters/crew:
          "all" - all possible gear at the current level.
          "none" - no gear at the current level.
          Array - List of filled slots. Slots are numbered 1-6, left to right, starting at the top by in-game UI.
          Integer - Number, 1-6, of gear pieces equipped at current level. Only valid for crew.

     * char.relic / crew.relic - Relic 'Tier' to use
          Used as the relic.currentTier property in .help's data format.
          Values of 1 and 2 are for 'locked' and 'unlocked', while values >2 are 2 more than the actual Relic Level.

     * crew.skills - skill level to use for all crew members' abilities:
          "max" - Max possible level.
          "maxNoZeta" - Leaves zeta abilities at level 7, but uses max level for all others.
          Integer - Number, 1-8, to use for all abilities, if possible. 8 or higher is identical to "max".


 * VALUE CONTROL
   percentVals: true
   * Converts internal flat values for Defense and Crit Chance into the displayed percent values in-game.
   - false: returns the flat values for the above stats
   
   scaled: true / unscaled: true
   * Matches scaling status of values used internally to the game.
   - scaled multiplies all values by 10,000. All non-modded stats should be integers at this scale
   - unscaled multiplies all values by 100,000,000. All stats, including mods, fit as integers at this scale
   - false: returns stats at the expected scale as seen in-game where non-percent stats are integers and percent stats are decimals
 
 
 * STAT OBJECT CONTROL
   gameStyle: true
   * Activates the percentVals flag above, and also changes the returned Stats Object to have the following properties:
     - final - All units will have sum values from base, gear, mods, and/or crew in the total stat value for each stat here
     - gear - Characters will have stats granted  by equipped gear here
     - mods - Characters will have stats granted by mods here
     - crew - Ships will have stats granted by crew rating here
   Default (gameStyle: false)
   * The default Stats Object has the following properties:
     - base - All units will have their calculated base values here. These are the values without mods,gear,crew in them.
     - gear - Characters will have stats granted  by equipped gear here
     - mods - Characters will have stats granted by mods here
     - crew - Ships will have stats granted by crew rating here
      
 
 * STAT NAMING CONTROL
   noSpace: true
   * Converts any stat name string used by the below langauge option into standard camelCase with no spaces.
   
   langauge: {Object}
   * Tells the calculator to rename the stats using the submitted names. Below is how an English localization will look, adjust below as needed for your language.
     language: {
                "0": "None",
                "1": "Health",
                "2": "Strength",
                "3": "Agility",
                "4": "Tactics",
                "5": "Speed",
                "6": "Physical Damage",
                "7": "Special Damage",
                "8": "Armor",
                "9": "Resistance",
                "10": "Armor Penetration",
                "11": "Resistance Penetration",
                "12": "Dodge Chance",
                "13": "Deflection Chance",
                "14": "Physical Critical Chance",
                "15": "Special Critical Chance",
                "16": "Critical Damage",
                "17": "Potency",
                "18": "Tenacity",
                "19": "Dodge",
                "20": "Deflection",
                "21": "Physical Critical Chance",
                "22": "Special Critical Chance",
                "23": "Armor",
                "24": "Resistance",
                "25": "Armor Penetration",
                "26": "Resistance Penetration",
                "27": "Health Steal",
                "28": "Protection",
                "29": "Protection Ignore",
                "30": "Health Regeneration",
                "31": "Physical Damage",
                "32": "Special Damage",
                "33": "Physical Accuracy",
                "34": "Special Accuracy",
                "35": "Physical Critical Avoidance",
                "36": "Special Critical Avoidance",
                "37": "Physical Accuracy",
                "38": "Special Accuracy",
                "39": "Physical Critical Avoidance",
                "40": "Special Critical Avoidance",
                "41": "Offense",
                "42": "Defense",
                "43": "Defense Penetration",
                "44": "Evasion",
                "45": "Critical Chance",
                "46": "Accuracy",
                "47": "Critical Avoidance",
                "48": "Offense",
                "49": "Defense",
                "50": "Defense Penetration",
                "51": "Evasion",
                "52": "Accuracy",
                "53": "Critical Chance",
                "54": "Critical Avoidance",
                "55": "Health",
                "56": "Protection",
                "57": "Speed",
                "58": "Counter Attack",
                "59": "UnitStat_Taunt",
                "61": "Mastery"
              }


  *MAX VALUE UNITS CONTROL
    char:true
    * Returns max character units with stats
    
    ship:true
    * Returns max ship units with stats
    
    rosterFormat:true
    * Returns the units in a /player roster format.
    
    gpIncludeMods:true
    * Returns galactic power including maxed mods. This does not affect stats.
    
    calcOptions: {}
    * Object to hold all of the standard options specified above to alter the stat calculations.
  

/*************************************************************************
 * Object Format
 *************************************************************************
 * Character Object for calcCharStats
   { 
     defId: <string>,     //base id
     nameKey: <string>,   //unit name
     rarity: <integer>,   //unit stars
     level: <integer>,    //unit level
     gear: <integer>,     //unit gear level
     relic: { currentTier: <integer> }    // unit reliv level == 1=locked, 2=unlocked, 3=Level 1, 4=Level 2, etc.
     combatType: <integer>,  // 1 for character, 2 for ship
     equipped: [ {equipmentId: <gear id>} ] // Holds up to 6 pieces 1,3,5 left side of character gear; 2,4,6 right side on character gear
     skills: [ { tier: <integer> , isZeta: <boolean>} ], 
     mods: [ { 
               pips: <integer>, 
               set: <integer>,
               level: <integer>,
               primaryStat: {
                             unitStat: <integer>,
                             value: <number>
                             },
               secondaryStat: [
                               {
                                unitStat: <integer>,
                                value: <number>
                             },
                             ...]
            },
          ..]
   }
 
 * Ship and Crew Object for .calcShipStats
   - Ship
     {
       rarity: <integer>,
       level: <integer>
     }
   - Crew
     [ {character Object}, ..]
 
 * Roster Object for .calcRosterStats
   [ {character Object}, {character Object}, {character Object} ]
 
 * Player.Roster for .calcPlayerStats
   [ { roster: [ {character Object}, {character Object} ] }, {roster: [ {character Object} ] } ]
   
 */
 

import json,sys
sys.argv=[sys.argv[0]]
exec(open('dbcq.py').read().split("for n in sys.argv[1:]")[0])
M={"warrior":{"battle":"Battle Stance","defensive":"Defensive Stance","berserker":"Berserker Stance","charge":"Charge","intercept":"Intercept","mortal":"Mortal Strike","bloodthirst":"Bloodthirst","shieldslam":"Shield Slam","heroic":"Heroic Strike","overpower":"Overpower","execute":"Execute","rend":"Rend","hamstring":"Hamstring","pummel":"Pummel","shieldbash":"Shield Bash","disarm":"Disarm","shout":"Intimidating Shout","zerkrage":"Berserker Rage","reckless":"Recklessness","shieldwall":"Shield Wall","bloodrage":"Bloodrage"},
"mage":{"frostbolt":"Frostbolt","fireball":"Fireball","fireblast":"Fire Blast","scorch":"Scorch","missiles":"Arcane Missiles","cone":"Cone of Cold","nova":"Frost Nova","poly":"Polymorph","counter":"Counterspell","blink":"Blink","explosion":"Arcane Explosion","flamestrike":"Flamestrike","blizzard":"Blizzard","manashield":"Mana Shield","frostarmor":"Frost Armor","evocation":"Evocation","fireward":"Fire Ward","frostward":"Frost Ward","pom":"Presence of Mind","apower":"Arcane Power","pyroblast":"Pyroblast","blastwave":"Blast Wave","combust":"Combustion","coldsnap":"Cold Snap","iceblock":"Ice Block","barrier":"Ice Barrier"},
"rogue":{"stealth":"Stealth","sap":"Sap","cheapshot":"Cheap Shot","garrote":"Garrote","ambush":"Ambush","sinister":"Sinister Strike","backstab":"Backstab","eviscerate":"Eviscerate","slice":"Slice and Dice","rupture":"Rupture","kidney":"Kidney Shot","gouge":"Gouge","kick":"Kick","blind":"Blind","vanish":"Vanish","evasion":"Evasion","sprint":"Sprint","coldblood":"Cold Blood","adrenaline":"Adrenaline Rush","prep":"Preparation","riposte":"Riposte","bladeflurry":"Blade Flurry","ghostly":"Ghostly Strike","hemo":"Hemorrhage","premed":"Premeditation","expose":"Expose Armor"},
"paladin":{"sealR":"Seal of Righteousness","sealJ":"Seal of Justice","judgement":"Judgement","hammer":"Hammer of Justice","flashlight":"Flash of Light","holylight":"Holy Light","bubble":"Divine Shield","freedom":"Blessing of Freedom","bop":"Blessing of Protection","cleanse":"Cleanse","loh":"Lay on Hands","consecration":"Consecration","holyshock":"Holy Shock","holyshield":"Holy Shield","repentance":"Repentance","sealCr":"Seal of the Crusader","sealC":"Seal of Command","wrath":"Hammer of Wrath","dfavor":"Divine Favor","sealL":"Seal of Light","sealW":"Seal of Wisdom","dprot":"Divine Protection","bom":"Blessing of Might","bow":"Blessing of Wisdom","kings":"Blessing of Kings","sanctbless":"Blessing of Sanctuary","sacrifice":"Blessing of Sacrifice"},
"priest":{"swp":"Shadow Word: Pain","mindblast":"Mind Blast","flay":"Mind Flay","manaburn":"Mana Burn","smite":"Smite","holyfire":"Holy Fire","pws":"Power Word: Shield","flash":"Flash Heal","gheal":"Greater Heal","renew":"Renew","scream":"Psychic Scream","dispel":"Dispel Magic","innerfire":"Inner Fire","pi":"Power Infusion","desperate":"Desperate Prayer","silence":"Silence","shadowform":"Shadowform"}}
out={};miss=[]
for c,m in M.items():
  out[c]={}
  for k,n in m.items():
    if n not in by: miss.append(n);continue
    i=info(n);d=i['dur'];o={}
    if i['cd']:o['cd']=i['cd']
    if 0<d<3600:o['dur']=d
    if i['range']:o['range']=i['range']
    if i['cast']:o['cast']=i['cast']
    out[c][k]=o
json.dump(out,open('orig.json','w'),ensure_ascii=False);print('missing',miss)

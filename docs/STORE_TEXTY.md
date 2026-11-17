# Texty pro Steam obchod

Vygenerováno skriptem `node tools/store-text.js` z `src/data/sectors.json`. Texty jsou ve formátu, který
Steam umí (značky `[h2]`, `[list]`, `[*]`). Na Steamu vyplň angličtinu jako hlavní jazyk a češtinu
jako překlad (Store page > Description > jazyk).

Obrázky ke každé stránce jsou ve složce `store-assets/` (`base/` = základní hra, `dlc01/`...`dlc20/`).

---

## Základní hra - Qubit Crew

**Krátký popis (EN)**

```
A co-op quantum heist for 1-6 lab cats. Shine your flashlight to collapse qubits out of superposition, keep the Lurkers in the light and feed the dying quantum core before it decoheres.
```

**Krátký popis (CS)**

```
Kooperativní kvantová loupež pro 1-6 laboratorních koček. Baterkou kolabuj qubity ze superpozice, drž číhače ve světle a krm umírající kvantové jádro, než dekoheruje.
```

**Dlouhý popis (EN)**

```
[h2]Your flashlight is a measuring device.[/h2]
The lab's quantum computer is falling apart and only its crew of very brave cats can keep it running. Qubits float around the facility in superposition - flickering in two or three places at once. Point your light at one and the wavefunction collapses: the qubit becomes real in ONE of those spots. Maybe right in front of you. Maybe on the other side of the wall.

[h2]Don't stop looking.[/h2]
Lurkers only move while nobody is watching them. Keep them in your beam and they freeze; hold it long enough and they are banished. Decoherence clouds drift through walls and drain the core. Mites tunnel after anyone carrying a qubit. Quantum-tunnel through walls to escape, ping spots for your crew and get everything back to the core before coherence hits zero.

[h2]Features[/h2]
[list]
[*] Online co-op for 1-6 players through Steam (invite friends from your friends list) and LAN play by IP
[*] Procedurally generated facilities - every shift is a new map
[*] Quantum mechanics as game mechanics: superposition, measurement, entangled qubit pairs, tunnelling
[*] Team upgrades between shifts, escalating shifts and quotas
[*] Customise your cat: suit colour, fur and hats
[*] Chunky retro 3D look with dithering, vertex wobble and a CRT glow
[*] English and Czech
[/list]
```

**Dlouhý popis (CS)**

```
[h2]Tvoje baterka je měřicí přístroj.[/h2]
Kvantový počítač v laboratoři se rozpadá a v chodu ho udrží jen jeho posádka velmi statečných koček. Qubity se po komplexu vznášejí v superpozici - blikají na dvou nebo třech místech zároveň. Posviť na jeden a vlnová funkce zkolabuje: qubit se zhmotní na JEDNOM z těch míst. Možná přímo před tebou. Možná na druhé straně zdi.

[h2]Nepřestávej se dívat.[/h2]
Číhači se hýbou jen tehdy, když se na ně nikdo nedívá. Drž je v paprsku a zmrznou; vydrž dost dlouho a zmizí. Mraky dekoherence proplouvají zdmi a vysávají jádro. Roztoči se tunelují za každým, kdo nese qubit. Unikej kvantovým tunelováním skrz zdi, označuj místa pro posádku a dones všechno do jádra dřív, než koherence klesne na nulu.

[h2]Vlastnosti[/h2]
[list]
[*] Online kooperace pro 1-6 hráčů přes Steam (pozvi kamarády ze seznamu přátel) a LAN hra přes IP
[*] Procedurálně generované komplexy - každá směna je nová mapa
[*] Kvantová mechanika jako herní mechanika: superpozice, měření, provázané páry qubitů, tunelování
[*] Týmová vylepšení mezi směnami, stoupající obtížnost a kvóty
[*] Přizpůsob si kočku: barvu kombinézy, srst a čepice
[*] Hranatá retro 3D grafika s ditheringem, chvěním vrcholů a CRT září
[*] Angličtina a čeština
[/list]
```

**Doporučené tagy:** Co-op, Online Co-Op, Multiplayer, Retro, Low-poly, Cute, Cats, Sci-fi, Physics, Horror (lehký), Procedural Generation, Indie

**Funkce (Steamworks > Store page > Basic Info):** Single-player, Online Co-op, LAN Co-op, Steam Achievements, In-App Purchases (ne), Remote Play Together (lze zapnout)

**Systémové požadavky (Windows):** Windows 10 64-bit, 2 GHz dvoujádrový procesor, 4 GB RAM, grafika s podporou WebGL 2 (Intel HD 520 / GeForce GT 730 nebo lepší), 400 MB místa

---

## DLC 01 - Deep Freeze / Hluboký mráz

**Název produktu:** `Qubit Crew - Deep Freeze`  
**Klíč v hře / steam_config.json:** `dlc01`  
**Obrázky:** `store-assets/dlc01/`

**Krátký popis (EN)**

```
Superconducting floors. Zero resistance. Zero grip. A new sector for Qubit Crew with its own quantum rule, plus the "Ushanka" hat.
```

**Krátký popis (CS)**

```
Supravodivé podlahy. Nulový odpor. Nulová přilnavost. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Ušanka“.
```

**O tomto obsahu (EN)**

```
[h2]Deep Freeze[/h2]
The cooling loop burst and the whole sector turned into a superconductor. Nothing slows you down any more, including the walls you slide into. Master drifting around corners while anomalies glide after you.

[h2]What you get[/h2]
[list]
[*] The Deep Freeze sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Superconducting floors. Zero resistance. Zero grip.
[*] The "Ushanka" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Hluboký mráz[/h2]
Chladicí okruh praskl a celý sektor se proměnil v supravodič. Nic vás už nebrzdí – ani stěny, do kterých kloužete. Naučte se driftovat kolem rohů, zatímco anomálie kloužou za vámi.

[h2]Co získáš[/h2]
[list]
[*] Sektor Hluboký mráz, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Supravodivé podlahy. Nulový odpor. Nulová přilnavost.
[*] Čepici „Ušanka“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 02 - Laser Grid / Laserová mříž

**Název produktu:** `Qubit Crew - Laser Grid`  
**Klíč v hře / steam_config.json:** `dlc02`  
**Obrázky:** `store-assets/dlc02/`

**Krátký popis (EN)**

```
Photon beams sweep the rooms. Jump or get measured. A new sector for Qubit Crew with its own quantum rule, plus the "Prism Crown" hat.
```

**Krátký popis (CS)**

```
Fotonové paprsky pročesávají místnosti. Skoč, nebo budeš změřen. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Hranolová koruna“.
```

**O tomto obsahu (EN)**

```
[h2]Laser Grid[/h2]
The photonics team left the calibration lasers running. Beams sweep back and forth across the labs, and touching one costs the whole crew coherence. Time your jumps and carry the qubits home.

[h2]What you get[/h2]
[list]
[*] The Laser Grid sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Photon beams sweep the rooms. Jump or get measured.
[*] The "Prism Crown" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Laserová mříž[/h2]
Fotonický tým nechal běžet kalibrační lasery. Paprsky jezdí laboratořemi tam a zpět a každý dotyk stojí celou posádku koherenci. Načasujte skoky a doneste qubity domů.

[h2]Co získáš[/h2]
[list]
[*] Sektor Laserová mříž, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Fotonové paprsky pročesávají místnosti. Skoč, nebo budeš změřen.
[*] Čepici „Hranolová koruna“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 03 - Ion Storm / Iontová bouře

**Název produktu:** `Qubit Crew - Ion Storm`  
**Klíč v hře / steam_config.json:** `dlc03`  
**Obrázky:** `store-assets/dlc03/`

**Krátký popis (EN)**

```
A rotating trap field shoves the whole crew around. A new sector for Qubit Crew with its own quantum rule, plus the "Electrode Halo" hat.
```

**Krátký popis (CS)**

```
Rotující pole pasti postrkuje celou posádku. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Elektrodová svatozář“.
```

**O tomto obsahu (EN)**

```
[h2]Ion Storm[/h2]
The ion trap electrodes are firing on their own. Every few seconds a rotating field grabs everyone and pushes them across the floor. Brace against a wall or ride the pulse to move faster than you ever could on foot.

[h2]What you get[/h2]
[list]
[*] The Ion Storm sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: A rotating trap field shoves the whole crew around.
[*] The "Electrode Halo" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Iontová bouře[/h2]
Elektrody iontové pasti střílejí samy od sebe. Každých pár sekund rotující pole všechny popadne a tlačí je po podlaze. Zapřete se o zeď, nebo se s pulzem svezte rychleji, než byste kdy doběhli.

[h2]Co získáš[/h2]
[list]
[*] Sektor Iontová bouře, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Rotující pole pasti postrkuje celou posádku.
[*] Čepici „Elektrodová svatozář“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 04 - Entanglement Station / Stanice provázání

**Název produktu:** `Qubit Crew - Entanglement Station`  
**Klíč v hře / steam_config.json:** `dlc04`  
**Obrázky:** `store-assets/dlc04/`

**Krátký popis (EN)**

```
Quantum teleportation, whether you asked for it or not. A new sector for Qubit Crew with its own quantum rule, plus the "Twin Antennas" hat.
```

**Krátký popis (CS)**

```
Kvantová teleportace, ať už o ni stojíte, nebo ne. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Dvojité antény“.
```

**O tomto obsahu (EN)**

```
[h2]Entanglement Station[/h2]
In this sector the crew is entangled. Every so often two crew members instantly swap places. Play solo and you get entangled with an anomaly instead. Keep talking, because your position is no longer only yours.

[h2]What you get[/h2]
[list]
[*] The Entanglement Station sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Quantum teleportation, whether you asked for it or not.
[*] The "Twin Antennas" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Stanice provázání[/h2]
V tomto sektoru je posádka provázaná. Čas od času si dva členové okamžitě prohodí místa. Hrajete sami? Pak se provážete s anomálií. Komunikujte – vaše poloha už není jen vaše.

[h2]Co získáš[/h2]
[list]
[*] Sektor Stanice provázání, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Kvantová teleportace, ať už o ni stojíte, nebo ne.
[*] Čepici „Dvojité antény“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 05 - Many-Worlds Wing / Křídlo mnoha světů

**Název produktu:** `Qubit Crew - Many-Worlds Wing`  
**Klíč v hře / steam_config.json:** `dlc05`  
**Obrázky:** `store-assets/dlc05/`

**Krátký popis (EN)**

```
Two realities share one corridor. They take turns. A new sector for Qubit Crew with its own quantum rule, plus the "Split Mask" hat.
```

**Krátký popis (CS)**

```
Dvě reality sdílejí jednu chodbu. Střídají se. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Rozpůlená maska“.
```

**O tomto obsahu (EN)**

```
[h2]Many-Worlds Wing[/h2]
Two branches of the universe overlap here. Walls that exist in one world vanish in the other, and the worlds swap every few seconds. Plan your route around the flip or tunnel straight through a wall that should not be there.

[h2]What you get[/h2]
[list]
[*] The Many-Worlds Wing sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Two realities share one corridor. They take turns.
[*] The "Split Mask" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Křídlo mnoha světů[/h2]
Překrývají se tu dvě větve vesmíru. Stěny, které existují v jednom světě, v druhém mizí, a světy se každých pár sekund prohodí. Naplánujte cestu podle přepnutí, nebo se protunelujte zdí, která tam nemá být.

[h2]Co získáš[/h2]
[list]
[*] Sektor Křídlo mnoha světů, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Dvě reality sdílejí jednu chodbu. Střídají se.
[*] Čepici „Rozpůlená maska“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 06 - Tunnel Junction / Tunelový přechod

**Název produktu:** `Qubit Crew - Tunnel Junction`  
**Klíč v hře / steam_config.json:** `dlc06`  
**Obrázky:** `store-assets/dlc06/`

**Krátký popis (EN)**

```
There are no doors. There never were. A new sector for Qubit Crew with its own quantum rule, plus the "Drill Helmet" hat.
```

**Krátký popis (CS)**

```
Nejsou tu dveře. Nikdy tu nebyly. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Vrtací helma“.
```

**O tomto obsahu (EN)**

```
[h2]Tunnel Junction[/h2]
Every room in this sector is sealed behind an energy barrier. The only way in or out is quantum tunnelling, so your tunnel recharges much faster here. The anomalies, unfortunately, were always able to walk through.

[h2]What you get[/h2]
[list]
[*] The Tunnel Junction sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: There are no doors. There never were.
[*] The "Drill Helmet" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Tunelový přechod[/h2]
Každá místnost tohoto sektoru je uzavřená energetickou bariérou. Dovnitř i ven se dá jen kvantovým tunelováním, proto se vám tu tunel dobíjí mnohem rychleji. Anomálie bohužel bariérami procházely odjakživa.

[h2]Co získáš[/h2]
[list]
[*] Sektor Tunelový přechod, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Nejsou tu dveře. Nikdy tu nebyly.
[*] Čepici „Vrtací helma“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 07 - Zero-Point Chamber / Komora nulového bodu

**Název produktu:** `Qubit Crew - Zero-Point Chamber`  
**Klíč v hře / steam_config.json:** `dlc07`  
**Obrázky:** `store-assets/dlc07/`

**Krátký popis (EN)**

```
Low gravity and particles that pop out of nothing. A new sector for Qubit Crew with its own quantum rule, plus the "Bubble Helmet" hat.
```

**Krátký popis (CS)**

```
Nízká gravitace a částice, které vyskakují z ničeho. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Bublinová helma“.
```

**O tomto obsahu (EN)**

```
[h2]Zero-Point Chamber[/h2]
The vacuum here is not empty. Gravity is a suggestion, jumps carry you across whole rooms, and virtual particles blink into existence for a few seconds. Grab them before they annihilate to restore coherence.

[h2]What you get[/h2]
[list]
[*] The Zero-Point Chamber sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Low gravity and particles that pop out of nothing.
[*] The "Bubble Helmet" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Komora nulového bodu[/h2]
Vakuum tu není prázdné. Gravitace je jen doporučení, skoky vás přenesou přes celé místnosti a virtuální částice se na pár sekund zjevují z ničeho. Chyťte je, než anihilují, a obnovte koherenci.

[h2]Co získáš[/h2]
[list]
[*] Sektor Komora nulového bodu, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Nízká gravitace a částice, které vyskakují z ničeho.
[*] Čepici „Bublinová helma“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 08 - Uncertainty Ward / Oddělení neurčitosti

**Název produktu:** `Qubit Crew - Uncertainty Ward`  
**Klíč v hře / steam_config.json:** `dlc08`  
**Obrázky:** `store-assets/dlc08/`

**Krátký popis (EN)**

```
You can know where they are, or where they are going. A new sector for Qubit Crew with its own quantum rule, plus the "Question Mark" hat.
```

**Krátký popis (CS)**

```
Můžete vědět, kde jsou, nebo kam jdou. Ne obojí. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Otazník“.
```

**O tomto obsahu (EN)**

```
[h2]Uncertainty Ward[/h2]
Heisenberg would love this place. Unobserved anomalies no longer walk, they blink from spot to spot, and your scanner map shakes with doubt. Keep your light steady, because certainty is the only thing that holds them still.

[h2]What you get[/h2]
[list]
[*] The Uncertainty Ward sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: You can know where they are, or where they are going.
[*] The "Question Mark" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Oddělení neurčitosti[/h2]
Heisenberg by to tu miloval. Nepozorované anomálie už nechodí, ale přeskakují z místa na místo, a mapa vašeho skeneru se chvěje pochybnostmi. Držte světlo pevně – jen jistota je udrží na místě.

[h2]Co získáš[/h2]
[list]
[*] Sektor Oddělení neurčitosti, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Můžete vědět, kde jsou, nebo kam jdou. Ne obojí.
[*] Čepici „Otazník“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 09 - Annealer Furnace / Žíhací pec

**Název produktu:** `Qubit Crew - Annealer Furnace`  
**Klíč v hře / steam_config.json:** `dlc09`  
**Obrázky:** `store-assets/dlc09/`

**Krátký popis (EN)**

```
The floor is an energy landscape. Stay in the valleys. A new sector for Qubit Crew with its own quantum rule, plus the "Flame Crest" hat.
```

**Krátký popis (CS)**

```
Podlaha je energetická krajina. Držte se v údolích. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Plamenný hřeben“.
```

**O tomto obsahu (EN)**

```
[h2]Annealer Furnace[/h2]
A quantum annealer is searching for the lowest energy state, and it is using the floor to do it. Waves of heat roll across the tiles and standing in them burns coherence. Hop between the cool spots and keep moving.

[h2]What you get[/h2]
[list]
[*] The Annealer Furnace sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: The floor is an energy landscape. Stay in the valleys.
[*] The "Flame Crest" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Žíhací pec[/h2]
Kvantový žíhač hledá stav s nejnižší energií a používá k tomu podlahu. Po dlaždicích se valí vlny žáru a stát v nich pálí koherenci. Skákejte mezi chladnými místy a nezastavujte se.

[h2]Co získáš[/h2]
[list]
[*] Sektor Žíhací pec, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Podlaha je energetická krajina. Držte se v údolích.
[*] Čepici „Plamenný hřeben“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 10 - Qubit Foundry / Qubitová slévárna

**Název produktu:** `Qubit Crew - Qubit Foundry`  
**Klíč v hře / steam_config.json:** `dlc10`  
**Obrázky:** `store-assets/dlc10/`

**Krátký popis (EN)**

```
Every corridor is a conveyor belt. Some go your way. A new sector for Qubit Crew with its own quantum rule, plus the "Cleanroom Hood" hat.
```

**Krátký popis (CS)**

```
Každá chodba je dopravník. Některé jedou vaším směrem. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Kukla do čistých prostor“.
```

**O tomto obsahu (EN)**

```
[h2]Qubit Foundry[/h2]
Welcome to the fab, where the corridors never stop moving. Belts carry you fast in one direction and fight you in the other. Learn the flow of the factory and you will outrun anything.

[h2]What you get[/h2]
[list]
[*] The Qubit Foundry sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Every corridor is a conveyor belt. Some go your way.
[*] The "Cleanroom Hood" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Qubitová slévárna[/h2]
Vítejte ve výrobě, kde se chodby nikdy nezastaví. Pásy vás jedním směrem vezou rychle a druhým s vámi bojují. Naučte se tok továrny a utečete čemukoli.

[h2]Co získáš[/h2]
[list]
[*] Sektor Qubitová slévárna, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Každá chodba je dopravník. Některé jedou vaším směrem.
[*] Čepici „Kukla do čistých prostor“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 11 - Schrödinger's Menagerie / Schrödingerův zvěřinec

**Název produktu:** `Qubit Crew - Schrödinger's Menagerie`  
**Klíč v hře / steam_config.json:** `dlc11`  
**Obrázky:** `store-assets/dlc11/`

**Krátký popis (EN)**

```
Sealed boxes. Fifty-fifty. Do you feel lucky? A new sector for Qubit Crew with its own quantum rule, plus the "Cardboard Box" hat.
```

**Krátký popis (CS)**

```
Zavřené krabice. Padesát na padesát. Cítíte se šťastně? Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Krabice“.
```

**O tomto obsahu (EN)**

```
[h2]Schrödinger's Menagerie[/h2]
The original experiment got out of hand. Sealed boxes are scattered around the labs and nobody knows what is inside until someone opens one. Half hold a free qubit. The other half hold something that was waiting for you.

[h2]What you get[/h2]
[list]
[*] The Schrödinger's Menagerie sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Sealed boxes. Fifty-fifty. Do you feel lucky?
[*] The "Cardboard Box" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Schrödingerův zvěřinec[/h2]
Původní experiment se trochu vymkl. Po laboratořích jsou rozeseté zavřené krabice a nikdo neví, co je uvnitř, dokud je někdo neotevře. V polovině je qubit zdarma. V druhé polovině něco, co na vás čekalo.

[h2]Co získáš[/h2]
[list]
[*] Sektor Schrödingerův zvěřinec, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Zavřené krabice. Padesát na padesát. Cítíte se šťastně?
[*] Čepici „Krabice“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 12 - Condensate Pool / Kondenzátová lázeň

**Název produktu:** `Qubit Crew - Condensate Pool`  
**Klíč v hře / steam_config.json:** `dlc12`  
**Obrázky:** `store-assets/dlc12/`

**Krátký popis (EN)**

```
Step into the condensate and time turns to syrup. A new sector for Qubit Crew with its own quantum rule, plus the "Droplet" hat.
```

**Krátký popis (CS)**

```
Vstupte do kondenzátu a čas zhoustne jako sirup. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Kapka“.
```

**O tomto obsahu (EN)**

```
[h2]Condensate Pool[/h2]
Bose-Einstein condensate has leaked into the rooms. Inside the glowing fields everything slows down, you a little and the anomalies a lot. Lure them in, walk out, and enjoy the head start.

[h2]What you get[/h2]
[list]
[*] The Condensate Pool sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Step into the condensate and time turns to syrup.
[*] The "Droplet" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Kondenzátová lázeň[/h2]
Do místností unikl Boseho-Einsteinův kondenzát. Uvnitř zářících polí se všechno zpomalí – vy trochu, anomálie hodně. Nalákejte je dovnitř, vyjděte ven a užijte si náskok.

[h2]Co získáš[/h2]
[list]
[*] Sektor Kondenzátová lázeň, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Vstupte do kondenzátu a čas zhoustne jako sirup.
[*] Čepici „Kapka“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 13 - Topological Maze / Topologické bludiště

**Název produktu:** `Qubit Crew - Topological Maze`  
**Klíč v hře / steam_config.json:** `dlc13`  
**Obrázky:** `store-assets/dlc13/`

**Krátký popis (EN)**

```
Walk off the east edge and arrive from the west. A new sector for Qubit Crew with its own quantum rule, plus the "Möbius Halo" hat.
```

**Krátký popis (CS)**

```
Odejděte východním okrajem a přijdete ze západu. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Möbiova svatozář“.
```

**O tomto obsahu (EN)**

```
[h2]Topological Maze[/h2]
This sector is shaped like a doughnut. Portals on the edges of the map connect to the opposite side, which makes for brilliant shortcuts and very confusing chases. The anomalies know the topology too.

[h2]What you get[/h2]
[list]
[*] The Topological Maze sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Walk off the east edge and arrive from the west.
[*] The "Möbius Halo" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Topologické bludiště[/h2]
Tento sektor má tvar koblihy. Portály na okrajích mapy vedou na protější stranu, což znamená skvělé zkratky a velmi matoucí honičky. Anomálie tu topologii znají taky.

[h2]Co získáš[/h2]
[list]
[*] Sektor Topologické bludiště, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Odejděte východním okrajem a přijdete ze západu.
[*] Čepici „Möbiova svatozář“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 14 - Error Correction Center / Centrum opravy chyb

**Název produktu:** `Qubit Crew - Error Correction Center`  
**Klíč v hře / steam_config.json:** `dlc14`  
**Obrázky:** `store-assets/dlc14/`

**Krátký popis (EN)**

```
BIT FLIP! Left is right. PHASE FLIP! Good luck. A new sector for Qubit Crew with its own quantum rule, plus the "Parity Cap" hat.
```

**Krátký popis (CS)**

```
BIT FLIP! Vlevo je vpravo. PHASE FLIP! Hodně štěstí. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Paritní čepice“.
```

**O tomto obsahu (EN)**

```
[h2]Error Correction Center[/h2]
The error correction is broken, so the errors happen to you. A bit flip reverses your movement controls. A phase flip inverts the colours of the world and your mouse. A warning sounds first. It does not help much.

[h2]What you get[/h2]
[list]
[*] The Error Correction Center sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: BIT FLIP! Left is right. PHASE FLIP! Good luck.
[*] The "Parity Cap" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Centrum opravy chyb[/h2]
Oprava chyb je rozbitá, takže se chyby dějí vám. Bit flip obrátí ovládání pohybu. Phase flip invertuje barvy světa i vaši myš. Předem zazní varování. Moc nepomůže.

[h2]Co získáš[/h2]
[list]
[*] Sektor Centrum opravy chyb, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: BIT FLIP! Vlevo je vpravo. PHASE FLIP! Hodně štěstí.
[*] Čepici „Paritní čepice“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 15 - Dark Fiber / Temné vlákno

**Název produktu:** `Qubit Crew - Dark Fiber`  
**Klíč v hře / steam_config.json:** `dlc15`  
**Obrázky:** `store-assets/dlc15/`

**Krátký popis (EN)**

```
No lamps. Only your beam and a thread of light home. A new sector for Qubit Crew with its own quantum rule, plus the "Fiber Mohawk" hat.
```

**Krátký popis (CS)**

```
Žádné lampy. Jen váš paprsek a nitka světla domů. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Optické číro“.
```

**O tomto obsahu (EN)**

```
[h2]Dark Fiber[/h2]
The power is out across the quantum network. There is no light at all except your own, and thieves are invisible until your beam finds them. Glowing fibre on the floor always leads back to the core.

[h2]What you get[/h2]
[list]
[*] The Dark Fiber sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: No lamps. Only your beam and a thread of light home.
[*] The "Fiber Mohawk" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Temné vlákno[/h2]
V celé kvantové síti vypadl proud. Jediné světlo je to vaše a zloději jsou neviditelní, dokud je nenajde váš paprsek. Svítící vlákno na podlaze vždy vede zpět k jádru.

[h2]Co získáš[/h2]
[list]
[*] Sektor Temné vlákno, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Žádné lampy. Jen váš paprsek a nitka světla domů.
[*] Čepici „Optické číro“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 16 - Time Crystal Vault / Trezor časového krystalu

**Název produktu:** `Qubit Crew - Time Crystal Vault`  
**Klíč v hře / steam_config.json:** `dlc16`  
**Obrázky:** `store-assets/dlc16/`

**Krátký popis (EN)**

```
Your echo from six seconds ago still has a flashlight. A new sector for Qubit Crew with its own quantum rule, plus the "Hourglass" hat.
```

**Krátký popis (CS)**

```
Vaše ozvěna z doby před šesti sekundami má stále baterku. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Přesýpací hodiny“.
```

**O tomto obsahu (EN)**

```
[h2]Time Crystal Vault[/h2]
A time crystal repeats the recent past. A ghostly echo follows each crew member, replaying what they did six seconds ago, and the light of an echo still freezes anomalies. Aim your beam now to protect yourself later.

[h2]What you get[/h2]
[list]
[*] The Time Crystal Vault sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Your echo from six seconds ago still has a flashlight.
[*] The "Hourglass" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Trezor časového krystalu[/h2]
Časový krystal opakuje nedávnou minulost. Každého člena posádky následuje přízračná ozvěna, která přehrává, co dělal před šesti sekundami – a světlo ozvěny stále mrazí anomálie. Miřte teď, ochráníte se později.

[h2]Co získáš[/h2]
[list]
[*] Sektor Trezor časového krystalu, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Vaše ozvěna z doby před šesti sekundami má stále baterku.
[*] Čepici „Přesýpací hodiny“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 17 - Quantum Dot Disco / Disko kvantových teček

**Název produktu:** `Qubit Crew - Quantum Dot Disco`  
**Klíč v hře / steam_config.json:** `dlc17`  
**Obrázky:** `store-assets/dlc17/`

**Krátký popis (EN)**

```
The lights follow the beat. So do the blackouts. A new sector for Qubit Crew with its own quantum rule, plus the "Disco Ball" hat.
```

**Krátký popis (CS)**

```
Světla jedou do rytmu. Výpadky taky. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Disko koule“.
```

**O tomto obsahu (EN)**

```
[h2]Quantum Dot Disco[/h2]
Somebody wired the quantum dot display to the sound system. The lab pulses with colour, and on every drop all the lights, flashlights included, cut out for a moment. Anomalies love the drop.

[h2]What you get[/h2]
[list]
[*] The Quantum Dot Disco sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: The lights follow the beat. So do the blackouts.
[*] The "Disco Ball" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Disko kvantových teček[/h2]
Někdo propojil displej z kvantových teček se zvukovou aparaturou. Laboratoř pulzuje barvami a při každém dropu na chvíli zhasnou všechna světla včetně baterek. Anomálie drop milují.

[h2]Co získáš[/h2]
[list]
[*] Sektor Disko kvantových teček, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Světla jedou do rytmu. Výpadky taky.
[*] Čepici „Disko koule“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 18 - Neutrino Tank / Neutrinová nádrž

**Název produktu:** `Qubit Crew - Neutrino Tank`  
**Klíč v hře / steam_config.json:** `dlc18`  
**Obrázky:** `store-assets/dlc18/`

**Krátký popis (EN)**

```
Flooded halls and things that ignore walls. A new sector for Qubit Crew with its own quantum rule, plus the "Diver Helmet" hat.
```

**Krátký popis (CS)**

```
Zatopené haly a věci, které ignorují stěny. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Potápěčská helma“.
```

**O tomto obsahu (EN)**

```
[h2]Neutrino Tank[/h2]
The detector tank has flooded the sector with ultra-pure water. Wading slows you down, and the anomalies here behave like neutrinos: slow, patient, and able to drift straight through solid walls. Only light stops them.

[h2]What you get[/h2]
[list]
[*] The Neutrino Tank sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Flooded halls and things that ignore walls.
[*] The "Diver Helmet" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Neutrinová nádrž[/h2]
Nádrž detektoru zatopila sektor ultračistou vodou. Brodění vás zpomaluje a anomálie se tu chovají jako neutrina: pomalé, trpělivé a schopné proplout pevnou zdí. Zastaví je jen světlo.

[h2]Co získáš[/h2]
[list]
[*] Sektor Neutrinová nádrž, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Zatopené haly a věci, které ignorují stěny.
[*] Čepici „Potápěčská helma“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 19 - Gravity Wave Lab / Laboratoř gravitačních vln

**Název produktu:** `Qubit Crew - Gravity Wave Lab`  
**Klíč v hře / steam_config.json:** `dlc19`  
**Obrázky:** `store-assets/dlc19/`

**Krátký popis (EN)**

```
Space itself rolls through the lab. Hold on. A new sector for Qubit Crew with its own quantum rule, plus the "Interferometer Visor" hat.
```

**Krátký popis (CS)**

```
Laboratoří se valí sám prostor. Držte se. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Interferometrický průzor“.
```

**O tomto obsahu (EN)**

```
[h2]Gravity Wave Lab[/h2]
The interferometer finally detected something, and it is coming this way. Gravitational wavefronts sweep the whole map and throw everyone in their path. Tunnel through the front at the right moment or go flying.

[h2]What you get[/h2]
[list]
[*] The Gravity Wave Lab sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: Space itself rolls through the lab. Hold on.
[*] The "Interferometer Visor" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Laboratoř gravitačních vln[/h2]
Interferometr konečně něco zachytil a blíží se to sem. Čela gravitačních vln přejíždějí celou mapu a odhazují každého, kdo jim stojí v cestě. Protunelujte se čelem vlny ve správnou chvíli, nebo poletíte.

[h2]Co získáš[/h2]
[list]
[*] Sektor Laboratoř gravitačních vln, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Laboratoří se valí sám prostor. Držte se.
[*] Čepici „Interferometrický průzor“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

## DLC 20 - Singularity Core / Jádro singularity

**Název produktu:** `Qubit Crew - Singularity Core`  
**Klíč v hře / steam_config.json:** `dlc20`  
**Obrázky:** `store-assets/dlc20/`

**Krátký popis (EN)**

```
A micro black hole is loose. It is not staying put. A new sector for Qubit Crew with its own quantum rule, plus the "Accretion Halo" hat.
```

**Krátký popis (CS)**

```
Mikroskopická černá díra je na svobodě. A nestojí na místě. Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „Akreční svatozář“.
```

**O tomto obsahu (EN)**

```
[h2]Singularity Core[/h2]
The final experiment worked too well. A micro black hole orbits through the sector, passing through walls and dragging everything towards it. Get too close and you are scattered. Use its pull to slingshot down the corridors.

[h2]What you get[/h2]
[list]
[*] The Singularity Core sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: A micro black hole is loose. It is not staying put.
[*] The "Accretion Halo" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
```

**O tomto obsahu (CS)**

```
[h2]Jádro singularity[/h2]
Poslední experiment se povedl až moc. Sektorem obíhá mikroskopická černá díra, prochází stěnami a všechno k sobě táhne. Přiblížíte-li se moc, rozptýlí vás. Využijte její tah jako prak a prosvištěte chodbami.

[h2]Co získáš[/h2]
[list]
[*] Sektor Jádro singularity, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: Mikroskopická černá díra je na svobodě. A nestojí na místě.
[*] Čepici „Akreční svatozář“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
```

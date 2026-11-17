// Writes docs/STORE_TEXTY.md: ready-to-paste Steam store texts (English + Czech) for the base
// game and all 20 DLC, generated from src/data/sectors.json so names always match the game.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'sectors.json'), 'utf8'));
const pad = (n) => String(n).padStart(2, '0');

const base = {
  en: {
    short: 'A co-op quantum heist for 1-6 lab cats. Shine your flashlight to collapse qubits out of superposition, keep the Lurkers in the light and feed the dying quantum core before it decoheres.',
    long: `[h2]Your flashlight is a measuring device.[/h2]
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
[/list]`,
  },
  cs: {
    short: 'Kooperativní kvantová loupež pro 1-6 laboratorních koček. Baterkou kolabuj qubity ze superpozice, drž číhače ve světle a krm umírající kvantové jádro, než dekoheruje.',
    long: `[h2]Tvoje baterka je měřicí přístroj.[/h2]
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
[/list]`,
  },
};

let md = `# Texty pro Steam obchod

Vygenerováno skriptem \`node tools/store-text.js\` z \`src/data/sectors.json\`. Texty jsou ve formátu, který
Steam umí (značky \`[h2]\`, \`[list]\`, \`[*]\`). Na Steamu vyplň angličtinu jako hlavní jazyk a češtinu
jako překlad (Store page > Description > jazyk).

Obrázky ke každé stránce jsou ve složce \`store-assets/\` (\`base/\` = základní hra, \`dlc01/\`...\`dlc20/\`).

---

## Základní hra - Qubit Crew

**Krátký popis (EN)**

\`\`\`
${base.en.short}
\`\`\`

**Krátký popis (CS)**

\`\`\`
${base.cs.short}
\`\`\`

**Dlouhý popis (EN)**

\`\`\`
${base.en.long}
\`\`\`

**Dlouhý popis (CS)**

\`\`\`
${base.cs.long}
\`\`\`

**Doporučené tagy:** Co-op, Online Co-Op, Multiplayer, Retro, Low-poly, Cute, Cats, Sci-fi, Physics, Horror (lehký), Procedural Generation, Indie

**Funkce (Steamworks > Store page > Basic Info):** Single-player, Online Co-op, LAN Co-op, Steam Achievements, In-App Purchases (ne), Remote Play Together (lze zapnout)

**Systémové požadavky (Windows):** Windows 10 64-bit, 2 GHz dvoujádrový procesor, 4 GB RAM, grafika s podporou WebGL 2 (Intel HD 520 / GeForce GT 730 nebo lepší), 400 MB místa

---
`;

for (const d of data.dlc) {
  const title = `Qubit Crew - ${d.name.en}`;
  md += `
## DLC ${pad(d.n)} - ${d.name.en} / ${d.name.cs}

**Název produktu:** \`${title}\`  
**Klíč v hře / steam_config.json:** \`${d.key}\`  
**Obrázky:** \`store-assets/${d.key}/\`

**Krátký popis (EN)**

\`\`\`
${d.tag.en} A new sector for Qubit Crew with its own quantum rule, plus the "${d.hatName.en}" hat.
\`\`\`

**Krátký popis (CS)**

\`\`\`
${d.tag.cs} Nový sektor pro Qubit Crew s vlastním kvantovým pravidlem a čepicí „${d.hatName.cs}“.
\`\`\`

**O tomto obsahu (EN)**

\`\`\`
[h2]${d.name.en}[/h2]
${d.desc.en}

[h2]What you get[/h2]
[list]
[*] The ${d.name.en} sector, playable in its own mission and in the Sector Tour
[*] Its unique rule: ${d.tag.en}
[*] The "${d.hatName.en}" hat for your cat
[*] Multiplayer: only the host needs to own this DLC for the whole crew to play the sector
[/list]
Requires the base game Qubit Crew.
\`\`\`

**O tomto obsahu (CS)**

\`\`\`
[h2]${d.name.cs}[/h2]
${d.desc.cs}

[h2]Co získáš[/h2]
[list]
[*] Sektor ${d.name.cs}, hratelný jako samostatná mise i v Okružní jízdě
[*] Jeho unikátní pravidlo: ${d.tag.cs}
[*] Čepici „${d.hatName.cs}“ pro tvoji kočku
[*] Multiplayer: stačí, když DLC vlastní hostitel, a sektor hraje celá posádka
[/list]
Vyžaduje základní hru Qubit Crew.
\`\`\`
`;
}
fs.writeFileSync(path.join(root, 'docs', 'STORE_TEXTY.md'), md);
console.log('docs/STORE_TEXTY.md written (' + data.dlc.length + ' DLC)');

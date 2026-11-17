# Jak vydat Qubit Crew na Steamu - návod krok za krokem

Tenhle návod tě provede vším od spuštění hry na tvém počítači až po tlačítko **Release** na Steamu,
včetně 20 DLC a nastavení cen. Hra i všechny skripty jsou hotové; to, co musíš udělat sám, jsou kroky
na tvém Steamworks účtu (smlouvy, platba, banka, daně), protože ty za tebe nikdo jiný udělat nemůže.

> Údaje o poplatcích a lhůtách odpovídají dokumentaci Steamworks v listopadu 2026. Valve je občas mění,
> takže si je při registraci ještě jednou ověř na <https://partner.steamgames.com/doc/gettingstarted>.

---

## Přehled: kolik to stojí a jak dlouho to trvá

| Co | Kolik / jak dlouho |
|---|---|
| Steam Direct poplatek za hru | **100 USD** jednorázově za každou aplikaci. Nevratný, ale vrátí se ti, až hra vydělá 1 000 USD (Adjusted Gross Revenue). |
| DLC | Vytváří se pod základní hrou tlačítkem *Add New DLC*, **vlastní Steam Direct poplatek nemá** (platí se jen za samostatné aplikace). |
| Ověření daní a identity | může trvat **až 30 dní** |
| Čekací doba po zaplacení poplatku | **21 dní** od zaplacení do chvíle, kdy smíš hru vydat |
| Stránka „Coming Soon“ | u prvních her musí být veřejná **aspoň 2 týdny** před vydáním |
| Kontrola stránky obchodu | obvykle 3-5 pracovních dní (posílej aspoň 7 dní předem) |
| Kontrola buildu | obvykle 3-5 pracovních dní |
| Kontrola ceny | obvykle 1-2 pracovní dny |
| Podíl Steamu z prodejů | 30 % (25 % nad 10 mil. USD, 20 % nad 50 mil. USD) |

Realisticky počítej s **5-8 týdny** od registrace do vydání.

---

## Krok 1 - Spusť hru u sebe

1. Nainstaluj **Node.js 22 LTS** z <https://nodejs.org> (stačí výchozí volby instalátoru).
2. Stáhni projekt z GitHubu (zelené tlačítko *Code > Download ZIP*, nebo `git clone`) a rozbal ho.
3. Otevři ve složce projektu příkazový řádek (ve Windows: ve složce klikni do adresního řádku, napiš `cmd`, Enter) a spusť:

```bash
npm install
```

```bash
npm start
```

Otevře se okno hry. Steam zatím nemusí běžet - hra se bez něj spustí v offline režimu (sólo + LAN).

Užitečné příkazy pro vývoj:

| Příkaz | Co dělá |
|---|---|
| `npm start` | sestaví hru a spustí ji v okně (Electron) |
| `npm run dev` | spustí hru v prohlížeči na <http://localhost:5173> (adresa `http://localhost:5173/?dlc=all` odemkne všech 20 DLC pro testování) |
| `npm test` | automatický test: bot odehraje směny, projde všech 24 sektorů a otestuje multiplayer |
| `npm run dist:win` | vyrobí hotovou Windows verzi do `dist/win-unpacked` |

> Odemykání DLC přes `?dlc=all` (nebo `QC_DLC=all` při `npm start`) funguje **jen ve vývojové verzi**.
> V zabalené verzi pro Steam rozhoduje výhradně Steam, jestli hráč DLC vlastní.

### Vyzkoušej multiplayer po síti (LAN)

1. Na prvním počítači: **Host LAN game**. V lobby uvidíš adresu, např. `192.168.1.20:7777`.
2. Windows se zeptá, jestli hře povolit přístup k síti - povol (soukromé sítě).
3. Na druhém počítači: **Join by IP** a zadej tu adresu.

Online hra přes internet jde přes Steam (krok 12) - bez přesměrování portů, kamarády pozveš ze seznamu přátel.

---

## Krok 2 - Vytvoř si Steamworks účet

1. Jdi na <https://partner.steamgames.com> a přihlas se svým Steam účtem
   (zapni si **Steam Guard** v mobilní aplikaci Steam - Steamworks ho u citlivých akcí, jako je nahrávání
   a zveřejňování buildů, vyžaduje).
2. Zvol **Steam Direct** a začni vyplňovat „digitální papírování“:
   - **Jako fyzická osoba** zvol typ firmy **Sole Proprietorship** a jako název firmy napiš své
     **skutečné jméno a příjmení** (žádnou přezdívku). Steam výslovně dovoluje registraci jako jednotlivec.
   - Jméno musí sedět s bankovním účtem a daňovými údaji.
3. Elektronicky podepíšeš **NDA** a **Steam Distribution Agreement**.
4. **Bankovní údaje**: číslo účtu (IBAN), SWIFT/BIC a adresa banky. Účet musí být na stejné jméno.
5. **Daňový dotazník (tax interview)**: jako občan ČR vyplníš obdobu formuláře **W-8BEN**.
   ČR má s USA smlouvu o zamezení dvojího zdanění, takže srážková daň v USA může být snížená - sazbu ti
   Steam spočítá sám podle odpovědí. Příjmy pak daníš v ČR (doporučuji se poradit s účetní / daňovým poradcem,
   zvlášť kvůli živnosti).
6. **Ověření identity** - nahraješ doklad. Celé ověření může trvat až 30 dní.
7. **Zaplať Steam Direct poplatek 100 USD** (kartou nebo jinou metodou kromě Steam peněženky).
   Od zaplacení běží **21denní** čekací lhůta, než můžeš hru vydat - proto zaplať co nejdřív.

---

## Krok 3 - Vytvoř hru (App ID)

1. Po zaplacení poplatku dostaneš „app credit“. V Steamworks zvol **Create new app**, zadej název
   **Qubit Crew**.
2. Dostaneš **App ID** (číslo, např. `2345670`). Zapiš si ho.
3. Na stránce aplikace otevři **SteamPipe > Depots**. Steam obvykle rovnou vytvoří depot s číslem
   **App ID + 1** - to bude depot pro Windows. Zapiš si ho.
   (Volitelně přidej druhý depot pro Linux, viz krok 7.)

---

## Krok 4 - Vytvoř 20 DLC

1. Na hlavní stránce hry ve Steamworks otevři **All Associated Packages, DLC, Demos And Tools**.
2. Klikni **Add New DLC** a vytvoř DLC. Opakuj to 20×. Názvy přesně podle tabulky
   (anglicky, české názvy doplníš jako překlad stránky):

| Klíč | Název DLC na Steamu | Čepice |
|---|---|---|
| dlc01 | Qubit Crew - Deep Freeze | Ushanka |
| dlc02 | Qubit Crew - Laser Grid | Prism Crown |
| dlc03 | Qubit Crew - Ion Storm | Electrode Halo |
| dlc04 | Qubit Crew - Entanglement Station | Twin Antennas |
| dlc05 | Qubit Crew - Many-Worlds Wing | Split Mask |
| dlc06 | Qubit Crew - Tunnel Junction | Drill Helmet |
| dlc07 | Qubit Crew - Zero-Point Chamber | Bubble Helmet |
| dlc08 | Qubit Crew - Uncertainty Ward | Question Mark |
| dlc09 | Qubit Crew - Annealer Furnace | Flame Crest |
| dlc10 | Qubit Crew - Qubit Foundry | Cleanroom Hood |
| dlc11 | Qubit Crew - Schrödinger's Menagerie | Cardboard Box |
| dlc12 | Qubit Crew - Condensate Pool | Droplet |
| dlc13 | Qubit Crew - Topological Maze | Möbius Halo |
| dlc14 | Qubit Crew - Error Correction Center | Parity Cap |
| dlc15 | Qubit Crew - Dark Fiber | Fiber Mohawk |
| dlc16 | Qubit Crew - Time Crystal Vault | Hourglass |
| dlc17 | Qubit Crew - Quantum Dot Disco | Disco Ball |
| dlc18 | Qubit Crew - Neutrino Tank | Diver Helmet |
| dlc19 | Qubit Crew - Gravity Wave Lab | Interferometer Visor |
| dlc20 | Qubit Crew - Singularity Core | Accretion Halo |

3. Každé DLC dostane **vlastní App ID**. Zapiš si je k příslušnému klíči.

**Jak DLC v této hře funguje technicky:** obsah všech 20 sektorů je už v základní hře. Hra se při
spuštění zeptá Steamu (`BIsDlcInstalled`), která DLC hráč vlastní, a podle toho sektory a čepice odemkne.
Je to v dokumentaci Steamworks popsaný způsob „DLC součástí souborů základní hry“ - **DLC proto
nepotřebují vlastní depoty ani vlastní buildy**, stačí jim stránka v obchodě a cena.

V multiplayeru stačí, aby sektor vlastnil **hostitel**, a hraje ho celá posádka (kamarádi si DLC můžou
vyzkoušet - dobrá reklama). Čepice si každý nosí jen ze svých vlastních DLC.

---

## Krok 5 - Vyplň `steam_config.json`

V kořeni projektu otevři `steam_config.json` a nahraď nuly a testovací `480` svými čísly:

```json
{
  "appId": 2345670,
  "depots": { "windows": 2345671, "linux": 0 },
  "dlc": {
    "dlc01": 2345680,
    "dlc02": 2345681,
    "...": "...",
    "dlc20": 2345699
  }
}
```

- `appId` = App ID hry, `depots.windows` = ID Windows depotu, `dlc` = App ID každého DLC.
- DLC s hodnotou `0` hra považuje za nevlastněné.
- Po změně musíš hru znovu zabalit (krok 6).

**Tip - testování Steam funkcí ještě před vlastním App ID:** s `"appId": 480` (Valveova veřejná testovací
aplikace *Spacewar*) a spuštěným Steamem můžeš na dvou počítačích se dvěma Steam účty vyzkoušet online lobby,
pozvánky i overlay. DLC ani achievementy se s 480 testovat nedají.

---

## Krok 6 - Zabal hru

```bash
npm run dist:win
```

Výsledek je ve složce `dist/win-unpacked` (`QubitCrew.exe` + knihovny, včetně `steam_api64.dll`).
Vyzkoušej ji dvojklikem na `QubitCrew.exe`.

> Jakmile v `steam_config.json` nastavíš svoje App ID, zabalená hra spuštěná mimo Steam se sama
> přes Steam restartuje (`SteamAPI_RestartAppIfNecessary`) - tak to má být.

Volitelně Linux (nativně pro Linux/Steam Deck): `npm run dist:linux` (nejlépe na Linuxu).
Steam Deck zvládne i Windows verzi přes Proton, takže začít jen s Windows je v pořádku.

---

## Krok 7 - Nastav SteamPipe ve Steamworks

1. **SteamPipe > Depots**: depot pro Windows nastav na *Operating System: Windows*, *Language: All*.
   (Linux depot: *Operating System: Linux*.)
2. **Installation > General Installation**, sekce **Launch Options**:
   - Windows: *Executable* = `QubitCrew.exe`, *Operating System* = Windows.
   - Linux (jen pokud máš Linux depot): *Executable* = `QubitCrew`, *Arguments* = `--no-sandbox`,
     *Operating System* = Linux.
3. **Publish** (Steamworks > Publish > Prepare for Publishing > Publish to Steam). Bez publikování Steam o
   depotech neví.
4. V **All Associated Packages, DLC, Demos And Tools** zkontroluj, že Windows depot je v balíčku
   (package) hry.

---

## Krok 8 - Nahraj build na Steam

1. Stáhni **Steamworks SDK** (Steamworks > SDK > Downloads) a rozbal ho, např. do `C:\steamworks_sdk`.
2. Doporučení Valve: vytvoř si samostatný Steam účet jen na nahrávání („builder“) a dej mu v Steamworks
   oprávnění *Edit App Metadata* a *Publish App Changes To Steam*. Může to být i tvůj účet.
3. V projektu připrav obsah a skript:

```bash
npm run steam:stage
```

   Skript zkopíruje `dist/win-unpacked` do `steam/content/windows` a vytvoří `steam/scripts/app_build.vdf`
   s tvými čísly ze `steam_config.json`.
4. Spusť nahrávání (cestu uprav podle sebe; při prvním přihlášení se zeptá na kód ze Steam Guardu):

```bash
C:\steamworks_sdk\tools\ContentBuilder\builder\steamcmd.exe +login TVUJ_BUILDER_UCET +run_app_build "C:\cesta\k\Steam_game\steam\scripts\app_build.vdf" +quit
```

5. Ve Steamworks otevři **SteamPipe > Builds**, najdi nový build a u něj zvol **Set build live on branch:
   default** (větev *default* nejde nastavit automaticky skriptem, jen tady ručně).

Každá další aktualizace hry = zvýšit `version` v `package.json`, `npm run dist:win`, `npm run steam:stage`,
znovu `steamcmd` a znovu *Set build live*.

---

## Krok 9 - Stránka v obchodě

Všechno potřebné je připravené:

- **Texty** (angličtina + čeština) pro hru i všech 20 DLC: [`docs/STORE_TEXTY.md`](STORE_TEXTY.md)
- **Obrázky**: složka `store-assets/` - vyrenderované přímo z herního enginu:

| Soubor | Kam ve Steamworks |
|---|---|
| `header_capsule_920x430.jpg` | Store Assets > Header Capsule |
| `small_capsule_462x174.jpg` | Store Assets > Small Capsule |
| `main_capsule_1232x706.jpg` | Store Assets > Main Capsule |
| `vertical_capsule_748x896.jpg` | Store Assets > Vertical Capsule |
| `page_background_1438x810.jpg` | Store Assets > Page Background (volitelné) |
| `screenshot_*.jpg` (1920×1080) | Screenshots (základní hra jich má 6, minimum je 5) |
| `library_capsule_600x900.jpg` | Library Assets > Library Capsule |
| `library_header_920x430.jpg` | Library Assets > Library Header |
| `library_hero_3840x1240.jpg` | Library Assets > Library Hero |
| `library_logo_1280x720.png` | Library Assets > Library Logo (průhledné PNG) |
| `shortcut_icon_256x256.png` | Community Assets > Shortcut Icon |
| `app_icon_184x184.jpg` | Community Assets > App Icon |

Každé DLC má ve složce `store-assets/dlcXX/` vlastní capsule obrázky a 3 screenshoty ze svého sektoru.
Obrázky můžeš kdykoli přegenerovat: `npm run store:assets` (vyžaduje `npm i -D playwright` a
`npx playwright install chromium`).

Dál na stránce vyplň:

- **Supported languages**: English a Czech - *Interface* a *Subtitles* (hra nemá dabing).
- **Features / Categories**: Single-player, Online Co-op, LAN Co-op, Steam Achievements.
- **Controller support**: žádná (klávesnice + myš).
- **Systémové požadavky**: najdeš v `docs/STORE_TEXTY.md`.
- **Content Survey** (dotazník obsahu): hra neobsahuje sex, krev ani hazard; obsahuje jen lehké
  „strašení“ (anomálie hráče „rozptýlí“). Odpovídej pravdivě.
- **Generative AI disclosure** (součást Content Survey): hra vznikla s pomocí AI, takže to uveď. Vhodný text:
  > *Pre-generated: the game's source code, its procedural 3D models, textures, sound effects and texts were
  > created with the help of AI tools and reviewed by the developer. The game does not generate any content
  > with AI while it is running.*
- **Trailer** není povinný, ale hodně pomáhá. Stačí 30-60 s záznamu hraní (např. přes OBS).

Pak klikni **Mark as ready for review**. Stejně vyplň a odešli ke kontrole stránku každého DLC.

---

## Krok 10 - Nastav ceny (hra 20 USD, DLC 100 USD)

### Jak cenu zadat

1. Steamworks > hra > **All Associated Packages, DLC, Demos And Tools**.
2. Otevři **prodejní balíček (store package)** základní hry a zvol **Propose Pricing**.
3. Do USD napiš **19.99** (nebo přesně 20.00 - obojí jde).
4. Pro ostatní měny klikni na **doporučené ceny Valve** (tlačítko pro vyplnění doporučených cen podle
   regionu) - jinak by hra v regionech bez ceny nešla koupit. Případně je uprav ručně.
5. **Submit**. Valve návrh obvykle schválí do **1-2 pracovních dnů**.
6. Totéž udělej pro balíček **každého DLC** a zadej **99.99 USD** (nebo 100.00).

Užitečná pravidla Steamu:
- Minimální cena je 0,99 USD; horní hranici dokumentace neuvádí.
- Cenu hry po vydání neměň aspoň 30 dní. Když cenu zvýšíš, 30 dní pak nesmíš vyhlásit slevu.
- Steam si bere 30 %. Z DLC za 99,99 USD dostaneš zhruba 70 USD minus DPH (v EU je v ceně), vratky a daně.

### Moje upřímné doporučení k cenám DLC

Technicky si cenu 100 USD za DLC nastavit můžeš a hra je na to připravená. Než to ale uděláš, zvaž tohle:

- **20 × 100 USD = 2 000 USD** za celý obsah, tedy **stonásobek** ceny základní hry. Běžná DLC s jednou
  mapou/sektorem a kosmetikou se na Steamu prodávají za **2-7 USD**.
- Recenze na Steamu píšou hráči. Takové ceny skoro jistě skončí vlnou negativních recenzí
  („DLC greed“), a horší hodnocení znamená, že Steam bude hru zobrazovat méně - poškodí to i prodej
  základní hry.
- Hráči můžou do 14 dnů (a 2 hodin hraní) požádat o vrácení peněz - u drahého DLC s jedním sektorem to
  udělají často.
- Sama dokumentace Steamworks varuje, že vydat DLC hned v den vydání hry nemusí být dobrý nápad - hráči
  pak mají pocit, že obsah byl ze hry „vyříznut“.

**Co bych udělal já:**
1. Vydat základní hru za 19,99 USD (nebo 14,99 USD).
2. DLC po **2,99-4,99 USD** a vydávat je postupně (třeba jedno za 2-4 týdny) - každé vydání je novinka,
   která hru znovu ukáže hráčům.
3. Přidat **balíček (bundle)** „Qubit Crew - Complete“ se slevou na všechno.

Rozhodnutí je ale na tobě - postup zadání ceny výše je stejný pro jakoukoli částku.

---

## Krok 11 - Achievementy

Hra už odemyká 9 achievementů. Ve Steamworks (**Stats & Achievements > Achievements**) je vytvoř přesně
s těmito API názvy:

| API name | Název (EN) | Podmínka |
|---|---|---|
| `QC_FIRST_SHIFT` | First Shift | Dokonči první směnu |
| `QC_SHIFT_5` | Seasoned Crew | Dojdi do 5. směny |
| `QC_SHIFT_10` | Quantum Veteran | Dojdi do 10. směny |
| `QC_DELIVER_100` | Qubit Courier | Doruč celkem 100 qubitů |
| `QC_BANISH_25` | Observer Effect | Zažeň 25 číhačů |
| `QC_TUNNEL_100` | Through the Wall | Protuneluj se 100× |
| `QC_ENTANGLED` | Spooky Action | Doruč provázaný pár včas |
| `QC_FULL_CREW` | Full Crew | Odehraj směnu se 4+ hráči |
| `QC_TOURIST` | Grand Tour | Navštiv všechny 4 základní sektory |

Ikony achievementů (64×64, odemčená + šedá zamčená verze) najdeš ve složce `store-assets/achievements/`.
Po vytvoření klikni **Publish**.

---

## Krok 12 - Online multiplayer přes Steam

Nic dalšího nastavovat nemusíš - hra používá Steam lobby a Steam P2P síť:

- **Host online (Steam)** vytvoří lobby pro přátele, tlačítko **Invite friends** otevře pozvánky ve Steam
  overlayi (Shift+Tab).
- Kamarád pozvánku přijme ve Steamu a hra ho připojí (i když hra ještě neběží - Steam ji spustí s parametrem
  `+connect_lobby`).
- Funguje přes internet bez přesměrování portů. Max. 6 hráčů.

Doporučuji před vydáním odehrát aspoň jednu směnu online se 2-3 kamarády (rozdej jim klíče - Steamworks >
Request Steam Product Keys).

---

## Krok 13 - Coming Soon a vydání

1. Až Valve schválí stránku obchodu, zveřejni ji jako **Coming Soon** (u prvních her musí být veřejná
   aspoň **2 týdny**). Sdílej odkaz, ať lidé hru přidávají do přání (wishlist) - to je nejdůležitější
   marketing na Steamu.
2. Odešli **build ke kontrole** (Release checklist > Game build > Mark as ready for review).
3. Musí uplynout **21 dní od zaplacení poplatku**.
4. Až je vše zelené, na stránce hry klikni na zelené tlačítko **Release App** > *Publish Now* >
   *Release Now*. Hra se sama nevydá, i když je schválená - musíš to udělat ty.
5. DLC vydáš stejně - každé má vlastní stránku a tlačítko vydání.

---

## Kontrolní seznam

- [ ] Hra běží přes `npm start` a `npm test` hlásí `ALL CHECKS PASSED`
- [ ] Steamworks účet, NDA, Distribution Agreement, banka, daně, identita
- [ ] Zaplacený Steam Direct poplatek (start 21denní lhůty)
- [ ] App ID + 20 DLC App ID zapsané v `steam_config.json`
- [ ] `npm run dist:win` a otestovaný `QubitCrew.exe`
- [ ] Depoty, Launch Options, Publish
- [ ] Build nahraný přes `steamcmd` a nastavený na větev *default*
- [ ] Stránka hry: texty, obrázky, jazyky, Content Survey vč. AI disclosure
- [ ] Stránky 20 DLC
- [ ] Ceny navržené a schválené (hra + DLC)
- [ ] Achievementy vytvořené a publikované
- [ ] Coming Soon aspoň 2 týdny
- [ ] Build schválený, uplynulo 21 dní
- [ ] **Release App**

---

## Když něco nejde

| Problém | Řešení |
|---|---|
| V menu je „Steam is not running“ | Spusť Steam klienta. Ve vývoji musí Steam běžet a v `steam_config.json` musí být App ID (např. 480). |
| Zabalená hra se po spuštění hned zavře | S vlastním App ID se hra mimo Steam restartuje přes Steam. Spouštěj ji ze Steam knihovny (nebo dočasně dej `appId` 480). |
| DLC se neodemkne | Zkontroluj App ID DLC v `steam_config.json`, znovu zabal a nahraj build. Ve Steamu: Vlastnosti hry > DLC. |
| Kamarád se nepřipojí přes LAN | Povol hru ve Windows firewallu (privátní síť), port 7777 (případně 7778-7786). |
| Online lobby nejde vytvořit | Steam musí běžet a hra musí být spuštěná přes Steam (nebo dev s App ID 480). |
| `steamcmd` hlásí chybu přihlášení | Účet potřebuje oprávnění *Edit App Metadata* a *Publish App Changes To Steam*; zadej kód ze Steam Guardu. |

Odkazy na dokumentaci Steamworks:
[Steam Direct poplatek](https://partner.steamgames.com/doc/gettingstarted/appfee) ·
[Onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding) ·
[DLC](https://partner.steamgames.com/doc/store/application/dlc) ·
[Ceny](https://partner.steamgames.com/doc/store/pricing) ·
[Nahrávání buildů](https://partner.steamgames.com/doc/sdk/uploading) ·
[Vydání](https://partner.steamgames.com/doc/store/releasing) ·
[Kontrola](https://partner.steamgames.com/doc/store/review_process) ·
[Grafika obchodu](https://partner.steamgames.com/doc/store/assets/standard) ·
[Grafika knihovny](https://partner.steamgames.com/doc/store/assets/libraryassets) ·
[Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)

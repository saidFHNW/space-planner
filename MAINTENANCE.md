# VT Space Planner — Wartungsanleitung

Diese Anleitung richtet sich an die Person bei Vertical Technik AG, die den 
Space Planner weiterbetreibt. Sie beschreibt die wiederkehrenden Arbeiten: ein Produkt
hinzufügen, ein Modell austauschen, die Masse prüfen, die Sicherheitszonen
anpassen und die Seite neu veröffentlichen.

Die technische Übersicht des Projekts steht in [README.md](README.md) (Englisch).
Die Bedienung des Planers erklärt die Anleitung im Planer selbst
(Schaltfläche «?» unten links).

**Stand:** August 2026 · **Live:** <https://space-planner-six.vercel.app>

---

## Inhalt

1. [Was du brauchst](#1-was-du-brauchst)
2. [Projekt lokal starten](#2-projekt-lokal-starten)
3. [Die wichtigste Regel: SKU = Katalog-ID = Dateiname](#3-die-wichtigste-regel-sku--katalog-id--dateiname)
4. [Ein Produkt hinzufügen](#4-ein-produkt-hinzufügen)
5. [Ein Produkt ändern oder entfernen](#5-ein-produkt-ändern-oder-entfernen)
6. [Modelldateien (GLB)](#6-modelldateien-glb)
7. [Masse prüfen: die Audit-Skripte](#7-masse-prüfen-die-audit-skripte)
8. [Sicherheitszonen und Toleranzen anpassen](#8-sicherheitszonen-und-toleranzen-anpassen)
9. [Vorschaubilder und Zwischenspeicher](#9-vorschaubilder-und-zwischenspeicher)
10. [Text der Anleitung im Planer ändern](#10-text-der-anleitung-im-planer-ändern)
11. [Veröffentlichen (Deployment)](#11-veröffentlichen-deployment)
12. [Anbindung an den echten Shop](#12-anbindung-an-den-echten-shop)
13. [Ausgeblendete Funktionen wieder einschalten](#13-ausgeblendete-funktionen-wieder-einschalten)
14. [Fehlersuche](#14-fehlersuche)
15. [Offene Punkte und Grenzen](#15-offene-punkte-und-grenzen)

---

## 1. Was du brauchst

| | |
|---|---|
| **Node.js** | Version 20.19 oder neuer — <https://nodejs.org> |
| **Git** | um den Code zu holen und Änderungen zu sichern |
| **Editor** | WebStorm oder Visual Studio Code |
| **Vercel CLI** | zum Veröffentlichen: `npm install -g vercel` |
| **Python 3** | nur für die Audit-Skripte, mit `pip install trimesh numpy` |
| **Browser** | Chrome, Edge oder Brave. Die 3D-Ansicht braucht WebGL. |

Der Quellcode liegt auf GitHub: <https://github.com/saidFHNW/space-planner>

> **Wichtig:** Die 85 GLB-Modelldateien liegen **nicht** in Git (sie sind zu gross
> und sind Produktdaten von VT). Sie werden separat übergeben und müssen von Hand
> nach `static/models/` kopiert werden. Ohne sie startet der Planer zwar, zeigt
> aber keine Vorschaubilder und keine 3D-Modelle.

---

## 2. Projekt lokal starten

```bash
git clone https://github.com/saidFHNW/space-planner.git
cd space-planner
npm install
npm run dev
```

Danach im Browser <http://localhost:5173> öffnen.

Die GLB-Dateien vorher nach `static/models/` kopieren.

Nützliche Befehle:

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit automatischem Neuladen |
| `npm run build` | Produktionsbuild erzeugen (prüft auch auf Fehler) |
| `npm run preview` | den Produktionsbuild lokal anschauen |
| `npm run check` | Typprüfung |

**Faustregel:** Nach jeder Änderung `npm run build` laufen lassen. Wenn der Build
durchläuft und die Änderung im Browser sichtbar ist, kann veröffentlicht werden.

---

## 3. Die wichtigste Regel: SKU = Katalog-ID = Dateiname

Das ist die zentrale Konvention des ganzen Systems:

```
Artikelnummer im Shop   K00834
Eintrag im Katalog      "sku": "K00834"   in src/lib/data/products.json
Modelldatei             static/models/K00834.glb
```

Weil diese drei immer identisch sind, gibt es keine Zuordnungstabelle, die
gepflegt werden müsste. Ein neues Produkt braucht **einen Eintrag in
`products.json` und eine Modelldatei** — es muss **kein Programmcode** geändert
werden.

Ebenso wichtig: Die Masse in `products.json` sind die einzige Quelle der
Wahrheit. Dieselben Werte bestimmen

- die Grundfläche im 2D-Plan,
- die Überlappungs- und Sicherheitszonenprüfung,
- die Skalierung des 3D-Modells,
- die Masse im Vermassungsplan des PDF-Exports.

Ein falscher Wert in `products.json` wirkt sich also überall gleichzeitig aus.
Deshalb gibt es die Audit-Skripte in Abschnitt 7.

---

## 4. Ein Produkt hinzufügen

**Schritt 1 — Modelldatei ablegen.**
Die GLB-Datei nach `static/models/` kopieren und exakt auf die Artikelnummer
umbenennen, zum Beispiel `K00912.glb`. Keine Leerzeichen, keine Umlaute, keine
Sonderzeichen.

**Schritt 2 — Katalogeintrag ergänzen.**
`src/lib/data/products.json` öffnen und am Ende der Liste einen Eintrag nach
diesem Muster einfügen (das Format entspricht der WooCommerce-API):

```json
  {
    "id": 912,
    "name": "Granit Curb Gerade 2m",
    "sku": "K00912",
    "price": "",
    "categories": [
      {
        "id": 12,
        "name": "Curbs, Ledges & Tables",
        "slug": "curbs-ledges-tables"
      }
    ],
    "dimensions": {
      "length": "200",
      "width": "40",
      "height": "35"
    },
    "model_url": "/models/K00912.glb"
  }
```

Zu den Feldern:

| Feld | Bedeutung |
|---|---|
| `id` | eindeutige Zahl, am einfachsten die Artikelnummer ohne «K» und führende Nullen |
| `name` | wird im Katalog, in der Stückliste und im PDF angezeigt |
| `sku` | die Artikelnummer — muss zum Dateinamen passen |
| `categories[0].name` | **steuert die Sicherheitszone** (siehe Abschnitt 8) |
| `dimensions.length` | Tiefe in **Zentimetern** |
| `dimensions.width` | Breite in **Zentimetern** |
| `dimensions.height` | Höhe in **Zentimetern** |
| `model_url` | immer `/models/<SKU>.glb` |

> Alle Masse in **Zentimetern**, als Text in Anführungszeichen. Die Oberfläche
> rechnet für die Anzeige selbst in Meter um.

**Schritt 3 — Kategorie prüfen.**
Nur diese Kategorien sind zurzeit im Katalog vorhanden:

| Kategorie | Anzahl | Sicherheitszone |
|---|---|---|
| `Curbs, Ledges & Tables` | 33 | 1,5 m |
| `Rails` | 8 | 1,5 m |
| `Ramps & Transitions` | 14 | 2,0 m |
| `Foundations & Parts` | 18 | 2,0 m |
| `Fences & Enclosures` | 8 | 2,0 m |
| `Signage` | 4 | 2,0 m |

Eine neue Kategorie funktioniert sofort (der Filter im Katalog wird aus den Daten
erzeugt), bekommt aber automatisch die Standardzone von 2,0 m. Soll sie 1,5 m
haben, siehe Abschnitt 8.

**Schritt 4 — prüfen und veröffentlichen.**

```bash
python check_model_dims.py
npm run build
npm run dev
```

Im Browser den Katalog öffnen, das neue Modul suchen, platzieren, in 2D und 3D
kontrollieren. Danach veröffentlichen (Abschnitt 11).

---

## 5. Ein Produkt ändern oder entfernen

**Masse korrigieren:** die Werte unter `dimensions` in `products.json` ändern.
Danach unbedingt in 3D kontrollieren — das Modell wird auf genau diese Masse
skaliert. Ein falscher Wert staucht oder streckt das Modell sichtbar.

**Name ändern:** `name` in `products.json` ändern. Der Name erscheint im Katalog,
in der CSV-Stückliste und im PDF.

**Kategorie ändern:** `categories[0].name` ändern. Das ändert auch die
Sicherheitszone.

**Produkt entfernen:** den Eintrag aus `products.json` löschen und die GLB-Datei
aus `static/models/` entfernen.

> Bereits gespeicherte Projekte, die dieses Modul enthalten, verlieren dadurch
> das Modell. Der Planer stürzt nicht ab, zeigt aber einen Platzhalter. Ein
> Produkt besser umbenennen als löschen, solange es noch in Projekten vorkommt.

---

## 6. Modelldateien (GLB)

**Format:** `.glb` (binäres glTF). Das ist das Format, das VT bereits verwendet.

**Dateiname:** exakt `<SKU>.glb`, zum Beispiel `K00834.glb`.

**Einheiten:** Die gelieferten Modelle sind **nicht einheitlich**. Die meisten
sind in Millimetern exportiert, die neueren Granit-Module in Metern. Das ist kein
Problem — der Planer skaliert jedes Modell ohnehin auf die Masse aus
`products.json`, und das Audit-Skript erkennt die Einheit pro Datei automatisch.
Wichtig ist nur, dass die Masse in `products.json` in **Zentimetern** stehen.

**Ausrichtung:** Das Modell sollte so exportiert sein, wie es auf dem Boden
steht. Gedrehte oder verschachtelte Teile im Modell sind erlaubt; der Planer
misst die Modelle vertexgenau
(`Box3.setFromObject(model, true)` in `src/lib/utils/furnitureModelLoader.ts`).
**Diese Einstellung nicht zurückändern** — sie war die Ursache dafür, dass ein
gebogenes Modul verzerrt dargestellt wurde.

**Viele Dateien auf einmal umbenennen:** `rename_models.py` im Projektverzeichnis
benennt einen ganzen Ordner gelieferter GLB-Dateien auf die Artikelnummer um und
entfernt dabei Leerzeichen und Sonderzeichen. Vorher eine Kopie der Originale
anlegen.

---

## 7. Masse prüfen: die Audit-Skripte

Diese beiden Skripte sind das Werkzeug, um Datenfehler sichtbar zu machen. Sie
sollten **immer dann laufen, wenn Produkte oder Modelle geändert wurden.**

### `check_model_dims.py` — prüfen

```bash
pip install trimesh numpy      # nur beim ersten Mal
python check_model_dims.py
```

Das Skript misst die Bounding Box jeder GLB-Datei, erkennt die Einheit der Datei
automatisch, vergleicht das Ergebnis mit `products.json` und schreibt einen
Bericht nach `model_dims_report.csv` (öffnet in Excel). Gemeldet werden:

- Module **ohne Masse** in den Produktdaten (Wert 0),
- Module, deren Masse **deutlich** (mehr als 50 %) vom Modell abweichen,
- Module ohne passende Modelldatei und Modelldateien ohne Katalogeintrag.

In der Spalte mit dem Vorschlag steht jeweils das aus dem Modell gemessene Mass.

### `patch_zero_dims.py` — die gemessenen Masse eintragen

```bash
python patch_zero_dims.py
```

Dieses Skript schreibt die gemessenen Masse für die 23 Module in `products.json`,
deren Shop-Daten gar keine Masse hatten. Es arbeitet gezielt pro Artikelnummer,
sodass die Änderung im Git-Diff gut nachvollziehbar bleibt.

> **Achtung:** Diese 23 Werte sind **provisorisch**. Sie stammen aus den
> 3D-Modellen, nicht aus den offiziellen Produktdaten von VT. Sie müssen von VT
> bestätigt werden; die Datei `VT_Modul_Review.xlsx` ist dafür vorgesehen.
> Sobald die richtigen Werte vorliegen, gehören sie direkt in `products.json`
> und langfristig in den Shop.

---

## 8. Sicherheitszonen und Toleranzen anpassen

Alle Regeln stehen in **`src/lib/utils/collision.ts`**, ganz oben in der Datei:

```ts
const ZONE_SMALL_CM = 150;     // 1,5 m
const ZONE_DEFAULT_CM = 200;   // 2,0 m
const SMALL_ZONE_CATEGORIES = new Set(['Rails', 'Curbs, Ledges & Tables']);

export const BOND_TOLERANCE_CM = 18;   // Verbund zweier gleicher Module
const OVERLAP_TOLERANCE_CM = 18;       // ab wann eine Überlappung gemeldet wird
```

**Eine Zone ändern:** den Zentimeterwert anpassen.

**Eine Kategorie auf 1,5 m setzen:** ihren Namen zu `SMALL_ZONE_CATEGORIES`
hinzufügen. Der Name muss **exakt** dem Namen in `products.json` entsprechen,
inklusive Kommas und Gross-/Kleinschreibung.

**Die Toleranzen (18 cm):** Diese Werte sind kalibriert, nicht geraten. Beim
Ziehen mit der Maus lassen sich für manche Module keine kleineren Lücken
erzeugen, und ein strengerer Wert hat beabsichtigte Verbünde fälschlich als
Verstoss gemeldet. Wenn du sie änderst, prüfe danach beide Fälle:
zwei gleiche Module aneinandergebaut (darf **keine** Warnung geben) und zwei
gleiche Module leicht ineinandergeschoben (**muss** eine Warnung geben).

Die Regeln gelten für die **gedrehte** Grundfläche, das heisst die Zone dreht mit
dem Modul mit. Der Planer warnt immer nur — er blockiert nie eine Platzierung.

---

## 9. Vorschaubilder und Zwischenspeicher

Die Vorschaubilder im Katalog und die Draufsichten im 2D-Plan werden **im Browser
aus den echten Modellen erzeugt**, nicht vorab als Bilddateien geliefert. Deshalb
können sie nie veralten und es gibt beim Hinzufügen eines Produkts keinen
zusätzlichen Arbeitsschritt.

- Beim allerersten Besuch dauert das rund 20 Sekunden (mit Fortschrittsbalken).
- Danach liegen die Bilder im Zwischenspeicher des Browsers, und der Katalog ist
  in etwa einer Sekunde bereit.
- Die Erzeugung startet erst, wenn ein Projekt geöffnet wird, nicht schon auf der
  Startseite.

**Wenn Vorschaubilder falsch aussehen** (schwarz, verdreht, altes Modell), liegt
das an alten Bildern im Zwischenspeicher. In `src/lib/utils/furnitureThumbnails.ts`
steht dafür eine Versionsnummer:

```ts
const CACHE_NAME = 'module-previews-v4';
```

Zahl um eins erhöhen (`v5`), neu veröffentlichen — dann erzeugen alle Browser die
Bilder einmalig neu. Das ist der offizielle Weg, ein «kaputtes» Vorschaubild bei
allen Nutzerinnen und Nutzern loszuwerden.

Zum Testen genügt es, im Browser die Website-Daten für die Seite zu löschen.

---

## 10. Text der Anleitung im Planer ändern

Die Anleitung im Planer (die Tour beim ersten Besuch und das Hilfefenster) steht
vollständig in **`src/lib/data/guideContent.ts`** — in Deutsch und Englisch.

Die Datei enthält nur Text, keinen Programmcode:

- `tourHome` — die Schritte der Tour auf der Startseite
- `tourEditor` — die Schritte der Tour im Planer
- `panelHome` / `panelEditor` — die Abschnitte im Hilfefenster
- `ui` — die Beschriftungen der Schaltflächen

Einen Satz zu ändern heisst: den Text zwischen den Anführungszeichen anpassen,
**in beiden Sprachen**, und `npm run build` laufen lassen.

Ein Tourschritt zeigt mit `target` auf ein Element der Oberfläche, zum Beispiel
`'[data-guide="tab-area"]'`. Diese Markierungen (`data-guide="…"`) stehen direkt
im jeweiligen Bedienelement. Wird ein Schritt nicht mehr gebraucht, kann er
einfach aus der Liste entfernt werden.

Die Anleitung merkt sich pro Browser, ob die Tour schon gesehen wurde. Über
«Tour erneut starten» im Hilfefenster lässt sie sich jederzeit wiederholen.

---

## 11. Veröffentlichen (Deployment)

Die Seite läuft auf **Vercel** und wird **von einem Arbeitsplatzrechner aus mit
der Vercel CLI** veröffentlicht:

```bash
cd space-planner
npx vercel --prod
```

**Warum nicht automatisch über Git?** Weil die GLB-Modelle nicht in Git liegen.
Eine Veröffentlichung direkt aus GitHub würde eine Seite ganz ohne 3D-Modelle
erzeugen. Die CLI lädt dagegen das lokale Verzeichnis hoch, Modelle inklusive.

Die Datei `.vercelignore` sorgt dafür, dass `node_modules`, Buildordner und die
alten vorgerenderten Bilderordner nicht mit hochgeladen werden.

**Vorgehen bei jeder Veröffentlichung:**

1. `npm run build` — läuft der Build fehlerfrei durch?
2. `npm run dev` — ist die Änderung im Browser wirklich sichtbar, in 2D **und** 3D?
3. Änderungen in Git sichern (`git add <dateien>`, `git commit`, `git push`).
4. `npx vercel --prod`
5. Die Live-Adresse öffnen und kurz gegenprüfen.

> Windows unterscheidet keine Gross- und Kleinschreibung in Dateinamen, die
> Server von Vercel schon. Wenn etwas lokal funktioniert und live nicht, ist eine
> falsch geschriebene Datei- oder Importbezeichnung die häufigste Ursache.

---

## 12. Anbindung an den echten Shop

Zurzeit liest der Planer die Produkte aus der Datei
`src/lib/data/products.json`. Diese Datei hat **bewusst genau die Struktur der
WooCommerce-REST-API**. Zusätzlich gibt es unter `/api/products` einen internen
Endpunkt, der dieselben Daten ausliefert
(`src/routes/api/products/+server.ts`).

Um auf den echten Shop umzustellen, braucht es:

1. einen **lesenden API-Schlüssel** (Consumer Key/Secret) für die
   WooCommerce-REST-API des Shops,
2. eine Anpassung in `src/routes/api/products/+server.ts`, sodass der Endpunkt
   die Produkte vom Shop holt statt aus der Datei — der Schlüssel bleibt dabei
   auf dem Server und ist im Browser nicht sichtbar,
3. eine Anpassung in `src/lib/utils/furnitureCatalog.ts`, damit der Katalog die
   Daten über diesen Endpunkt lädt statt die Datei direkt zu importieren.

Zu beachten:

- Der Shop führt über 550 Artikel, der Planer zeigt 85 Skatepark-Module. Es
  braucht also einen **Filter** (am einfachsten über die Kategorien).
- Nur Artikel mit einer Modelldatei können platziert werden.
- **Die Massqualität im Shop ist entscheidend.** Artikel ohne Masse landen im
  Planer mit Grösse 0. Vor der Umstellung sollte `check_model_dims.py` sauber
  durchlaufen.
- Preise sind im Planer bewusst nicht enthalten. Wenn sie später gezeigt werden
  sollen, liefert die API sie bereits mit.

---

## 13. Ausgeblendete Funktionen wieder einschalten

Der Planer basiert auf einem Grundrisseditor für Gebäude. Wände, Türen, Fenster,
Treppen, Stockwerke und Haus-Vorlagen wurden **ausgeblendet, nicht gelöscht** —
sie funktionieren technisch weiterhin.

Gesteuert wird das von einer einzigen Zeile in
`src/lib/config/features.ts`:

```ts
export const SHOW_HOUSE_FEATURES = false;
```

Auf `true` setzen und neu bauen, dann ist die ursprüngliche Oberfläche wieder da
(inklusive der zugehörigen Tastaturkürzel, Befehle in der Befehlspalette und
Exportformate). Für den Skatepark-Einsatz bleibt der Wert auf `false`.

---

## 14. Fehlersuche

| Symptom | Ursache und Lösung |
|---|---|
| Katalog zeigt nur farbige Platzhalter | Die GLB-Dateien fehlen in `static/models/`. Kopieren und Seite neu laden. |
| Ein Modul ist gestaucht oder gestreckt | Falsche Masse in `products.json`. `python check_model_dims.py` laufen lassen und die Werte korrigieren. |
| Ein Modul ist unsichtbar oder winzig | Masse stehen auf 0. Siehe Abschnitt 7. |
| Vorschaubild ist schwarz oder verdreht | Altes Bild im Zwischenspeicher. Cache-Version erhöhen (Abschnitt 9). |
| 3D-Ansicht bleibt leer | Der Browser unterstützt kein WebGL oder es ist abgeschaltet. Chrome, Edge oder Brave verwenden. |
| Erster Start dauert sehr lange | Normal: die Vorschaubilder werden einmalig erzeugt (~20 s). Ab dem zweiten Mal ~1 s. |
| Ein Verbund zweier gleicher Module wird als Verstoss gemeldet | Die Module liegen weiter als 18 cm auseinander. Näher schieben oder Toleranz prüfen (Abschnitt 8). |
| Projekte sind auf einem anderen Rechner nicht da | So gewollt: Projekte liegen im Browser. Über «Download JSON» / «Import JSON» übertragen. |
| Lokal funktioniert es, live nicht | Meist Gross-/Kleinschreibung in einem Import oder Dateinamen (Abschnitt 11). |
| Der Build bricht ab | Fehlermeldung im Terminal lesen; sie nennt Datei und Zeile. Zur Not `git restore <datei>` und die Änderung nochmals einzeln machen. |

Zum Untersuchen eines Problems im Browser: `F12` drücken und den Reiter «Console»
öffnen. Fehlermeldungen dort sind der schnellste Hinweis.

---

## 15. Offene Punkte und Grenzen

Diese Punkte sind bekannt und bewusst offen. Sie gehören in eine Weiterentwicklung:

- **Keine automatisierten Tests.** Die Prüfung erfolgt von Hand plus das
  Audit-Skript für die Produktdaten. Eine Testsuite ist der empfohlene erste
  Schritt jeder Weiterentwicklung.
- **23 provisorische Masse**, aus den Modellen gemessen (Abschnitt 7). Von VT zu
  bestätigen.
- **Keine Live-Verbindung zum Shop** (Abschnitt 12) — es fehlt der API-Schlüssel.
- **Richtungsabhängige Sicherheitszonen** für Anlaufmodule sind spezifiziert,
  aber nicht umgesetzt. Für Module mit Anlaufrichtung ist die Zone heute
  rundherum gleich gross.
- **Ladezeit wächst mit dem Katalog.** Bei deutlich mehr als 85 Modulen sollte
  die Vorschau serverseitig vorgerendert werden.
- **Die Oberfläche ist auf Englisch**, nur die Anleitung ist zweisprachig. Eine
  deutsche Oberfläche braucht eine richtige Mehrsprachigkeitslösung
  (zum Beispiel `svelte-i18n`).
- **Projekte liegen nur im Browser.** Es gibt keine Benutzerkonten und keine
  gemeinsame Ablage. Austausch läuft über die JSON-Datei.
- **Getestet auf Chromium-Browsern am Desktop.** Tablets und schwache
  Grafikhardware sind nicht systematisch geprüft.
- **Einbettung in die VT-Website** (iFrame oder Subdomain
  `spaceplanner.verticaltechnik.ch`) wurde konzeptionell geprüft, aber nicht
  umgesetzt. Dafür braucht es einen CNAME-Eintrag im DNS.

---

## Kontakt

Entwickelt von Said Fakhri im Rahmen der Bachelorarbeit 2026 an der FHNW
(Betreuung: Devid Montecchiari) für Vertical Technik AG.
said.fakhri22@gmail.com

Der Planer basiert auf dem quelloffenen Framework
[open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan) (MIT-Lizenz).
Die Lizenzdatei liegt dem Projekt bei und muss erhalten bleiben.

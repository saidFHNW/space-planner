// Text of the in-app user guide, in German and English.
//
// Kept in one plain data file on purpose: the guide has to be editable by
// the client without touching any component. Adding a sentence means editing
// this file, nothing else. There is no i18n library in the project, so the
// two languages simply sit next to each other.
//
// `target` is a CSS selector for the element the tour highlights. Elements
// carry a `data-guide="…"` attribute for exactly this purpose, so that
// styling changes never break the tour. A step without a target is shown as
// a centred card. A step marked `optional` is skipped when its element is
// not on the page (for example the project card on an empty start page).

import type { GuideLang } from '$lib/stores/guide.svelte';

export interface GuideStep {
	/** CSS selector of the element to highlight; omitted = centred card. */
	target?: string;
	/** Skip this step when the target element does not exist. */
	optional?: boolean;
	title: string;
	body: string;
}

export interface GuideSection {
	icon: string;
	heading: string;
	lines: string[];
}

export interface GuideCopy {
	tourHome: GuideStep[];
	tourEditor: GuideStep[];
	panelHome: GuideSection[];
	panelEditor: GuideSection[];
	ui: {
		helpTitle: string;
		helpButton: string;
		tabGuide: string;
		tabShortcuts: string;
		restartTour: string;
		close: string;
		next: string;
		back: string;
		skip: string;
		done: string;
		stepOf: (i: number, n: number) => string;
	};
}

const de: GuideCopy = {
	tourHome: [
		{
			title: 'Willkommen beim VT Space Planner',
			body: 'Mit diesem Planer stellst du im Browser einen modularen Skatepark aus dem Sortiment von Vertical Technik zusammen — Fläche festlegen, Module platzieren, Sicherheitszonen prüfen, Plan und Stückliste exportieren. Diese kurze Tour zeigt dir die Startseite. Du kannst sie jederzeit überspringen.'
		},
		{
			target: '[data-guide="home-new"]',
			title: 'Neues Projekt',
			body: '«New Project» öffnet eine leere Fläche. Das ist der normale Start, wenn du einen Park für ein konkretes Grundstück planst.'
		},
		{
			target: '[data-guide="home-examples"]',
			title: 'Beispiel-Layouts',
			body: 'Unter «Example Layouts» findest du fertige Beispiel-Parks. Öffne eines davon, wenn du den Planer erst kennenlernen oder schnell eine Variante zeigen willst — du kannst jedes Beispiel frei anpassen.'
		},
		{
			target: '[data-guide="home-projects"]',
			title: 'Deine Projekte',
			body: 'Hier liegen alle Projekte, die du auf diesem Gerät angelegt hast, mit einer Vorschau des Plans. Ein Klick auf eine Kachel öffnet das Projekt im Planer. Sortiert wird nach der letzten Änderung.'
		},
		{
			target: '[data-guide="home-card"]',
			optional: true,
			title: 'Projekt verwalten',
			body: 'Fahre mit der Maus über eine Kachel: oben rechts erscheint ein Menü mit drei Punkten. Darüber kannst du ein Projekt öffnen, umbenennen, duplizieren oder löschen. Löschen kann nicht rückgängig gemacht werden.'
		},
		{
			title: 'Wichtig: Speicherort',
			body: 'Projekte werden lokal in diesem Browser gespeichert, nicht auf einem Server. Auf einem anderen Computer oder in einem anderen Browser siehst du sie nicht, und der Papierkorb des Browsers löscht sie mit. Zum Weitergeben oder Sichern nutze im Planer «Export → Download JSON» und auf dem anderen Gerät «Import JSON».'
		},
		{
			target: '[data-guide="home-help"]',
			title: 'Hilfe jederzeit',
			body: 'Über diese Schaltfläche öffnest du die Anleitung jederzeit wieder — auch diese Tour. Im Planer selbst gibt es dieselbe Schaltfläche unten links, dort zusätzlich mit allen Tastaturkürzeln.'
		}
	],

	tourEditor: [
		{
			title: 'Der Planer in vier Schritten',
			body: 'So planst du einen Park: 1. Fläche eingeben. 2. Module aus dem Katalog platzieren. 3. Warnungen zu Sicherheitszonen prüfen. 4. Plan und Stückliste exportieren. Die Tour geht diese vier Schritte einmal durch.'
		},
		{
			target: '[data-guide="tab-area"]',
			title: '1. Fläche definieren',
			body: 'Im Tab «AREA» gibst du Breite und Tiefe des Grundstücks in Metern ein und bestätigst mit «Apply». Komma und Punkt sind beide erlaubt (20,5 oder 20.5). Die Fläche erscheint als gestricheltes Rechteck im 2D-Plan und als Bodenplatte in der 3D-Ansicht. Sie ist optional, aber ohne sie kann der Planer nicht prüfen, ob ein Modul über den Rand hinausragt.'
		},
		{
			target: '[data-guide="tab-objects"]',
			title: '2. Module platzieren',
			body: 'Der Tab «OBJECTS» enthält den VT-Katalog mit Vorschaubildern, gruppiert nach Kategorie. Über das Suchfeld findest du ein Modul auch direkt über Name oder Artikelnummer. Ein Modul anklicken und auf der Fläche platzieren — oder es aus der Liste auf den Plan ziehen.'
		},
		{
			target: '[data-guide="editor-canvas"]',
			title: 'Verschieben und drehen',
			body: 'Ein platziertes Modul verschiebst du durch Ziehen. Ausgewählt zeigt es einen runden Griff: damit drehst du es, und die Sicherheitszone dreht mit. Die kleinen Symbole am Modul kopieren oder löschen es. Die Grösse lässt sich bewusst nicht ändern — VT-Module sind feste Produkte.'
		},
		{
			title: '3. Sicherheitszonen und Warnungen',
			body: 'Der Planer prüft nach jeder Änderung automatisch: 1,5 m Freiraum um Rails, Curbs, Ledges und Tables, 2,0 m um alle anderen Module; zwischen zwei Modulen gilt der grössere Wert. Bei einem Konflikt werden die Module rot markiert und oben am Plan erscheint ein Banner mit der Anzahl der Konflikte und dem kleinsten Abstand. Ausnahme: zwei identische Module dürfen direkt aneinandergebaut werden. Überlappungen und Module ausserhalb der Fläche sind immer ein Fehler. Der Planer warnt nur — blockiert wird nichts, die Entscheidung bleibt bei dir.'
		},
		{
			target: '[data-guide="topbar-view"]',
			title: '3D-Ansicht',
			body: 'Hier schaltest du zwischen 2D-Plan und 3D-Ansicht um (oder mit der Tabulator-Taste). In 3D siehst du die echten Modelle: linke Maustaste ziehen = drehen, rechte Maustaste ziehen = verschieben, Mausrad = zoomen. Über das Figuren-Symbol startest du einen Rundgang aus Skater-Perspektive (WASD oder Pfeiltasten, Esc beendet ihn).'
		},
		{
			target: '[data-guide="topbar-export"]',
			title: '4. Exportieren',
			body: 'Drei Exporte stehen bereit. «Item list (CSV)» ist die Stückliste mit Artikelnummer, Name und Stückzahl und öffnet direkt in Excel. «Export as PDF» erzeugt den Plan mit VT-Logo und Stückliste, plus eine zweite Seite mit dem Vermassungsplan zum Ausmessen auf der Baustelle. «Download JSON» speichert das Projekt als Datei, «Import JSON» lädt es wieder — so gibst du einen Entwurf an Kolleginnen und Kollegen weiter.'
		},
		{
			target: '[data-guide="editor-help"]',
			title: 'Hilfe und Tastaturkürzel',
			body: 'Diese Schaltfläche öffnet die vollständige Anleitung und die Liste aller Tastaturkürzel. Mit der Taste «?» kommst du direkt zu den Kürzeln. Viel Erfolg beim Planen!'
		}
	],

	panelHome: [
		{
			icon: '🛹',
			heading: 'Was der Planer macht',
			lines: [
				'Der VT Space Planner ist ein Webplaner für modulare Skateparks von Vertical Technik. Du legst die verfügbare Fläche fest, platzierst Module aus dem Katalog und bekommst automatisch Warnungen, wenn Sicherheitsabstände verletzt werden.',
				'Es braucht keine Installation und kein Benutzerkonto. Der Planer läuft im Browser; empfohlen sind Chrome, Edge oder Brave, weil die 3D-Ansicht WebGL benötigt.'
			]
		},
		{
			icon: '📁',
			heading: 'Projekt anlegen und öffnen',
			lines: [
				'«New Project» legt ein neues, leeres Projekt an und öffnet es sofort im Planer.',
				'«Example Layouts» öffnet ein fertiges Beispiel, das du frei anpassen kannst — gut zum Kennenlernen oder für eine schnelle Variante im Kundengespräch.',
				'Bestehende Projekte liegen als Kacheln auf der Startseite, nach letzter Änderung sortiert. Ein Klick auf die Kachel öffnet das Projekt.',
				'Das Menü mit den drei Punkten (oben rechts auf der Kachel, erscheint beim Darüberfahren) bietet Öffnen, Umbenennen, Duplizieren und Löschen.'
			]
		},
		{
			icon: '💾',
			heading: 'Wo die Projekte liegen',
			lines: [
				'Projekte werden lokal im Speicher dieses Browsers abgelegt, nicht auf einem Server.',
				'Das heisst: auf einem anderen Gerät oder in einem anderen Browser sind sie nicht sichtbar, und wer die Browserdaten löscht, löscht auch die Projekte.',
				'Zum Sichern und Weitergeben: im Planer «Export → Download JSON», und auf dem Zielgerät «Export → Import JSON».'
			]
		},
		{
			icon: '⏳',
			heading: 'Erster Start',
			lines: [
				'Beim ersten Öffnen eines Projekts werden die Vorschaubilder aller Module einmalig im Browser erzeugt. Ein Fortschrittsbalken zeigt den Stand an (rund 20 Sekunden).',
				'Danach liegen die Bilder im Zwischenspeicher des Browsers, und der Katalog ist in etwa einer Sekunde bereit.'
			]
		}
	],

	panelEditor: [
		{
			icon: '📐',
			heading: '1. Fläche definieren',
			lines: [
				'Tab «AREA» in der linken Seitenleiste: Breite und Tiefe des Grundstücks in Metern eingeben, dann «Apply». Komma und Punkt sind beide erlaubt (20,5 oder 20.5). Maximal 500 × 500 m.',
				'Die Fläche erscheint als gestricheltes Rechteck im 2D-Plan und als Bodenplatte in der 3D-Ansicht.',
				'Die Fläche ist optional — ohne sie prüft der Planer aber nicht, ob Module über den Rand hinausragen, und der Vermassungsplan nimmt als Nullpunkt die Ecke aller platzierten Module statt die Ecke des Grundstücks.'
			]
		},
		{
			icon: '🧱',
			heading: '2. Module platzieren',
			lines: [
				'Tab «OBJECTS»: der VT-Katalog mit Vorschaubildern, gruppiert nach Kategorie. Das Suchfeld findet Module über Name und Artikelnummer.',
				'Modul anklicken und auf der Fläche platzieren, oder aus der Liste auf den Plan ziehen. Verschieben durch Ziehen.',
				'Drehen: Modul auswählen und am runden Griff drehen — die Sicherheitszone dreht mit. Über die Symbole am ausgewählten Modul kannst du es kopieren oder löschen.',
				'Die Grösse eines Moduls lässt sich nicht ändern: VT-Module sind feste Produkte, ihre Masse kommen aus den Produktdaten.'
			]
		},
		{
			icon: '⚠️',
			heading: '3. Sicherheitszonen verstehen',
			lines: [
				'Die Prüfung läuft automatisch nach jeder Änderung — platzieren, verschieben, drehen, löschen.',
				'Regel: 1,5 m Freiraum um Rails, Curbs, Ledges und Tables, 2,0 m um alle anderen Module. Treffen zwei verschiedene Zonen aufeinander, gilt der grössere Wert.',
				'Die Zone wird als Kontur um das Modul gezeichnet. Bei einem Konflikt färben sich Modul und Zone rot, und oben am Plan erscheint ein Banner mit der Anzahl der Konflikte und dem kleinsten Abstand, zum Beispiel «1.8 m of 2.0 m required».',
				'Ausnahme: zwei identische Module (gleiche Artikelnummer) dürfen direkt aneinandergebaut werden, zum Beispiel zwei gleiche Curbs zu einer Linie. Dafür gibt es keine Warnung.',
				'Überlappende Module sind immer ein Fehler, auch bei identischen Modulen. Ebenso Module, die über die definierte Fläche hinausragen.',
				'Der Planer warnt, blockiert aber nichts. Die Entscheidung bleibt bei dir.'
			]
		},
		{
			icon: '🧊',
			heading: '3D-Ansicht und Kamera',
			lines: [
				'Oben rechts zwischen «2D» und «3D» umschalten, oder mit der Tabulator-Taste.',
				'Kamera: linke Maustaste ziehen = drehen, rechte Maustaste ziehen = verschieben, Mausrad = zoomen. Der Hinweis steht auch unten rechts in der 3D-Ansicht.',
				'Walkthrough: das Figuren-Symbol startet einen Rundgang aus Skater-Perspektive. Bewegen mit WASD oder den Pfeiltasten, beenden mit Esc.',
				'Das Kamera-Symbol speichert die aktuelle 3D-Ansicht als Bild.'
			]
		},
		{
			icon: '📤',
			heading: '4. Exportieren und teilen',
			lines: [
				'«Item list (CSV)»: Stückliste aller platzierten Module mit Artikelnummer, Name und Stückzahl. Semikolon-getrennt, öffnet direkt in Excel mit deutschen Regionaleinstellungen.',
				'«Export as PDF»: Seite 1 ist der Plan mit VT-Logo, Projektname, Datum, Flächenmass, Draufsicht und Stückliste. Seite 2 ist der Vermassungsplan: ein Nullpunkt an der unteren rechten Ecke der Fläche und für jedes Modul die Masse zu Anfang und Ende in beide Richtungen, plus eine Tabelle mit allen Werten. Damit kann die Crew den Park auf der Baustelle mit dem Messband ausstecken.',
				'«Download JSON» / «Import JSON»: das ganze Projekt als Datei speichern beziehungsweise wieder laden — der Weg, um einen Entwurf per E-Mail weiterzugeben oder auf einem anderen Gerät zu öffnen.'
			]
		},
		{
			icon: '💡',
			heading: 'Gut zu wissen',
			lines: [
				'Gespeichert wird automatisch; der Status oben rechts zeigt «Saved ✓». «Save» speichert zusätzlich von Hand.',
				'Rückgängig mit Strg+Z, wiederherstellen mit Strg+Y. Die Schaltfläche unten links öffnet zusätzlich die Änderungsliste.',
				'Alle Tastaturkürzel stehen im Reiter «Shortcuts» dieses Fensters, oder direkt über die Taste «?».',
				'Der Katalog umfasst zurzeit 85 Module. Preise sind bewusst nicht enthalten — der Planer bereitet die Anfrage vor, er ersetzt keine Offerte.'
			]
		}
	],

	ui: {
		helpTitle: 'Anleitung',
		helpButton: 'Hilfe',
		tabGuide: 'Anleitung',
		tabShortcuts: 'Tastaturkürzel',
		restartTour: 'Tour erneut starten',
		close: 'Schliessen',
		next: 'Weiter',
		back: 'Zurück',
		skip: 'Überspringen',
		done: 'Fertig',
		stepOf: (i, n) => `Schritt ${i} von ${n}`
	}
};

const en: GuideCopy = {
	tourHome: [
		{
			title: 'Welcome to the VT Space Planner',
			body: 'This planner lets you lay out a modular skatepark from the Vertical Technik range in your browser — define the plot, place modules, check the safety zones, export the plan and the item list. This short tour covers the start page. You can skip it at any time.'
		},
		{
			target: '[data-guide="home-new"]',
			title: 'New project',
			body: '"New Project" opens an empty plot. This is the normal starting point when you plan a park for a real site.'
		},
		{
			target: '[data-guide="home-examples"]',
			title: 'Example layouts',
			body: '"Example Layouts" contains ready-made parks. Open one to get to know the planner, or to show a variant quickly — every example can be edited freely.'
		},
		{
			target: '[data-guide="home-projects"]',
			title: 'Your projects',
			body: 'All projects created on this device are listed here with a preview of the plan. Click a card to open the project. The most recently changed project comes first.'
		},
		{
			target: '[data-guide="home-card"]',
			optional: true,
			title: 'Managing a project',
			body: 'Hover over a card: a three-dot menu appears in the top right corner. It lets you open, rename, duplicate or delete a project. Deleting cannot be undone.'
		},
		{
			title: 'Important: where projects are stored',
			body: 'Projects are stored locally in this browser, not on a server. You will not see them on another computer or in another browser, and clearing the browser data deletes them. To share or back up a project, use "Export → Download JSON" in the planner and "Import JSON" on the other device.'
		},
		{
			target: '[data-guide="home-help"]',
			title: 'Help at any time',
			body: 'This button reopens the guide whenever you need it, including this tour. The planner itself has the same button in the bottom left corner, there with the full list of keyboard shortcuts as well.'
		}
	],

	tourEditor: [
		{
			title: 'The planner in four steps',
			body: 'This is how you plan a park: 1. enter the plot size. 2. place modules from the catalogue. 3. check the safety-zone warnings. 4. export the plan and the item list. The tour walks through these four steps once.'
		},
		{
			target: '[data-guide="tab-area"]',
			title: '1. Define the plot',
			body: 'In the "AREA" tab, enter the width and the depth of the site in metres and confirm with "Apply". Both comma and point are accepted (20,5 or 20.5). The plot appears as a dashed rectangle in the 2D plan and as a ground surface in the 3D view. It is optional, but without it the planner cannot tell you when a module sticks out over the edge.'
		},
		{
			target: '[data-guide="tab-objects"]',
			title: '2. Place modules',
			body: 'The "OBJECTS" tab holds the VT catalogue with preview images, grouped by category. The search field finds a module by name or by article number. Click a module and place it on the plot, or drag it from the list onto the plan.'
		},
		{
			target: '[data-guide="editor-canvas"]',
			title: 'Move and rotate',
			body: 'Drag a placed module to move it. When it is selected it shows a round handle for rotating, and the safety zone rotates with it. The small icons on the module copy or delete it. Modules cannot be resized on purpose — VT modules are fixed products.'
		},
		{
			title: '3. Safety zones and warnings',
			body: 'The planner re-checks the plan after every change: 1.5 m of clear space around rails, curbs, ledges and tables, 2.0 m around all other modules; where two zones meet, the larger value applies. On a conflict the modules turn red and a banner above the plan reports the number of conflicts and the smallest distance. Exception: two identical modules may be bonded directly against each other. Overlaps and modules outside the plot are always an error. The planner only warns — nothing is blocked, the decision stays yours.'
		},
		{
			target: '[data-guide="topbar-view"]',
			title: '3D view',
			body: 'Switch between the 2D plan and the 3D view here, or with the Tab key. In 3D you see the real models: drag with the left mouse button to orbit, drag with the right button to pan, scroll to zoom. The figure icon starts a walkthrough from a skater\'s perspective (WASD or arrow keys, Esc to leave).'
		},
		{
			target: '[data-guide="topbar-export"]',
			title: '4. Export',
			body: 'Three exports are available. "Item list (CSV)" is the parts list with article number, name and quantity and opens directly in Excel. "Export as PDF" produces the plan with the VT logo and the item list, plus a second page with the dimensioning plan for measuring out on site. "Download JSON" saves the project as a file and "Import JSON" loads it again — this is how you pass a draft to a colleague.'
		},
		{
			target: '[data-guide="editor-help"]',
			title: 'Help and keyboard shortcuts',
			body: 'This button opens the full guide and the list of all keyboard shortcuts. The "?" key takes you straight to the shortcuts. Enjoy planning!'
		}
	],

	panelHome: [
		{
			icon: '🛹',
			heading: 'What the planner does',
			lines: [
				'The VT Space Planner is a web planner for modular skateparks by Vertical Technik. You define the available area, place modules from the catalogue, and get automatic warnings when safety distances are violated.',
				'No installation and no account are needed. The planner runs in the browser; Chrome, Edge or Brave are recommended, because the 3D view relies on WebGL.'
			]
		},
		{
			icon: '📁',
			heading: 'Creating and opening a project',
			lines: [
				'"New Project" creates an empty project and opens it in the planner right away.',
				'"Example Layouts" opens a ready-made park that you can edit freely — useful for getting to know the tool, or for a quick variant during a customer meeting.',
				'Existing projects appear as cards on the start page, most recently changed first. Click a card to open it.',
				'The three-dot menu in the top right corner of a card (it appears on hover) offers Open, Rename, Duplicate and Delete.'
			]
		},
		{
			icon: '💾',
			heading: 'Where projects are stored',
			lines: [
				'Projects are stored locally in this browser, not on a server.',
				'That means they are not visible on another device or in another browser, and clearing the browser data deletes them.',
				'To back up or share a project: "Export → Download JSON" in the planner, and "Export → Import JSON" on the target device.'
			]
		},
		{
			icon: '⏳',
			heading: 'The first start',
			lines: [
				'The first time you open a project, the preview images of all modules are generated once in the browser. A progress bar shows how far it is (roughly 20 seconds).',
				'After that the images sit in the browser cache and the catalogue is ready in about a second.'
			]
		}
	],

	panelEditor: [
		{
			icon: '📐',
			heading: '1. Define the plot',
			lines: [
				'"AREA" tab in the left sidebar: enter the width and depth of the site in metres, then "Apply". Both comma and point are accepted (20,5 or 20.5). Maximum 500 × 500 m.',
				'The plot appears as a dashed rectangle in the 2D plan and as a ground surface in the 3D view.',
				'The plot is optional — but without it the planner does not check whether modules stick out over the edge, and the dimensioning plan uses the corner of all placed modules as its zero point instead of the corner of the site.'
			]
		},
		{
			icon: '🧱',
			heading: '2. Place modules',
			lines: [
				'"OBJECTS" tab: the VT catalogue with preview images, grouped by category. The search field finds modules by name and by article number.',
				'Click a module and place it on the plot, or drag it from the list onto the plan. Drag a placed module to move it.',
				'Rotating: select the module and turn the round handle — the safety zone rotates with it. The icons on the selected module copy or delete it.',
				'Modules cannot be resized: VT modules are fixed products, and their dimensions come from the product data.'
			]
		},
		{
			icon: '⚠️',
			heading: '3. Understanding the safety zones',
			lines: [
				'The check runs automatically after every change — placing, moving, rotating, deleting.',
				'Rule: 1.5 m of clear space around rails, curbs, ledges and tables, 2.0 m around all other modules. Where two different zones meet, the larger value applies.',
				'The zone is drawn as an outline around the module. On a conflict the module and its zone turn red and a banner above the plan reports the number of conflicts and the smallest distance, for example "1.8 m of 2.0 m required".',
				'Exception: two identical modules (same article number) may be bonded directly against each other, for example two identical curbs forming one line. This produces no warning.',
				'Overlapping modules are always an error, even for identical modules. So are modules that stick out over the defined plot.',
				'The planner warns but never blocks. The decision stays with you.'
			]
		},
		{
			icon: '🧊',
			heading: '3D view and camera',
			lines: [
				'Switch between "2D" and "3D" in the top right corner, or with the Tab key.',
				'Camera: drag with the left mouse button to orbit, drag with the right button to pan, scroll to zoom. The same hint is shown in the bottom right of the 3D view.',
				'Walkthrough: the figure icon starts a walk from a skater\'s perspective. Move with WASD or the arrow keys, leave with Esc.',
				'The camera icon saves the current 3D view as an image.'
			]
		},
		{
			icon: '📤',
			heading: '4. Export and share',
			lines: [
				'"Item list (CSV)": the parts list of all placed modules with article number, name and quantity. Semicolon-separated, so it opens directly in Excel with German regional settings.',
				'"Export as PDF": page 1 is the plan with the VT logo, project name, date, plot size, top view and item list. Page 2 is the dimensioning plan (Vermassungsplan): a zero point at the bottom right corner of the plot and, for every module, the distances to its start and its end along both axes, plus a table of all values. The crew can measure the park out on site with a tape measure from this page.',
				'"Download JSON" / "Import JSON": save the whole project as a file and load it again — the way to pass a draft on by e-mail or open it on another device.'
			]
		},
		{
			icon: '💡',
			heading: 'Good to know',
			lines: [
				'Saving is automatic; the status in the top right shows "Saved ✓". "Save" additionally saves by hand.',
				'Undo with Ctrl+Z, redo with Ctrl+Y. The button in the bottom left also opens the list of changes.',
				'All keyboard shortcuts are in the "Shortcuts" tab of this window, or directly under the "?" key.',
				'The catalogue currently contains 85 modules. Prices are deliberately not included — the planner prepares an enquiry, it does not replace a quotation.'
			]
		}
	],

	ui: {
		helpTitle: 'User guide',
		helpButton: 'Help',
		tabGuide: 'Guide',
		tabShortcuts: 'Shortcuts',
		restartTour: 'Start the tour again',
		close: 'Close',
		next: 'Next',
		back: 'Back',
		skip: 'Skip',
		done: 'Done',
		stepOf: (i, n) => `Step ${i} of ${n}`
	}
};

const COPY: Record<GuideLang, GuideCopy> = { de, en };

export function guideCopy(lang: GuideLang): GuideCopy {
	return COPY[lang] ?? COPY.de;
}

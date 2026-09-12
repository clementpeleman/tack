---
date: 2026-06-14
topic: initial-ideal-customer-profile
---

# Initial Ideal Customer Profile

## Summary

Tack richt zijn eerste commerciële inspanningen op kleine, AI-minded web agencies die klantfeedback op preview sites sneller willen omzetten in reviewbare code. Dit is de start-ICP voor marktintroductie en validatie, niet noodzakelijk de volledige of blijvende markt van Tack.

---

## Problem Frame

Web agencies verzamelen tijdens websiteprojecten veel feedback van klanten en andere Reviewers. Die feedback komt vaak binnen via e-mail, chat, calls, screenshots en losse documenten. De Owner moet vervolgens achterhalen over welke pagina en welk element de feedback gaat, dubbele opmerkingen herkennen, beslissingen van uitvoerbare wijzigingen scheiden en alles opnieuw vertalen naar werk voor een developer.

Die vertaalslag is duur maar vaak onzichtbaar. Ze verschijnt als extra projectmanagement, verduidelijkingsvragen, context switching, trage reviewrondes en revisiewerk dat moeilijk factureerbaar is. Het probleem wordt groter wanneer meerdere websites tegelijk in review zijn en dezelfde kleine groep mensen zowel klanten begeleidt als de wijzigingen uitvoert.

De markt bevestigt dat organisaties betalen voor visuele feedback en website-reviewtools. Dat bewijst de categorie, maar nog niet de vraag naar Tack. Tack heeft nog geen gedocumenteerde betalende pilots, gebruiksdata, verlengingen of testimonials. De gekozen ICP en positionering zijn daarom onderbouwde hypotheses die door echt koop- en gebruiksgedrag moeten worden gevalideerd.

---

## Key Decisions

**Een gerichte startmarkt boven een brede doelgroep.** Tack begint bij kleine web agencies omdat daar pijn, gebruik, koopbevoegdheid en korte feedbackcycli vaak bij dezelfde mensen samenkomen. Een duidelijke wedge maakt productbeslissingen, verkoopgesprekken en validatie beter vergelijkbaar.

**Agencygrootte is een proxy, niet de kern van de ICP.** De bandbreedte van 2 tot 15 medewerkers wijst op organisaties met weinig procurement en korte beslissingslijnen. Het doorslaggevende criterium is dat klantfeedback regelmatig door dezelfde organisatie naar concrete websitewijzigingen wordt vertaald.

**De volledige feedback-to-fix-workflow is de positionering.** Tack wordt niet primair verkocht als een visual feedback widget. De waarde ontstaat wanneer Pins met hun context worden getrieerd, samengebracht tot Implementation Briefs en gebruikt om reviewbare codewijzigingen te maken.

**AI-minded is belangrijker dan AI-first.** De ideale agency hoeft niet volledig rond agents georganiseerd te zijn. Ze moet wel bereid zijn coding agents te gebruiken of te testen voor afgebakende wijzigingen met menselijke review.

**De Owner houdt controle.** Tack mag werk voorbereiden of uitvoeren, maar de Owner beslist wat wordt gebouwd, beoordeelt de wijziging en behoudt de merge- en deploybeslissing. Een Reviewer keurt hoogstens een preview goed.

**De ICP is voorlopig.** Interviews, enthousiasme en gratis gebruik tellen als leersignalen, maar bevestigen de ICP niet. Betaling, herhaald gebruik op echte klantprojecten en verlenging zijn de primaire bewijzen.

---

## Initial ICP

### Firmographic Profile

De primaire start-ICP is een web agency met de volgende kenmerken:

- 2 tot 15 medewerkers of vaste kernleden.
- Bouwt websites, e-commerceomgevingen of webapps voor externe klanten.
- Heeft gewoonlijk meerdere actieve klantprojecten of onderhoudsrelaties tegelijk.
- Gebruikt staging-, branch- of previewomgevingen om werk te laten beoordelen.
- Heeft minstens een developer intern of structureel beschikbaar.
- De persoon die feedback beheert staat dicht bij de technische uitvoering.
- Kan zelfstandig een softwareaankoop van ongeveer EUR 39 tot EUR 99 per maand doen.

De grootteband is richtinggevend. Een agency van 20 medewerkers met dezelfde korte beslissingslijnen kan beter passen dan een agency van acht medewerkers met zware procurement of volledig gescheiden account- en developmentteams.

### Behavioral Profile

De sterkste vroege klant:

- verzamelt vandaag feedback via een mix van e-mail, Slack, Teams, WhatsApp, calls, documenten en screenshots;
- moet geregeld vragen op welke pagina, viewport of component een opmerking slaat;
- zet feedback handmatig om in tickets, taken of prompts;
- behandelt meerdere vergelijkbare of tegenstrijdige opmerkingen binnen dezelfde reviewronde;
- gebruikt al een coding agent of wil die op echte projecten invoeren;
- reviewt gegenereerde code voordat die wordt gemerged;
- wil dat Reviewers feedback kunnen geven zonder een nieuw account of complexe onboarding;
- ervaart reviewrondes als een operationele kost, niet alleen als communicatie.

### Technology Profile

Tack past aanvankelijk het best bij agencies die:

- websites via Git beheren;
- wijzigingen via branches en pull requests beoordelen;
- preview deployments of aparte stagingomgevingen gebruiken;
- moderne of voldoende toegankelijke webstacks onderhouden;
- een script, bookmarklet of browser extension op de preview kunnen gebruiken;
- geen probleem hebben met een hosted SaaS of zelf-hosting bewust waarderen.

Het gebruikte framework is geen ICP-criterium. De workflow moet belangrijker blijven dan een specifieke hostingprovider, CMS of frontendstack.

### Economic Profile

De ideale koper verdient geld met projectdelivery, retainers of doorlopend websiteonderhoud. Tijd die verdwijnt in feedbackverwerking verlaagt de marge, vertraagt facturatie of neemt capaciteit weg van nieuw werk.

Een abonnement is economisch logisch wanneer Tack per maand minstens een van deze effecten bereikt:

- enkele uren Owner- of developertijd besparen;
- een reviewronde verkorten;
- misverstanden en herwerk verminderen;
- meer onderhoudswerk verwerken zonder extra projectmanagement;
- sneller van klantopmerking naar beoordeelbare wijziging gaan.

De waarde moet worden verkocht tegenover bespaarde arbeid en snellere projectafronding, niet tegenover de marginale kost van AI-tokens.

---

## People

- A1. **Economic buyer:** De agency owner, technical lead of delivery lead die verantwoordelijk is voor marge, projectdoorlooptijd en tooling.
- A2. **Owner:** De persoon die projecten configureert, Pins trieert, Implementation Briefs beoordeelt en controle houdt over merge en deploy.
- A3. **Developer:** De persoon of coding agent die de gevraagde wijzigingen uitvoert en reviewbare code oplevert; dit kan dezelfde persoon zijn als A2.
- A4. **Reviewer:** De klant of stakeholder die op een preview site feedback achterlaat zonder het Dashboard te gebruiken.
- A5. **Champion:** De technisch nieuwsgierige medewerker die Tack op het eerste echte klantproject introduceert en intern aantoont dat de workflow tijd bespaart.

In kleine agencies overlappen A1, A2, A3 en A5 vaak. Die overlap is een voordeel voor vroege adoptie omdat één gemotiveerde persoon de aankoop, installatie en eerste workflow kan realiseren.

---

## Jobs to Be Done

### Primary Job

Wanneer een klant een website of webapp beoordeelt, wil de agency precieze feedback met voldoende technische en visuele context verzamelen en die snel omzetten in een gecontroleerde codewijziging, zodat de volgende reviewronde kan starten zonder veel handmatige vertaling.

### Functional Jobs

- Feedback aan de juiste pagina en het juiste element koppelen.
- Screenshots, viewport, browser en plaatsingscontext automatisch bewaren.
- Gesprekken over een Pin op één plaats voeren.
- Open, opgeloste en opnieuw geopende feedback onderscheiden.
- Dubbele en gerelateerde feedback herkennen.
- Vage klanttaal omzetten in een afgebakende Implementation Brief.
- De volledige context aan een coding agent of developer doorgeven.
- Een wijziging als branch, pull request of preview beoordelen voordat ze wordt gemerged.
- De Reviewer laten bevestigen dat de preview het oorspronkelijke probleem oplost.

### Emotional Jobs

- Professioneel en georganiseerd overkomen tegenover klanten.
- Minder frustratie ervaren door vage of verspreide feedback.
- Vertrouwen hebben dat geen opmerking verloren gaat.
- AI gebruiken zonder de controle over klantwerk af te staan.
- Het gevoel verminderen dat elke reviewronde opnieuw vanaf nul moet worden geïnterpreteerd.

### Social Jobs

- Klanten een eenvoudige reviewervaring aanbieden.
- Intern aantonen dat AI de delivery verbetert in plaats van alleen code sneller te genereren.
- Als moderne agency sneller itereren zonder onzorgvuldig of onpersoonlijk te werken.

---

## Core Pain Points

1. **Verspreide feedback:** Opmerkingen staan in meerdere kanalen en verliezen hun context.
2. **Onduidelijke verwijzingen:** Tekst zoals "maak deze groter" vereist extra vragen of meetings.
3. **Handmatige omzetting:** De Owner herschrijft klanttaal naar tickets, taken of agentprompts.
4. **Dubbel en tegenstrijdig werk:** Verschillende Reviewers melden hetzelfde probleem of vragen incompatibele wijzigingen.
5. **Trage feedbackcycli:** Context verzamelen, uitvoeren, deployen en opnieuw delen kost meerdere overdrachten.
6. **Margeverlies:** Coördinatie en kleine revisies nemen meer tijd dan begroot of factureerbaar is.
7. **AI zonder betrouwbare context:** Coding agents kunnen snel code schrijven, maar hebben zonder concrete plaatsings- en projectcontext een grotere kans op de verkeerde wijziging.
8. **Gebrek aan gecontroleerde afsluiting:** Een uitgevoerde wijziging is niet hetzelfde als een door de klant beoordeelde en door de Owner goedgekeurde wijziging.

---

## Trigger Events

De kans op aankoop is het grootst wanneer een agency:

- een nieuw websiteproject naar klantreview brengt;
- meerdere klanten tegelijk in een revisiefase heeft;
- een project heeft waar feedback via veel kanalen ontspoort;
- meer revisierondes uitvoert dan begroot;
- net coding agents zoals Codex, Claude Code of Cursor invoert;
- een projectmanager of senior developer te veel tijd ziet verliezen aan kleine wijzigingen;
- een bestaande feedbacktool te duur, te breed of te los van development vindt;
- klanten niet wil verplichten een account bij een hostingplatform of projectmanagementtool te maken;
- privacy- of eigendomsredenen heeft om feedback zelf te hosten.

Een generieke wens om "meer AI te gebruiken" is geen sterke trigger. De trigger moet gekoppeld zijn aan een actief feedbackprobleem en een echt klantproject.

---

## Positioning

### Positioning Statement

Voor web agencies die klantfeedback op websites moeten omzetten in concrete wijzigingen, is Tack de feedback-to-fix-workflow die Reviewers rechtstreeks op de preview laat reageren en hun feedback omzet in reviewbare code. In tegenstelling tot losse visual feedback tools of algemene projectmanagementsoftware bewaart Tack de context van de feedback tot aan de code-review, terwijl de Owner controle houdt over merge en deploy.

### Short Version

> Turn client website feedback into reviewable code.

### Dutch Working Version

> Zet klantfeedback op websites om in reviewbare code.

### Category Framing

Tack bevindt zich tussen drie bestaande categorieen:

- visual website feedback;
- issue intake en triage;
- agent-assisted software delivery.

De positionering mag niet bij de eerste categorie stoppen. Pins zijn de invoer, niet het eindproduct. De onderscheidende productbelofte is dat de context van de Reviewer behouden blijft tot er een concrete, beoordeelbare wijziging bestaat.

### What Tack Is Not

Tack is niet:

- een algemeen projectmanagementsysteem;
- een roadmap- of product discovery-platform;
- een vervanging voor GitHub, GitLab, Linear of Jira;
- een autonome deploybot die klantfeedback ongecontroleerd naar productie brengt;
- een generieke survey- of NPS-tool;
- een breed proofingplatform voor elk mogelijk bestandstype;
- een volledig agency operating system voor CRM, offertes, planning en facturatie.

---

## Product Requirements Implied by the ICP

**Low-friction Review**

- R1. Reviewers moeten feedback kunnen geven zonder een Tack-account aan te maken.
- R2. Een Pin moet voldoende visuele en technische context verzamelen om verduidelijkingsvragen aantoonbaar te verminderen.
- R3. De reviewervaring moet werken op echte preview- en stagingomgevingen zonder een complexe installatie voor de Reviewer.

**Agency Workflow**

- R4. Een Owner moet meerdere gelijktijdige klantprojecten overzichtelijk kunnen beheren.
- R5. De workflow moet Pins van intake tot oplossing en heropening traceerbaar houden.
- R6. De agency moet feedback per project kunnen scheiden zonder elke Reviewer toegang tot het Dashboard te geven.
- R7. Tack moet voldoende professioneel en betrouwbaar zijn om rechtstreeks in een klantreview te gebruiken.

**Feedback to Work**

- R8. Tack moet gerelateerde feedback kunnen omzetten in een afgebakende Implementation Brief die de oorspronkelijke Pins traceerbaar houdt.
- R9. Een Owner moet de Implementation Brief en bijbehorende context kunnen controleren voordat een developer of agent ermee werkt.
- R10. De overdracht naar een coding agent moet de relevante pagina-, element-, screenshot- en conversatiecontext behouden.

**Controlled Delivery**

- R11. Een uitgevoerde wijziging moet als reviewbaar werk terugkomen en mag niet automatisch naar productie gaan.
- R12. De Owner moet de uiteindelijke merge- en deploybeslissing behouden.
- R13. Preview approval door een Reviewer mag nooit als productieautorisatie worden behandeld.

**Commercial Readiness**

- R14. De hosted versie moet een agency zonder self-hostingkennis door de eerste projectinstallatie en eerste Pin kunnen leiden.
- R15. Tack moet meten of een account echte projecten activeert, Pins verzamelt, Implementation Briefs gebruikt en reviewcycli voltooit.
- R16. Betaalde plannen moeten aansluiten op agencywaarde en mogen de Reviewer niet per seat belasten.
- R17. Self-hosting moet een geloofwaardige Core-workflow behouden zonder dat de hosted versie haar betaalde convenience en workflowwaarde verliest.

---

## Key Workflow

- F1. **Start a client review**
  - **Trigger:** Een website of wijziging is klaar voor beoordeling.
  - **Actors:** A2, A4
  - **Steps:** De Owner koppelt Tack aan de preview en deelt de reviewlink; de Reviewer opent de preview zonder Tack-account.
  - **Outcome:** De klant kan onmiddellijk contextuele feedback geven.
  - **Covered by:** R1, R3, R7, R14

- F2. **Collect and clarify feedback**
  - **Trigger:** De Reviewer ziet iets dat moet veranderen.
  - **Actors:** A2, A4
  - **Steps:** De Reviewer plaatst een Pin; Tack bewaart plaatsing en context; Owner en Reviewer kunnen antwoorden; de Owner trieert de Pin.
  - **Outcome:** De feedback is begrijpelijk en traceerbaar zonder verspreide communicatie.
  - **Covered by:** R2, R5, R6

- F3. **Turn feedback into work**
  - **Trigger:** Er zijn voldoende Pins om een wijziging af te bakenen.
  - **Actors:** A2, A3
  - **Steps:** Tack groepeert gerelateerde Pins en stelt een Implementation Brief op; de Owner beoordeelt de scope; de context wordt aan een developer of coding agent gegeven.
  - **Outcome:** De uitvoerder ontvangt een afgebakende taak met broncontext.
  - **Covered by:** R8, R9, R10

- F4. **Review the fix**
  - **Trigger:** De wijziging is uitgevoerd.
  - **Actors:** A2, A3, A4
  - **Steps:** De code wordt als reviewbaar werk aangeboden; de Owner beoordeelt de technische wijziging; de Reviewer bekijkt de preview; de Owner beslist over merge en deploy.
  - **Outcome:** Feedback wordt afgesloten met menselijke controle en aantoonbare review.
  - **Covered by:** R11, R12, R13

---

## Buying Committee and Objections

### Likely Buyer

De eerste aankoop wordt waarschijnlijk gedaan door een founder, agency owner, technical lead of delivery lead. De beste Champion is iemand die zowel toegang heeft tot klantprojecten als voldoende technische invloed heeft om de workflow te veranderen.

### Expected Objections

**"We gebruiken al e-mail, Slack of WhatsApp."** Tack moet aantonen dat het niet alleen communicatie centraliseert, maar plaatsingscontext bewaart en de handmatige omzetting naar uitvoerbaar werk vermindert.

**"Vercel, BugHerd, Marker.io of onze issue tracker doet dit al."** Tack moet winnen op de volledige feedback-to-fix-workflow, onafhankelijke deploymentkeuze, accountloze Reviewers en gecontroleerde agentoverdracht. Alleen een goedkopere pinwidget zijn is onvoldoende.

**"Onze klanten leren geen nieuwe tool."** De Reviewer-interface moet eenvoudiger zijn dan een mail met screenshots sturen. De agency draagt de configuratie; de Reviewer hoeft alleen de preview te openen en feedback te plaatsen.

**"AI kan klantfeedback verkeerd interpreteren."** AI-output blijft een voorstel. De Owner controleert Groups en Implementation Briefs voordat code wordt gewijzigd en beoordeelt het resultaat opnieuw voor merge.

**"We willen geen klantdata naar een externe dienst sturen."** Self-hosting en heldere datagrenzen kunnen dit bezwaar verminderen. De validatie moet uitwijzen hoeveel kopers hiervoor werkelijk willen betalen of operationele moeite willen dragen.

**"Dit is te duur voor enkele comments."** De prijs moet worden verbonden aan bespaarde agencytijd, minder herwerk en snellere afronding. Positionering als commenttool maakt deze objection sterker.

---

## Pricing Hypothesis

De eerste commerciële test moet eenvoudig blijven. Een geloofwaardige hypothese is een hosted plan rond EUR 49 per maand voor kleine agencies, met meerdere actieve projecten en onbeperkte Reviewers. Een hogere variant kan later teamfunctionaliteit, branding, meer automatisering of inbegrepen Ship-gebruik bevatten.

Belangrijke principes:

- Prijs per agencywaarde, niet per Reviewer.
- Vermijd een lage prijs die Tack als klein widgethulpmiddel positioneert.
- Laat de eerste pilots betalen, ook wanneer onboarding handmatig gebeurt.
- Gebruik korting alleen in ruil voor duidelijke feedback, meetbaar gebruik en toestemming om resultaten te documenteren.
- Beschouw EUR 39 tot EUR 99 als te testen bandbreedte, niet als definitieve prijsarchitectuur.
- Houd variabele AI- en Ship-kosten begrensd, maar toon klanten vooral workflowwaarde.

De prijs is pas gevalideerd wanneer agencies zonder uitzonderlijke founder-relatie betalen en na echt gebruik verlengen.

---

## Anti-ICP

De volgende klanten zijn geen prioriteit voor de eerste commerciële fase:

### Solo Freelancers with Occasional Projects

Freelancers kunnen sterke pijn ervaren, maar hebben vaak minder gelijktijdige projecten, lagere betalingsbereidheid en onregelmatiger gebruik. Ze kunnen nuttige gebruikers of OSS-adopters zijn zonder de primaire omzetmotor te vormen.

### Large Agencies and Enterprises

Grotere organisaties kunnen een hogere contractwaarde bieden, maar verwachten sneller SSO, rollen, auditlogs, compliance, integraties, SLA's, onboarding en procurementondersteuning. Die vereisten vertragen validatie van de kernworkflow.

### Internal Product Teams

Productteams hebben feedback- en deliveryproblemen, maar werken vaker met bestaande issue trackers, product discovery-systemen, QA-processen en hosting-native reviewtools. Tack kan later relevant worden, maar de koopcontext en productvereisten verschillen van klantwerk bij agencies.

### Non-Technical Creative Agencies

Agencies die vooral video, drukwerk, branding of statische content beoordelen, zoeken een breed proofingplatform. Tack moet niet concurreren op ondersteuning voor elk bestandstype wanneer de kernwaarde codewijzigingen aan websites is.

### Teams Seeking Autonomous Production Changes

Organisaties die willen dat elke klantopmerking automatisch naar productie gaat passen niet bij Tack's controlemomenten. Tack ondersteunt versnelling met menselijke verantwoordelijkheid, niet onbeperkte autonomie.

---

## Adjacent Segments

### Freelancers

Een self-serve of gratis instaplaag kan freelancers aantrekken en distributie opleveren. Dit segment wordt commercieel interessanter wanneer projecten terugkerend zijn, de freelancer onderhoudscontracten verkoopt of reviewtijd een duidelijke margedruk vormt.

### Mid-Market Agencies

Agencies met 15 tot 50 medewerkers zijn een logische uitbreidingsmarkt wanneer Tack samenwerking, rollen, projectportefeuilles, branding en integraties betrouwbaar ondersteunt. De kernworkflow kan gelijk blijven terwijl de organisatorische vereisten groeien.

### Product and SaaS Teams

Deze teams worden interessanter wanneer Tack goed integreert met bestaande issue trackers en preview deployments. Hun primaire behoefte kan verschuiven van klantapproval naar QA, bug reproduction en product intake.

### Regulated or Privacy-Sensitive Teams

Self-hosting kan een aparte niche openen. Dit segment is alleen aantrekkelijk wanneer privacy werkelijk koopgedrag veroorzaakt en de supportlast van self-hosting beheersbaar blijft.

---

## Validation Plan

### Objective

Valideren dat de voorgestelde agencies het probleem vaak genoeg ervaren, Tack op echte klantprojecten gebruiken en voor de volledige feedback-to-fix-workflow willen betalen.

### Recruitment

- Rekruteer tien agencies die grotendeels aan de Initial ICP voldoen.
- Vermijd een cohort dat uitsluitend uit vrienden of gratis gebruikers bestaat.
- Zorg voor variatie in stack en type website, maar houd agencygrootte en workflow vergelijkbaar.
- Vereis minstens een actief klantproject dat binnen vier weken een reviewronde ingaat.
- Noteer vooraf de huidige feedbackkanalen, gemiddelde reviewduur en geschatte verwerkingstijd.

### Offer

- Bied een concierge hosted beta aan voor ongeveer EUR 49 per maand.
- Help persoonlijk met installatie en het eerste project.
- Laat de Core-workflow volledig bruikbaar zijn, ook als delen van feedback-to-fix handmatig worden begeleid.
- Presenteer conciergewerk niet als ontbrekende automatisering, maar gebruik het om te leren welke stappen herhaalbaar productwerk verdienen.

### Required Evidence

- V1. Minstens vijf van de tien gerekruteerde agencies betalen voor de pilot.
- V2. Minstens vier betalende agencies voltooien een echte reviewcyclus met een externe Reviewer.
- V3. Minstens vier betalende agencies gebruiken Tack opnieuw op een tweede reviewronde of project.
- V4. Minstens drie agencies verlengen tot en met de derde betaalmaand.
- V5. Gebruikers rapporteren en demonstreren minstens 30% minder tijd voor feedbackverwerking of minstens 30% kortere reviewdoorlooptijd.
- V6. Minstens drie agencies gebruiken een Implementation Brief daadwerkelijk als input voor een developer of coding agent.
- V7. Minstens twee agencies vragen uit eigen beweging om een manier om de wijziging rechtstreeks als reviewbaar codewerk terug te krijgen.

V7 valideert de richting van Ship beter dan een hypothetische vraag tijdens een interview. Spontane vraag, workaroundgedrag en bereidheid om ervoor te betalen wegen zwaarder dan uitgesproken interesse.

### Failure Signals

De ICP- of productthese moet worden herzien wanneer:

- agencies het probleem herkennen maar niet willen betalen;
- Reviewers de widget vermijden en blijven mailen of chatten;
- Tack alleen bij de eerste review wordt gebruikt en daarna wordt verlaten;
- Owners Pins nuttig vinden maar Implementation Briefs niet gebruiken;
- agencies vooral vragen om generieke projectmanagement- of proofingfeatures;
- installatie en support meer tijd kosten dan de abonnementswaarde kan dragen;
- tijdswinst alleen ontstaat door intensief conciergewerk dat niet productiseerbaar is;
- de grootste betalingsbereidheid consequent uit een ander segment komt.

---

## Discovery Questions

Gesprekken moeten gedrag uit het recente verleden onderzoeken, niet alleen meningen over Tack.

1. Vertel over de laatste website-review die meer tijd kostte dan verwacht.
2. Via welke kanalen kwam de feedback binnen en wie verwerkte ze?
3. Hoe werd duidelijk over welk element of welke pagina een opmerking ging?
4. Welke feedback vereiste een extra bericht, call of screenshot?
5. Hoe werden opmerkingen omgezet in werk voor een developer?
6. Hoeveel tijd besteedde het team aan verzamelen, verduidelijken en herschrijven?
7. Welke bestaande tool is geprobeerd en waarom bleef de huidige workaround bestaan?
8. Welke delen van revisiewerk worden niet of moeilijk gefactureerd?
9. Waarvoor gebruikt het team vandaag coding agents op klantprojecten?
10. Wie zou een tool zoals Tack kunnen aankopen en welk budget kan die persoon zelfstandig goedkeuren?
11. Wat zou moeten gebeuren voordat Tack op een echte klantreview wordt vertrouwd?
12. Welke meetbare uitkomst zou een abonnement na drie maanden rechtvaardigen?

Vragen zoals "Zou je dit gebruiken?" of "Vind je dit een goed idee?" leveren zwak bewijs en moeten niet als validatie worden behandeld.

---

## Success Criteria

De start-ICP is voldoende bevestigd voor verdere investering wanneer:

- het betaal- en verlengingsgedrag de Required Evidence haalt;
- de meeste succesvolle klanten herkenbaar binnen hetzelfde segment vallen;
- de primaire waarde wordt beschreven als minder feedbackvertaling en snellere reviewcycli;
- Tack meermaals op echte klantprojecten wordt gebruikt;
- Owners Implementation Briefs als nuttige brug naar development behandelen;
- vraag naar reviewbare code ontstaat zonder dat die uitkomst zwaar wordt voorgezegd;
- acquisitie en onboarding zonder onhoudbaar veel founderwerk herhaalbaar beginnen te worden.

Een succesvolle open-sourcelancering, veel sterren, interviewenthousiasme of veel gratis accounts is ondersteunend bewijs, maar vervangt deze commerciële criteria niet.

---

## Scope Boundaries

### Deferred for Later

- Definitieve prijsplannen en usage-based Ship-pricing.
- Teamrollen, geavanceerde permissions en agencyportfoliorapportage.
- White-labeling en custom domains.
- SSO, auditlogs, SLA's en enterprise procurement.
- Diepe tweerichtingsintegraties met alle issue trackers.
- Volledig geautomatiseerde Git preview workspaces en pull requests.
- Uitbreiding naar productteams, enterprise QA en gereguleerde organisaties.

### Outside This Product's Identity

- Automatisch mergen of deployen op basis van Reviewer-feedback.
- Een algemene vervanging voor issue trackers of projectmanagement.
- CRM, offertes, urenregistratie, facturatie en resourceplanning voor agencies.
- Brede customer research, surveys, NPS en roadmapmanagement.
- Proofing van elk creatief bestandstype als primaire productbelofte.
- AI-autonomie zonder expliciete Owner-controle.

---

## Dependencies and Assumptions

- D1. Kleine web agencies ervaren feedbackverwerking vaak genoeg om een terugkerend abonnement te rechtvaardigen.
- D2. De persoon met de pijn heeft voldoende invloed om Tack op een klantproject te introduceren.
- D3. Accountloze Reviewer-toegang verlaagt adoptiefrictie voldoende om gedrag te veranderen.
- D4. De combinatie van plaatsingscontext en Implementation Briefs bespaart meer tijd dan alleen een betere inbox.
- D5. Coding agents worden normaal genoeg in agencyworkflows om feedback-to-fix een duurzame differentiator te maken.
- D6. Menselijke review blijft belangrijk, ook wanneer agents betrouwbaarder worden.
- D7. Een hosted aanbod kan genoeg gemak leveren om naast de volledige OSS Core te bestaan.
- D8. De supportlast van installatie op diverse previewomgevingen blijft economisch beheersbaar.

Deze aannames moeten worden bijgewerkt op basis van gemeten gedrag. Vooral D4, D5 en D7 zijn bepalend voor de commerciële vorm van het product.

---

## Outstanding Questions

### Resolve Before Commercial Launch

- Is de beste eerste subniche een development agency, design-and-development agency, Webflow agency, WordPress agency of een bredere mix?
- Wie voelt de sterkste pijn en koopt het snelst: founder, projectmanager, technical lead of developer?
- Is EUR 49 per maand hoog genoeg om support en hosted operations te dragen zonder Tack als klein hulpmiddel te positioneren?
- Is installatie via script, bookmarklet of extension betrouwbaar en eenvoudig genoeg voor het gekozen segment?
- Welke stap levert de meeste aantoonbare waarde: betere intake, AI-triage, agentoverdracht of de reviewbare code-uitkomst?

### Resolve Through Pilots

- Hoeveel projecten en Reviewers gebruikt een typische betalende agency per maand?
- Welke feedbackkanalen worden werkelijk vervangen en welke blijven naast Tack bestaan?
- Hoe vaak zijn Groups en Implementation Briefs nodig bij kleine aantallen Pins?
- Willen agencies Ship als inbegrepen workflow, add-on of usage-based dienst betalen?
- Is self-hosting een koopreden, een vertrouwenwekkend signaal of vooral een gratis alternatief?
- Welke integratie wordt vaak genoeg gevraagd om onderdeel van de eerste commerciële scope te maken?

---

## Sources and Product Context

- `CONTEXT.md` definieert de bestaande productlagen, actoren en controlegrenzen van Tack.
- `README.md` beschrijft de huidige self-hosted Core en optionele AI Inbox.
- `docs/plans/2026-06-01-001-feat-core-v1-launch-hardening-plan.md` legt vast dat Core eerst een geloofwaardige end-to-end feedbackloop moet zijn.
- `docs/adr/0003-ship-edits-git-not-production.md` bevestigt dat Ship Git wijzigt en nooit rechtstreeks productie aanpast.
- `apps/web/src/db/schema.ts` toont dat huidige accounts en Projects nog rond een individuele Owner zijn gemodelleerd, zonder volledige agencyworkspace of billinglaag.
- `apps/web/src/lib/agent-prompt.ts` bevat de bestaande overdracht van een Group en Pins naar een coding agent.

External market snapshot, checked on 2026-06-14:

- [BugHerd pricing](https://bugherd.com/pricing) demonstrates paid demand from freelancers, agencies and teams for website feedback, with unlimited client users and projects in its entry offer.
- [Marker.io pricing](https://marker.io/pricing) positions visual feedback and UAT as paid workflows for agencies and web teams, starting with a limited number of active projects.
- [Pastel pricing](https://usepastel.com/plans) shows a lower-priced entry point for website review and a larger team tier for agencies with unlimited active canvases.
- [Vercel Comments](https://vercel.com/docs/comments) shows that preview commenting alone is increasingly bundled into hosting platforms, which weakens Pins as a standalone differentiator.
- [BugHerd MCP](https://bugherd.com/feature/mcp), [Marker.io MCP](https://marker.io/marker-mcp) and [Userback MCP](https://userback.io/feature/mcp-integration/) show that connecting feedback to coding agents is becoming a competitive baseline. Tack therefore needs to win on the controlled end-to-end feedback-to-fix workflow rather than generic AI access.

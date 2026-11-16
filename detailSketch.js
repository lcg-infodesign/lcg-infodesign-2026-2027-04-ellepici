// PAGINA DI DETTAGLIO
// legge dall'URL quale riga del dataset mostrare (es. detail.html?row=12)
// e disegna il glifo di quella carestia in grande, con i valori esatti accanto

// variabile in cui salvo i dati del CSV
let data;

// numero della riga selezionata, letto dall'URL
let selectedRow;

// valori massimi del dataset: servono per usare le stesse scale della pagina di insieme
let maxMortality = 0;
let maxDuration = 0;
// riga della carestia con più morti (mi serve per la nota sotto il glifo)
let maxRow = 0;

// margine sinistro della pagina
let margin;

// diventa true quando il mouse è sopra il link per tornare indietro
let overBackLink = false;

async function setup() {
  // l'altezza minima è 820 pixel, altrimenti nelle finestre basse il glifo viene tagliato
  createCanvas(windowWidth, max(windowHeight, 820));

  // carico i dati
  data = await loadTable("assets/famines.csv", ",", "header");

  // legge i parametri passati nell'URL (es. ?row=12)
  let params = getURLParams();

  // salvo il numero della riga selezionata (int lo trasforma da testo a numero)
  selectedRow = int(params.row);

  // cerco i valori massimi, come nella pagina di insieme
  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    let duration = data.getNum(rowNumber, "duration");
    let upper = data.getNum(rowNumber, "Excess Mortality upper");

    if (upper > maxMortality) {
      maxMortality = upper;
      maxRow = rowNumber;
    }
    if (duration > maxDuration) {
      maxDuration = duration;
    }
  }
}

function draw() {
  background(backgroundColor);
  textFont(fontName);

  // stesso margine della pagina di insieme
  let contentWidth = min(width - 64, 1116);
  margin = (width - contentWidth) / 2;

  drawBackLink();

  // se nell'URL manca il parametro, o il numero non corrisponde a nessuna riga,
  // scrivo un messaggio e non disegno altro
  if (isNaN(selectedRow) || selectedRow < 0 || selectedRow >= data.getRowCount()) {
    noStroke();
    fill(textColor);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(44);
    text("Carestia non trovata", margin, 80);
    textStyle(NORMAL);
    textSize(17);
    text("Torna a tutte le carestie e scegli un glifo.", margin, 145);
    return;
  }

  // leggo i dati della riga selezionata
  let country = data.getString(selectedRow, "Country");
  let continent = data.getString(selectedRow, "continent");
  let start = data.getNum(selectedRow, "start");
  let end = data.getNum(selectedRow, "end");
  let duration = data.getNum(selectedRow, "duration");
  let mid = data.getNum(selectedRow, "Excess Mortality midpoint");
  // in due righe la stima minima non c'è (nel CSV c'è scritto "-") e getNum darebbe errore:
  // la leggo come testo e la converto con float(), che in quel caso restituisce NaN
  let lower = float(data.getString(selectedRow, "Excess Mortality lower"));
  let upper = data.getNum(selectedRow, "Excess Mortality upper");

  let glyphColor = getContinentColor(continent);
  let years = getYears(start, end);

  // TITOLO: il nome della carestia
  noStroke();
  fill(textColor);
  textAlign(LEFT, TOP);
  textStyle(BOLD);

  // alcuni nomi sono molto lunghi: rimpicciolisco il titolo finché non sta nella pagina
  let titleSize = 44;
  textSize(titleSize);
  while (textWidth(country) > contentWidth) {
    titleSize -= 2;
    textSize(titleSize);
  }
  text(country, margin, 80);

  // SOTTOTITOLO: pallino colorato, continente e anni
  fill(glyphColor);
  circle(margin + 5, 148, 10);
  fill(textColor);
  textStyle(NORMAL);
  textSize(17);
  text(getContinentName(continent) + " · " + years, margin + 16, 137);

  // FRASE INTRODUTTIVA
  let sentence = "";
  if (start == end) {
    sentence = "Nel " + start;
  } else {
    sentence = "Tra il " + start + " e il " + end;
  }
  sentence += " questa carestia ha causato circa " + formatNumber(mid);
  // in italiano si dice "1.000.000 di morti" ma "961.043 morti"
  if (mid % 1000000 == 0) {
    sentence += " di morti";
  } else {
    sentence += " morti";
  }
  // le stime minima e massima le scrivo solo se sono diverse dalla stima centrale
  if (isNaN(lower)) {
    sentence += ": le stime più alte arrivano a " + formatNumber(upper) + ".";
  } else if (lower != upper) {
    sentence += ": le stime vanno da " + formatNumber(lower) + " a " + formatNumber(upper) + ".";
  } else {
    sentence += ".";
  }
  textLeading(24);
  text(sentence, margin, 169, min(700, contentWidth));

  // GLIFO
  // il raggio dipende dalla larghezza della finestra, ma resta tra 130 e 200 pixel
  let maxRadius = constrain(width * 0.19, 130, 200);
  // raggio esterno del glifo, tacche comprese
  let outerRadius = getTicksRadius(maxRadius) + getTicksWeight(maxRadius) / 2;
  let centerX = margin + outerRadius + 44;
  let centerY = 263 + outerRadius;

  let midRadius = mortalityToRadius(mid, maxMortality, maxRadius);
  let upperRadius = mortalityToRadius(upper, maxMortality, maxRadius);

  // anelli grigi di riferimento: fanno vedere quanto sarebbe grande un cerchio
  // da 1 milione, da 10 milioni e quello massimo
  let references = [1000000, 10000000, maxMortality];
  // le etichette degli anelli stanno in alto a sinistra (225 gradi)
  let labelAngle = radians(225);

  textSize(11);
  textAlign(RIGHT, BOTTOM);
  for (let i = 0; i < references.length; i++) {
    let radius = mortalityToRadius(references[i], maxMortality, maxRadius);

    noFill();
    stroke(grayColor);
    strokeWeight(1);
    circle(centerX, centerY, radius * 2);

    // l'etichetta dell'anello più grande la sposto fuori dalle tacche
    let labelRadius = radius + 3;
    if (i == 2) {
      labelRadius = outerRadius + 5;
    }

    // scrivo l'etichetta solo se l'anello non è coperto dal cerchio della carestia
    if (radius > upperRadius + 14) {
      noStroke();
      fill(textColor);
      text(round(references[i] / 1000000) + " mln", centerX + cos(labelAngle) * labelRadius, centerY + sin(labelAngle) * labelRadius);
    }
  }

  // il glifo è disegnato dalla stessa funzione usata nella pagina di insieme
  drawGlyph(centerX, centerY, maxRadius, mid, lower, upper, duration, glyphColor, maxMortality, maxDuration);

  // nota sotto il glifo
  let maxCountry = data.getString(maxRow, "Country");
  let maxYears = getYears(data.getNum(maxRow, "start"), data.getNum(maxRow, "end"));
  noStroke();
  fill(textColor);
  textSize(12);
  textAlign(CENTER, TOP);
  textLeading(16);
  text(
    "Anelli grigi: la scala delle aree. Il più esterno, sul bordo delle tacche, vale " +
    round(maxMortality / 1000000) + " mln: la stima più alta del dataset (" + maxCountry + ", " + maxYears + ").",
    centerX - outerRadius - 30, centerY + outerRadius + 22, outerRadius * 2 + 60
  );

  // ANNOTAZIONI a destra del glifo: spiegano ogni parte e riportano il valore esatto
  let labelX = centerX + outerRadius + 84;
  let labelY = centerY - 144;

  // --- Durata ---
  let durationText = duration + " anni";
  if (duration == 1) {
    durationText = "1 anno";
  }
  // la linea parte dal centro della prima tacca (che è sempre colorata)
  let tickAngle = -HALF_PI + TWO_PI / maxDuration / 2;
  let ticksRadius = getTicksRadius(maxRadius);
  drawLabelLine(centerX + cos(tickAngle) * ticksRadius, centerY + sin(tickAngle) * ticksRadius, labelX, labelY + 31, true);
  drawAnnotation(
    "DURATA · TACCHE PIENE",
    durationText,
    "Ogni tacca è un anno (" + years + "). Le tacche sono " + maxDuration + ", come gli anni della carestia più lunga del dataset.",
    labelX, labelY
  );

  // --- Morti stimati ---
  // calcolo la posizione in classifica: conto quante carestie hanno più morti di questa
  let rank = 1;
  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    if (data.getNum(rowNumber, "Excess Mortality midpoint") > mid) {
      rank++;
    }
  }

  labelY += 106;
  if (midRadius > 12) {
    // la linea parte da un punto dentro il cerchio
    drawLabelLine(centerX + midRadius * 0.45, centerY - midRadius * 0.25, labelX, labelY + 31, true);
  } else {
    // se il cerchio è molto piccolo il pallino lo coprirebbe: la linea si ferma appena fuori
    drawLabelLine(centerX + upperRadius + 4, centerY - 2, labelX, labelY + 31, false);
  }
  drawAnnotation(
    "MORTI STIMATI · CERCHIO PIENO",
    formatNumber(mid),
    "Stima centrale della mortalità in eccesso: l'area del cerchio è proporzionale. Per numero di morti è al " +
    rank + "º posto su " + data.getRowCount() + " carestie.",
    labelX, labelY
  );

  // --- Incertezza ---
  // ci sono tre casi: stima unica, stima minima mancante, oppure minima e massima
  let rangeValue = "";
  let rangeNote = "";
  if (isNaN(lower)) {
    rangeValue = "fino a " + formatNumber(upper);
    rangeNote = "L'alone chiaro arriva alla stima massima. La stima minima non è disponibile nel dataset.";
  } else if (lower == upper) {
    rangeValue = "Stima unica";
    rangeNote = "Le fonti riportano un solo valore: per questo il glifo non ha né alone né anello interno.";
  } else {
    rangeValue = formatNumber(lower) + " – " + formatNumber(upper);
    rangeNote = "L'alone chiaro arriva alla stima massima; l'anello sottile dentro il cerchio segna la minima.";
  }

  labelY += 106;
  // la linea verso l'alone la disegno solo se l'alone è abbastanza grande da essere indicato
  if (midRadius > 12 && upperRadius - midRadius > 3) {
    let haloRadius = (midRadius + upperRadius) / 2;
    drawLabelLine(centerX + haloRadius * 0.96, centerY + haloRadius * 0.28, labelX, labelY + 31, true);
  }
  drawAnnotation("INCERTEZZA · ALONE E ANELLO", rangeValue, rangeNote, labelX, labelY);
}

// scrive un'annotazione: etichetta piccola, valore grande e spiegazione
function drawAnnotation(label, value, note, x, y) {
  noStroke();
  fill(textColor);
  textAlign(LEFT, TOP);

  textStyle(BOLD);
  textSize(11);
  text(label, x, y);

  textSize(23);
  text(value, x, y + 18);

  textStyle(NORMAL);
  textSize(13);
  textLeading(18);
  // la spiegazione va a capo dopo 430 pixel, o prima se la finestra è stretta
  text(note, x, y + 50, min(430, width - x - 20));
}

// link in alto a sinistra per tornare alla pagina di insieme
// è un testo disegnato nel canvas, quindi controllo io se il mouse è sopra
function drawBackLink() {
  let label = "← Tutte le carestie";

  noStroke();
  fill(textColor);
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  textSize(14);
  text(label, margin, 32);

  let labelWidth = textWidth(label);
  if (mouseX >= margin && mouseX <= margin + labelWidth && mouseY >= 24 && mouseY <= 58) {
    overBackLink = true;
    cursor(HAND);
    // sottolineo il link quando il mouse è sopra
    stroke(textColor);
    strokeWeight(1);
    line(margin, 52, margin + labelWidth, 52);
  } else {
    overBackLink = false;
    cursor(ARROW);
  }
}

function mousePressed() {
  // clic sul link: torno alla pagina di insieme
  if (overBackLink) {
    window.location.href = "index.html";
  }
}

function windowResized() {
  resizeCanvas(windowWidth, max(windowHeight, 820));
}

// PAGINA DI INSIEME
// disegna il titolo, la legenda e una griglia con un glifo per ogni carestia
// cliccando su un glifo si apre la pagina di dettaglio di quella carestia

// variabili condivise: i valori letti qui possono essere usati da più funzioni
let data;
let maxMortality = 0;
let maxDuration = 0;
let totalMortality = 0;
let minYear = 3000;
let maxYear = 0;

// misure della pagina (calcolate in calculateLayout)
let margin;
let contentWidth;
let columns;
let cellWidth;
let cellHeight = 172;

// raggio che avrebbe il cerchio più grande nella griglia
let glyphRadius = 38;

// posizione verticale della legenda e della griglia
let legendY = 200;
let legendHeight = 245;
let gridY = 470;

// riga del dataset su cui si trova il mouse (-1 = nessuna)
let hoveredRow = -1;

// in p5.js 2, setup() può attendere il caricamento dei dati con async/await
async function setup() {
  createCanvas(windowWidth, windowHeight);

  // "header" usa la prima riga come nomi delle colonne
  data = await loadTable("assets/famines.csv", ",", "header");

  // visito tutte le righe per trovare i valori massimi, che servono per le scale
  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    let duration = data.getNum(rowNumber, "duration");
    let mid = data.getNum(rowNumber, "Excess Mortality midpoint");
    let upper = data.getNum(rowNumber, "Excess Mortality upper");
    let start = data.getNum(rowNumber, "start");
    let end = data.getNum(rowNumber, "end");

    // per la scala dei cerchi uso la stima massima, così anche l'alone sta dentro le tacche
    if (upper > maxMortality) {
      maxMortality = upper;
    }
    if (duration > maxDuration) {
      maxDuration = duration;
    }
    if (start < minYear) {
      minYear = start;
    }
    if (end > maxYear) {
      maxYear = end;
    }

    totalMortality += mid;
  }

  calculateLayout();
}

// calcola quante colonne stanno nella finestra e quanto deve essere alto il canvas
function calculateLayout() {
  // il contenuto è largo al massimo 1116 pixel ed è centrato
  contentWidth = min(windowWidth - 64, 1116);
  margin = (windowWidth - contentWidth) / 2;

  // ogni cella deve essere larga almeno 130 pixel
  columns = floor(contentWidth / 130);
  cellWidth = contentWidth / columns;

  // il canvas deve essere alto abbastanza per contenere tutte le righe della griglia
  let rows = ceil(data.getRowCount() / columns);
  resizeCanvas(windowWidth, gridY + rows * cellHeight + 30);
}

function draw() {
  background(backgroundColor);
  textFont(fontName);

  // TITOLO
  noStroke();
  fill(textColor);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(44);
  text("Un secolo e mezzo di carestie", margin, 40);

  // TESTO INTRODUTTIVO (il quarto parametro di text() manda a capo il testo)
  let intro =
    data.getRowCount() + " carestie tra il " + minYear + " e il " + maxYear + ", circa " +
    round(totalMortality / 1000000) + " mln di morti stimati in tutto. " +
    "Ogni glifo è una carestia e mostra quante persone sono morte, quanto è durata e in quale continente. " +
    "Clicca un glifo per aprire la sua pagina di dettaglio.";
  textStyle(NORMAL);
  textSize(17);
  textLeading(24);
  text(intro, margin, 101, min(700, contentWidth));

  drawLegend();

  // GRIGLIA DEI GLIFI
  // riparte da "nessun glifo sotto il mouse" a ogni fotogramma
  hoveredRow = -1;

  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    let country = data.getString(rowNumber, "Country");
    let continent = data.getString(rowNumber, "continent");
    let start = data.getNum(rowNumber, "start");
    let end = data.getNum(rowNumber, "end");
    let duration = data.getNum(rowNumber, "duration");
    let mid = data.getNum(rowNumber, "Excess Mortality midpoint");
    // in due righe la stima minima non c'è (nel CSV c'è scritto "-") e getNum darebbe errore:
    // la leggo come testo e la converto con float(), che in quel caso restituisce NaN
    let lower = float(data.getString(rowNumber, "Excess Mortality lower"));
    let upper = data.getNum(rowNumber, "Excess Mortality upper");

    // posizione della cella: il resto della divisione dà la colonna, il quoziente la riga
    let column = rowNumber % columns;
    let row = floor(rowNumber / columns);
    let cellX = margin + column * cellWidth;
    let cellY = gridY + row * cellHeight;
    let centerX = cellX + cellWidth / 2;
    let centerY = cellY + 56;

    // verifica se il mouse è dentro questa cella
    if (mouseX >= cellX && mouseX < cellX + cellWidth && mouseY >= cellY && mouseY < cellY + cellHeight) {
      hoveredRow = rowNumber;
      // sfondo grigio chiaro per far capire quale glifo si sta per cliccare
      noStroke();
      fill(panelColor);
      rect(cellX + 3, cellY + 2, cellWidth - 6, cellHeight - 6, 10);
    }

    drawGlyph(centerX, centerY, glyphRadius, mid, lower, upper, duration, getContinentColor(continent), maxMortality, maxDuration);

    // alcuni paesi hanno una zona tra parentesi, es. "China (Henan)":
    // separo il nome dalla zona per scriverli su due righe
    let name = country;
    let region = "";
    if (country.includes(" (")) {
      let parts = country.split(" (");
      name = parts[0];
      region = parts[1].replace(")", "");
    }

    // ETICHETTE sotto il glifo
    noStroke();
    fill(textColor);
    textAlign(CENTER, TOP);
    let labelY = cellY + 110;

    textStyle(BOLD);
    textSize(12.5);
    text(shortenText(name, cellWidth - 14), centerX, labelY);
    labelY += 17;

    textStyle(NORMAL);
    textSize(11.5);
    if (region != "") {
      text(shortenText(region, cellWidth - 14), centerX, labelY);
      labelY += 15;
    }
    text(getYears(start, end), centerX, labelY);
  }

  // se il mouse è sopra un glifo cambio il cursore e mostro il riquadro con i dati
  if (hoveredRow >= 0) {
    cursor(HAND);
    drawTooltip(hoveredRow);
  } else {
    cursor(ARROW);
  }
}

// se un testo è più largo di maxWidth lo accorcia e aggiunge i puntini
function shortenText(label, maxWidth) {
  if (textWidth(label) <= maxWidth) {
    return label;
  }
  // tolgo una lettera alla volta finché non ci sta
  while (textWidth(label + "…") > maxWidth) {
    label = label.substring(0, label.length - 1);
  }
  return label + "…";
}

// conta quante carestie ci sono in un continente
function countContinent(continent) {
  let count = 0;
  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    if (data.getString(rowNumber, "continent") == continent) {
      count++;
    }
  }
  return count;
}

// LEGENDA: spiega come si legge il glifo
function drawLegend() {
  // riquadro grigio chiaro
  noStroke();
  fill(panelColor);
  rect(margin, legendY, contentWidth, legendHeight, 12);

  // --- 1. Le parti del glifo ---
  let x = margin + 24;
  let y = legendY + 24;

  fill(textColor);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(11);
  text("COME SI LEGGE UN GLIFO", x, y);

  // glifo di esempio: i valori sono inventati, li ho scelti in modo che
  // si vedano bene tutte le parti (alone, anello interno, tacche piene e vuote)
  let sampleX = x + 62;
  let sampleY = y + 94;
  drawGlyph(sampleX, sampleY, 52, maxMortality * 0.36, maxMortality * 0.15, maxMortality * 0.66, 9, "#6b6b6b", maxMortality, maxDuration);

  // etichette collegate alle parti del glifo
  // le posizioni dei punti le ho trovate facendo delle prove
  let labelX = sampleX + 110;

  drawLabelLine(sampleX + 12, sampleY - 23, labelX, y + 42, true);
  drawLegendLabel("Cerchio pieno", "morti stimati, stima centrale", labelX, y + 34);

  drawLabelLine(sampleX + 36, sampleY - 5, labelX, y + 82, true);
  drawLegendLabel("Alone chiaro", "fino alla stima massima", labelX, y + 74);

  drawLabelLine(sampleX + 16, sampleY + 12, labelX, y + 122, true);
  drawLegendLabel("Anello interno", "stima minima", labelX, y + 114);

  drawLabelLine(sampleX + 24, sampleY + 53, labelX, y + 162, true);
  drawLegendLabel("Tacche piene", "durata: 1 tacca = 1 anno", labelX, y + 154);

  // --- 2. La dimensione dei cerchi ---
  x = margin + contentWidth * 0.5;

  textStyle(BOLD);
  textSize(11);
  text("DIMENSIONE = MORTI STIMATI", x, y);

  // tre cerchi di riferimento, grandi come quelli della griglia e appoggiati sulla stessa base
  let references = [maxMortality, 10000000, 1000000];
  let baseY = y + 34 + glyphRadius * 2;

  textStyle(NORMAL);
  textSize(12);
  for (let i = 0; i < references.length; i++) {
    let radius = mortalityToRadius(references[i], maxMortality, glyphRadius);
    let topY = baseY - radius * 2;

    noFill();
    stroke(textColor);
    strokeWeight(1);
    circle(x + 39, baseY - radius, radius * 2);
    line(x + 39, topY, x + 96, topY);

    let label = round(references[i] / 1000000) + " mln";
    if (i == 0) {
      label += " · il massimo";
    }
    noStroke();
    fill(textColor);
    textAlign(LEFT, CENTER);
    text(label, x + 102, topY);
  }

  textAlign(LEFT, TOP);
  textLeading(16);
  text(
    "L'area è proporzionale ai morti. La scala è la stessa per tutti i glifi: il cerchio più grande toccherebbe le tacche.",
    x, baseY + 14, contentWidth * 0.25
  );

  // --- 3. I colori dei continenti ---
  x = margin + contentWidth * 0.8;

  textStyle(BOLD);
  textSize(11);
  text("COLORE = CONTINENTE", x, y);

  let continents = ["africa", "asia", "europe", "america"];
  textStyle(NORMAL);
  textSize(13);
  textAlign(LEFT, CENTER);
  for (let i = 0; i < continents.length; i++) {
    let rowY = y + 44 + i * 24;
    fill(getContinentColor(continents[i]));
    circle(x + 6, rowY, 12);
    fill(textColor);
    // accanto al nome scrivo quante carestie ci sono in quel continente
    text(getContinentName(continents[i]) + "  " + countContinent(continents[i]), x + 20, rowY);
  }
}

// scrive il nome di una parte del glifo (in grassetto) e sotto che cosa rappresenta
function drawLegendLabel(title, description, x, y) {
  noStroke();
  fill(textColor);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(12.5);
  text(title, x, y);
  textStyle(NORMAL);
  textSize(12);
  text(description, x, y + 16);
}

// riquadro con i dati esatti della carestia, disegnato vicino al mouse
function drawTooltip(rowNumber) {
  let country = data.getString(rowNumber, "Country");
  let continent = data.getString(rowNumber, "continent");
  let start = data.getNum(rowNumber, "start");
  let end = data.getNum(rowNumber, "end");
  let duration = data.getNum(rowNumber, "duration");
  let mid = data.getNum(rowNumber, "Excess Mortality midpoint");
  // come nella griglia: la stima minima può essere "-", quindi non uso getNum
  let lower = float(data.getString(rowNumber, "Excess Mortality lower"));
  let upper = data.getNum(rowNumber, "Excess Mortality upper");

  // "1 anno" al singolare, "3 anni" al plurale
  let durationText = duration + " anni";
  if (duration == 1) {
    durationText = "1 anno";
  }

  // l'intervallo delle stime lo scrivo solo se minima e massima sono diverse
  // in due righe la stima minima manca ("-"): in quel caso scrivo solo la massima
  let rangeText = "";
  if (isNaN(lower)) {
    rangeText = "fino a " + formatNumber(upper);
  } else if (lower != upper) {
    rangeText = "tra " + formatNumber(lower) + " e " + formatNumber(upper);
  }

  textStyle(BOLD);
  textSize(13);

  // il riquadro si allarga se il nome del paese è molto lungo
  let boxWidth = max(250, textWidth(country) + 24);
  let boxHeight = 95;
  if (rangeText != "") {
    boxHeight = 112;
  }

  // posizione: in basso a destra del mouse, ma se esce dal canvas lo sposto dall'altra parte
  let x = mouseX + 16;
  let y = mouseY + 18;
  if (x + boxWidth > width) {
    x = mouseX - boxWidth - 16;
  }
  if (y + boxHeight > height) {
    y = mouseY - boxHeight - 14;
  }

  stroke(textColor);
  strokeWeight(1);
  fill(backgroundColor);
  rect(x, y, boxWidth, boxHeight, 6);

  noStroke();
  fill(textColor);
  textAlign(LEFT, TOP);
  text(country, x + 12, y + 10);

  // pallino con il colore del continente
  fill(getContinentColor(continent));
  circle(x + 17, y + 40, 10);

  fill(textColor);
  textStyle(NORMAL);
  textSize(12);
  text(getContinentName(continent), x + 28, y + 33);
  text(getYears(start, end) + " · " + durationText, x + 12, y + 50);
  text(formatNumber(mid) + " morti stimati", x + 12, y + 67);
  text(rangeText, x + 12, y + 84);
}

function mousePressed() {
  // se il mouse è sopra un glifo apro la pagina di dettaglio
  // passo il numero della riga come parametro nell'URL (es. detail.html?row=12)
  // non uso famine_id perché nel dataset il 43 compare due volte
  if (hoveredRow >= 0) {
    window.location.href = "detail.html?row=" + hoveredRow;
  }
}

// quando la finestra cambia dimensione ricalcolo le colonne
function windowResized() {
  calculateLayout();
}

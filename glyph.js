// questo file è caricato da tutte e due le pagine
// contiene i colori e la funzione che disegna il glifo, così il glifo
// è identico nella pagina di insieme e in quella di dettaglio

// colori
let backgroundColor = "#ffffff";
let textColor = "#000000";
let grayColor = "#d9d9d9";
let panelColor = "#f4f5f7";

let fontName = "system-ui, Helvetica, Arial, sans-serif";

// restituisce il colore del continente
function getContinentColor(continent) {
  if (continent == "africa") {
    return "#f47a49";
  } else if (continent == "asia") {
    return "#c58ffe";
  } else if (continent == "europe") {
    return "#21c56f";
  } else if (continent == "america") {
    return "#fed440";
  }
  // se il continente non è tra questi quattro uso l'azzurro
  return "#78aaff";
}

// restituisce il nome del continente in italiano
function getContinentName(continent) {
  if (continent == "africa") {
    return "Africa";
  } else if (continent == "asia") {
    return "Asia";
  } else if (continent == "europe") {
    return "Europa";
  } else if (continent == "america") {
    return "Americhe";
  }
  return "Altro";
}

// scrive i numeri con il punto delle migliaia (es. 2550000 diventa 2.550.000)
// nfc() mette la virgola all'inglese, quindi la sostituisco con il punto
function formatNumber(number) {
  return nfc(round(number)).replaceAll(",", ".");
}

// restituisce gli anni della carestia: "1846–1852" oppure solo "1868" se è durata un anno
function getYears(start, end) {
  if (start == end) {
    return start;
  }
  return start + "–" + end;
}

// trasforma il numero di morti nel raggio del cerchio
// uso la radice quadrata perché voglio che sia l'AREA del cerchio a essere
// proporzionale ai morti: usando direttamente il raggio i cerchi grandi
// sembrerebbero molto più grandi di quello che sono
// maxRadius è il raggio del cerchio con il numero di morti più alto del dataset
function mortalityToRadius(mortality, maxMortality, maxRadius) {
  return maxRadius * sqrt(mortality / maxMortality);
}

// spessore delle tacche: cresce con il glifo ma senza diventare troppo spesso
function getTicksWeight(maxRadius) {
  return constrain(maxRadius * 0.085, 2.5, 9);
}

// raggio su cui sono disegnate le tacche, poco più fuori del cerchio massimo
function getTicksRadius(maxRadius) {
  return maxRadius * 1.07 + getTicksWeight(maxRadius) / 2;
}

// disegna il glifo di una carestia
// x, y = centro del glifo
// maxRadius = raggio che avrebbe il cerchio più grande del dataset
// mid, lower, upper = morti stimati (stima centrale, minima e massima)
// duration = durata in anni
// glyphColor = colore del continente
// maxMortality, maxDuration = valori massimi del dataset, servono per le scale
function drawGlyph(x, y, maxRadius, mid, lower, upper, duration, glyphColor, maxMortality, maxDuration) {
  push();

  // TACCHE = DURATA
  // ci sono tante tacche quanti sono gli anni della carestia più lunga
  // quelle colorate sono gli anni di questa carestia, partendo dall'alto in senso orario
  let ticksRadius = getTicksRadius(maxRadius);
  let tickAngle = TWO_PI / maxDuration;
  let gapAngle = tickAngle * 0.12; // piccolo spazio tra una tacca e l'altra

  noFill();
  strokeCap(SQUARE);
  strokeWeight(getTicksWeight(maxRadius));

  for (let i = 0; i < maxDuration; i++) {
    // -HALF_PI serve per partire dall'alto invece che da destra
    let startAngle = -HALF_PI + i * tickAngle + gapAngle;
    let endAngle = -HALF_PI + (i + 1) * tickAngle - gapAngle;

    if (i < duration) {
      stroke(glyphColor);
    } else {
      stroke(grayColor);
    }
    arc(x, y, ticksRadius * 2, ticksRadius * 2, startAngle, endAngle);
  }

  // CERCHI = MORTI
  let midRadius = mortalityToRadius(mid, maxMortality, maxRadius);
  let upperRadius = mortalityToRadius(upper, maxMortality, maxRadius);
  let lowerRadius = mortalityToRadius(lower, maxMortality, maxRadius);

  // le carestie più piccole avrebbero un raggio minore di 1 pixel e sparirebbero
  if (midRadius < 1) {
    midRadius = 1;
  }

  noStroke();

  // alone chiaro: arriva fino alla stima massima
  if (upperRadius - midRadius > 0.4) {
    let haloColor = color(glyphColor);
    haloColor.setAlpha(115);
    fill(haloColor);
    circle(x, y, upperRadius * 2);
  }

  // cerchio pieno: stima centrale
  fill(glyphColor);
  circle(x, y, midRadius * 2);

  // anello bianco sottile: stima minima
  // lo disegno solo se si distingue dal bordo del cerchio
  // (in due righe del dataset la stima minima è "-": lowerRadius diventa NaN,
  // la condizione è falsa e l'anello non viene disegnato)
  if (midRadius - lowerRadius > 1.5 && lowerRadius > 1.5) {
    noFill();
    stroke(backgroundColor);
    strokeWeight(constrain(midRadius * 0.03, 1, 2));
    circle(x, y, lowerRadius * 2);
  }

  pop();
}

// disegna una linea che collega un punto del glifo (pointX, pointY)
// alla sua etichetta (labelX, labelY). Se dot è true mette anche un pallino sul punto
function drawLabelLine(pointX, pointY, labelX, labelY, dot) {
  push();
  stroke(textColor);
  strokeWeight(1);
  // la linea arriva in diagonale e poi fa un ultimo pezzetto orizzontale
  line(pointX, pointY, labelX - 30, labelY);
  line(labelX - 30, labelY, labelX - 10, labelY);

  if (dot) {
    stroke(backgroundColor);
    strokeWeight(1.5);
    fill(textColor);
    circle(pointX, pointY, 6.5);
  }
  pop();
}

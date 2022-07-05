/*
<table id="values">
	<tr>
  <td>portée (m)</td>                     <td><input type="number" onchange="recalc()" min="0" max="999"   step="1"        value="50"/></td>
  <td>poids surcharge du câble (kg/m)</td><td><input type="number" onchange="recalc()" min="0" max="9"     step="0.001"    value="1.097"/></td>
  </tr>
  <tr>
  <td>hauteur ancrage (m)</td>            <td><input type="number" onchange="recalc()" min="0" max="99"    step="0.1"      value="8.4"/></td>
	<td>poids spécifique moyen (kg/m³)</td> <td><input type="number" onchange="recalc()" min="0" max="9"     step="0.00001"  value="0.00276"/></td>
  </tr>
  <tr>
  <td>hauteur min (mm)</td>               <td><input type="number" onchange="recalc()" min="0" max="99"    step="0.1"      value="6"/></td>
	<td>taux traction max (kg/mm²)</td>     <td><input type="number" onchange="recalc()" min="0" max="999"   step="0.1"      value="10"/></td>
  </tr>
  <tr>
  <td>diamètre (mm)</td>                  <td><input type="number" onchange="recalc()" min="0" max="9"     step="0.1"      value="45"/></td>
	<td>taux traction min (kg/mm² </td>     <td><input type="number" onchange="recalc()" min="0" max="999"   step="0.1"      value="7"/></td>
  </tr>
  <tr>
  <td>section (mm²)</td>                  <td><input type="number" onchange="recalc()" min="0" max="9999"  step="0.1"      value="54.6"/></td>
	<td>coefficient de dilatation</td>      <td><input type="number" onchange="recalc()" min="0" max="9"     step="0.000001" value="0.000023"/></td>
  </tr>
  <tr>
  <td>poids du porteur (kg/m)</td>        <td><input type="number" onchange="recalc()" min="0" max="9"     step="0.000001" value="0.203"/></td>
	<td>module d'élasticité</td>            <td><input type="number" onchange="recalc()" min="0" max="99999" step="100"      value="6000"/></td>
  </tr>
</table>
<br/>
<div id='tab'></div>
<style>
	body {
		font-family: 'Segoe UI';
		color: white;
		background-color: #15222e;
	}

	table,
	td {
		border-collapse: collapse;
		border: 1px solid gray;
	}
  input[type='number']{
    width: 80px;
  }
</style>
*/

var tbl;

function addRow(tbdy, values) {
  var tr = document.createElement('tr');
  for (var j = 0; j < values.length; j++) {
    addCell(tr, values[j]);
  }
  tbdy.appendChild(tr);
  return tr;
}

function addCell(tr, value) {
  var td = document.createElement('td');
  if (typeof value === 'number') {
    if (value !== Math.floor(value)) {
      value = value.toFixed(2);
    }
  }
  else if (value === undefined || value === null) {
    value = '';
  }
  td.appendChild(document.createTextNode(value));
  tr.appendChild(td);
  return td;
}

function tableCreate() {
  var tbl = document.createElement('table');
  tbl.setAttribute('class', 'horraire border');
  tbl.setAttribute('id', 'tab');
  return tbl;
}

function logHeader(...x) {
  addRow(tbl, x);
}

function logValue(...x) {
  addRow(tbl, ['', ...x]);
}

function logVector(header, v) {
  addRow(tbl, ['', header, `${v.length.toFixed(0)} kg`, `${v.angle.toFixed(0)}°`]);
}

function clear() {
  var container = document.getElementById('tab');
  container.innerHTML = '';
  tbl = tableCreate();
  container.appendChild(tbl);
}

function getFieldValue(name) {
  return document.getElementById(name).value;
}

function getValues() {
  var el = document.getElementById('values');
  var nodes = el.children[0].querySelectorAll('input[type="number"]');
  var values = Array.prototype.slice.call(nodes).map(x => parseFloat(x.value));
  var portees = [];
  for (var i = 0; i < values.length; i += 12) {
    if (values[i + 0] > 0) {
      portees.push(new Values(values[i + 0], values[i + 2], values[i + 4], values[i + 6], values[i + 8],
        values[i + 10], values[i + 1], values[i + 3], values[i + 5], values[i + 7], values[i + 9],
        values[i + 11]));
    }
  }
  return portees;
}

//==================================================================================
class Values {
  constructor(length, hauteurAncrage, hauteurMin, diametre, section, poidsDuPorteur, poidsSurchargeDuCable, poidsSpecifiqueMoyen, tauxTractionMax, tauxTractionMin, coefDilatation, moduleElasticite) {
    this.length = length;
    this.hauteurAncrage = hauteurAncrage;
    this.hauteurMin = hauteurMin;
    this.diametre = diametre;
    this.section = section;
    this.poidsDuPorteur = poidsDuPorteur;
    this.poidsSurchargeDuCable = poidsSurchargeDuCable;
    this.poidsSpecifiqueMoyen = poidsSpecifiqueMoyen;
    this.tauxTractionMax = tauxTractionMax;
    this.tauxTractionMin = tauxTractionMin;
    this.coefDilatation = coefDilatation;
    this.moduleElasticite = moduleElasticite;
  }

  getWindForceVector(coeffTrainee, Q) {
    // calcul de l'effort du vent en conditions été et hiver.
    // F = C x Q x A     (kg/m²)
    // C = coëfficient de traînée.
    // A = Surface frappée par le vent (m²).
    // Q = Pression dynamique (kg/m²).
    const coeffEte = this.length > 100 ? 0.5 : 0.7;
    //const coeffHiver = 0.25;
    var forceVentEte = coeffTrainee * this.length * this.diameter * Q * coeffEte;
    //var forceVentHiver = coeffTrainee * this.diameter * Q * coeffHiver;
    return Vector.from(forceVentEte, this.angle + 90); // We take summer wind force
  }

  getTensionForceVector() {
    return Vector.from(this.section * this.tension, this.angle);
  }
}

class TractionInfo {
  constructor(deltaT, tauxTraction, newTauxTraction) {
    this.tauxTraction = tauxTraction;
    this.newTauxTraction = newTauxTraction;
    this.deltaT = deltaT;
  }
}

//==================================================================================

function cbrt(x) {
  return Math.cbrt(x);
}

function square(value) {
  return Math.pow(value, 2);
}

function cube(value) {
  return Math.pow(value, 3);
}

function sqrt(value) {
  return Math.sqrt(value);
}

function abs(value) {
  return Math.abs(value);
}

function cos(value) {
  return Math.cos(value);
}

function acos(value) {
  return Math.acos(value);
}

function solveCubic(a, b, c, d) {
  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  var p = (3 * a * c - b * b) / (3 * a * a);
  var q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
  var roots;

  if (abs(p) < 1e-8) { // p = 0 -> t^3 = -q -> t = -q^1/3
    roots = [cbrt(-q)];
  } else if (abs(q) < 1e-8) { // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
    roots = [0].concat(p < 0 ? [sqrt(-p), -sqrt(-p)] : []);
  } else {
    var D = q * q / 4 + p * p * p / 27;
    if (abs(D) < 1e-8) {            // D = 0 -> two roots
      roots = [-1.5 * q / p, 3 * q / p];
    } else if (D > 0) {             // Only one real root
      var u = cbrt(-q / 2 - sqrt(D));
      roots = [u - p / (3 * u)];
    } else {                        // D < 0, three roots, but needs to use complex numbers/trigonometric solution
      var u = 2 * sqrt(-p / 3);
      var t = acos(3 * q / p / u) / 3;    // D < 0 implies p < 0 and acos argument in [-1..1]
      var k = 2 * Math.PI / 3;
      roots = [u * cos(t), u * cos(t - k), u * cos(t - 2 * k)];
    }
  }

  // Convert back from depressed cubic
  for (var i = 0; i < roots.length; i++)
    roots[i] -= b / (3 * a);

  return roots;
}

function meanSection(a) {
  // a = SQRT((a1³ + a2³ + a3³...) / (a1 + a2 + a3...))
  const cubesSum = a.map(x => cube(x)).reduce((s, x) => s + x, 0);
  const sum = a.reduce((s, x) => s + x, 0);
  return sqrt(cubesSum / sum);
}

function dynamiquePression(poidsSpecifiqueAir, vitesseVent, g) {
  // calcul de  la pression dynamique
  // Q = (a x v²) : 2 g
  // a = Poids Spécifique de l//air
  // v = Vitesse du vent (m/s)
  // g = Accélération de la pesanteur (m/s²)
  return poidsSpecifiqueAir * square(vitesseVent) / (2 * g);
}

function getWindForces(portee, coeffTrainee, diametre, Q) {
  // calcul de l'effort du vent en conditions été et hiver.
  // F = C x Q x A     (kg/m²)
  // C = coëfficient de traînée.
  // A = Surface frappée par le vent (m²).
  // Q = Pression dynamique (kg/m²).
  const coeffEte = portee > 100 ? 0.5 : 0.7;
  const coeffHiver = 0.25;
  var forceVentEte = coeffTrainee * diametre * Q * coeffEte;
  var forceVentHiver = coeffTrainee * diametre * Q * coeffHiver;
  return [ forceVentEte, forceVentHiver ]
}

function getOverloadCoefficients(poidsDuPorteur, poidsSurchargeDuCable, forceVentEte, forceVentHiver) {
  // calcul coefficient de surcharge 
  // m = racine²((Pp + Pc + Pseh)² + F²) : P
  // Pp = Poids du Porteur. (kg/m)
  // Pc = Poids du ou des câbles entourant le porteur
  // Pseh = Poids de la surcharge été ou hiver. (kg/m)
  var poidsCableTotal = poidsDuPorteur + poidsSurchargeDuCable;
  var mSansVent = poidsCableTotal / poidsDuPorteur;
  var mEte = sqrt(square(poidsCableTotal) + square(forceVentEte)) / poidsDuPorteur;
  var mHiver = sqrt(square(poidsCableTotal) + square(forceVentHiver)) / poidsDuPorteur;
  return [ mSansVent, mEte, mHiver ];
}

function getCriticalSection(tauxTractionMax, section, poidsDuPorteur, coefDilatation, temperatureEte, temperatureHiver, mEte, mHiver) {
  // calcul de la portée critique
  // NB: Portée pour laquelle la contrainte max dans le conducteur
  // Formule : Ac = tm / W x racine²(24 x alpha x (T°Hiv - T°Ete) : (mHiver² - mEte²))
  // Ac = portée critique (m)
  // tm = contrainte maxi admise (kg/mm²)
  // W = poids du câble (kg/mm²/m)
  // Alpha = Coëfficient de dilatation
  // T°Hiver (-15)
  // T°Ete (+15)
  // mEte : Coëfficient de surcharge Ete
  // mHiver : Coëfficient de surcharge Hiver
  return tauxTractionMax * section / poidsDuPorteur * sqrt(24 * coefDilatation * (temperatureEte - temperatureHiver) / (square(mEte) - square(mHiver)));
}

function getCriticalCondition(portee, porteeCritique) {
  if (portee <= porteeCritique) {
    return 'Hiver';
  } else {
    return 'Eté';
  }
}

function getCriticalTemperature(criticalCondition, mHiver, mEte, temperatureHiver, temperatureEte) {
  var overload = 0;
  var criticalTemperature = 0;
  if (criticalCondition == 'Hiver') {
    overload = mHiver;
    criticalTemperature = temperatureHiver;
  } else {
    overload = mEte;
    criticalTemperature = temperatureEte;
  }
  return [ overload, criticalTemperature ];
}

function getTractionForce(tauxTraction, moduleElasticite, poidsSpecifiqueMoyen, portee, hauteurAncrage, hauteurMin, mSansVent, overload, coefDilatation, t, criticalTemperature) {
  // p0 = E . p² . portée² . mInit²  : 24
  // p1 = E . p² . portée² . mFinal² : (24 . TensionDépart²) 
  // p2 = E . s . deltaT 
  // p3 = p1 + p2 - Tension Départ
  // p0 = T³ + T² * p3 => determiner T
  var p0 = moduleElasticite * square(poidsSpecifiqueMoyen) * square(portee) * square(mSansVent) / 24;
  var p1 = moduleElasticite * square(poidsSpecifiqueMoyen) * square(portee) * square(overload) / (24 * square(tauxTraction));
  var p2 = moduleElasticite * coefDilatation * (t - criticalTemperature);
  var p3 = p1 + p2 - tauxTraction;
  var newTauxTraction = solveCubic(1, p3, 0, -p0).filter(x => x > 0)[0];
  return new TractionInfo(t, tauxTraction, newTauxTraction);
}

function getCurve(portee, poidsSpecifiqueMoyen, mSansVent, newTauxTraction) {
  return square(portee) * poidsSpecifiqueMoyen * mSansVent / (8 * newTauxTraction);
}

var g = 9.81;
var poidsSpecifiqueAir = 1.225;
var vitesseVent = 34.64;
var coeffTrainee = 1.45;
var temperatureMax = 40;
var temperatureEte = 15;
var temperatureHiver = -15;

function recalc() {
  clear();
  calculate2(getValues()[0]);
  calculate(getValues()[0]);
}

function calculate2(values) {
  const Q = dynamiquePression(poidsSpecifiqueAir, vitesseVent, g);
  
  const portee1 = 50;
  const [ forceVentEte1, forceVentHiver1 ] = getWindForces(portee1, coeffTrainee, values.diametre / 1000, Q);
  const [ mSansVent1, mEte1, mHiver1 ] = getOverloadCoefficients(values.poidsDuPorteur, values.poidsSurchargeDuCable, forceVentEte1, forceVentHiver1);
  const porteeCritique1 = getCriticalSection(values.tauxTractionMax, values.section, values.poidsDuPorteur, values.coefDilatation, temperatureEte, temperatureHiver, mEte1, mHiver1);
  
  const portee2 = 1000;
  const [ forceVentEte2, forceVentHiver2 ] = getWindForces(portee2, coeffTrainee, values.diametre / 1000, Q);
  const [ mSansVent2, mEte2, mHiver2 ] = getOverloadCoefficients(values.poidsDuPorteur, values.poidsSurchargeDuCable, forceVentEte2, forceVentHiver2);
  const porteeCritique2 = getCriticalSection(values.tauxTractionMax, values.section, values.poidsDuPorteur, values.coefDilatation, temperatureEte, temperatureHiver, mEte2, mHiver2);

  logValue('portee critique inférieure (m):', porteeCritique1);
  logValue('portee critique supérieure (m):', porteeCritique2);
  logValue('m² inférieure été:', mEte1 * mEte1);
  logValue('m² supérieure été:', mEte2 * mEte2);
  logValue('m² inférieure hiver:', mHiver1 * mHiver1);
  logValue('m² supérieure hiver:', mHiver2 * mHiver2);
  logValue(' ', 'Eté portée < 100m', 'Eté portée > 100m');
  logValue('pression dynamique', Q * 0.7, Q * 0.5);
  logValue('effort du vent', forceVentEte1, forceVentEte2);
  logValue(' ', 'Hiver portée < 100m', 'Hiver portée > 100m');
  logValue('pression dynamique', Q * 0.25, Q * 0.25);
  logValue('effort du vent', forceVentHiver1, forceVentHiver2);
}

function calculate(values) {
  const portee = meanSection([values.length]);
  const Q = dynamiquePression(poidsSpecifiqueAir, vitesseVent, g);

  const [ forceVentEte, forceVentHiver] = getWindForces(portee, coeffTrainee, values.diametre / 1000, Q);
  const [ mSansVent, mEte, mHiver ] = getOverloadCoefficients(values.poidsDuPorteur, values.poidsSurchargeDuCable, forceVentEte, forceVentHiver);
  const porteeCritique = getCriticalSection(values.tauxTractionMax, values.section, values.poidsDuPorteur, values.coefDilatation, temperatureEte, temperatureHiver, mEte, mHiver);
  const criticalCondition = getCriticalCondition(portee, porteeCritique);
  const [ overload, criticalTemperature ] = getCriticalTemperature(criticalCondition, mHiver, mEte, temperatureHiver, temperatureEte);

/*
  logHeader('portée moyenne');
  logValue('portee:', portee);

  logHeader('pression dynamique');
  logValue('Q (Pa/m):', Q);
  logValue('force vent été (Pa/m):', forceVentEte);
  logValue('force vent hiver (Pa/m):', forceVentHiver);

  logHeader('coefficient de surcharge');
  logValue('m² initial (sans vent):', mSansVent * mSansVent);
  logValue('m² été:', mEte * mEte);
  logValue('m² hiver:', mHiver * mHiver);

  logHeader('valeurs critiques');
  logValue('conditions:', criticalCondition);
  logValue('portee critique (m):', porteeCritique);
  logValue('température critique (°C):', criticalTemperature);
*/

  logValue('tableau de pose');
  logValue('=======================');
  logValue('T°', `taux de traction à ${criticalTemperature}°`, 'taux de traction à T°', 'hauteur', 'taux de traction minimale à T°', 'hauteur minimale');
  for (var t = -20; t <= 40; t += 5) {

    const d = getTractionForce(values.tauxTractionMax, values.moduleElasticite,
      values.poidsSpecifiqueMoyen, portee, values.hauteurAncrage, values.hauteurMin,
      mSansVent, overload, values.coefDilatation, t, criticalTemperature);
    var fleche = getCurve(portee, values.poidsSpecifiqueMoyen, mSansVent, d.newTauxTraction);


    var x = 0;
    var d2;
    var f2;
    do {
      x++;
      d2 = getTractionForce(x, values.moduleElasticite,
        values.poidsSpecifiqueMoyen, portee, values.hauteurAncrage, values.hauteurMin,
        mSansVent, overload, values.coefDilatation, t, criticalTemperature);
      f2 = getCurve(portee, values.poidsSpecifiqueMoyen, mSansVent, d2.newTauxTraction);
    }
    while (values.hauteurAncrage - f2 < values.hauteurMin)

    logValue(t, d.tauxTraction, d.newTauxTraction, values.hauteurAncrage - fleche, d2.newTauxTraction, values.hauteurAncrage - f2);
  }

}

recalc();

//================================================================================================
//================================================================================================
//================================================================================================



/*
<table id="values">
	<tr>
    <td>#</td>
		<td>portée (m)</td>
		<td>hauteur poteau hors sol (m)</td>
		<td>hauteur ancrage (m)</td>
		<td>angle (°)</td>
		<td>diameter (mm)</td>
		<td>section (mm²)</td>
		<td>tension (kg/mm²)</td>
		<td>coefficient de trainée</td>
	</tr>
	<tr>
    <td>1</td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="50"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="99"  step="0.1"    value="8.40"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="9"   step="0.1"    value="0.20"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="45"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="54.6"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="11"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.01"   value="1.45"/></td>
	</tr>
	<tr>
    <td>2</td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="50"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="99"  step="0.1"    value="8.40"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="9"   step="0.1"    value="0.20"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="118"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="45"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="54.6"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="11"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.01"   value="1.45"/></td>
	</tr>
	<tr>
    <td>3</td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      step="0.1" value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="99"  step="0.1"    value="8.40"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="9"   step="0.1"    value="0.20"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="45"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="54.6"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="11"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.01"   value="1.45"/></td>
	</tr>
	<tr>
    <td>4</td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      step="0.1" value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="99"  step="0.1"    value="8.40"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="9"   step="0.1"    value="0.20"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="45"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="54.6"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="11"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.01"   value="1.45"/></td>
	</tr>
  <tr>
    <td>5</td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      step="0.1" value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="99"  step="0.1"    value="8.40"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="9"   step="0.1"    value="0.20"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="0"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="45"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.1"    value="54.6"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="1"      value="11"/></td>
		<td><input type="number" onchange="recalc()" min="-999" max="999" step="0.01"   value="1.45"/></td>
	</tr>
</table>
<br/>
<div id='tab'></div>
<style>
	body {
		font-family: 'Segoe UI';
		color: white;
		background-color: #15222e;
	}

	table,
	td {
		border-collapse: collapse;
		border: 1px solid gray;
	}
</style>
*/
var tbl;

function addRow(tbdy, values) {
  var tr = document.createElement('tr');
  for (var j = 0; j < values.length; j++) {
    addCell(tr, values[j]);
  }
  tbdy.appendChild(tr);
  return tr;
}

function addCell(tr, value) {
  var td = document.createElement('td');
  if (typeof value === 'number') {
    if (value !== Math.floor(value)) {
      value = value.toFixed(2);
    }
  }
  else if (value === undefined || value === null) {
    value = '';
  }
  td.appendChild(document.createTextNode(value));
  tr.appendChild(td);
  return td;
}

function tableCreate() {
  var tbl = document.createElement('table');
  tbl.setAttribute('class', 'horraire border');
  tbl.setAttribute('id', 'tab');
  return tbl;
}

function logHeader(...x) {
  addRow(tbl, x);
}

function logValue(...x) {
  addRow(tbl, ['', ...x]);
}

function logVector(header, v) {
  addRow(tbl, ['', header, v.length, v.angle]);
}

function clear() {
  var container = document.getElementById('tab');
  container.innerHTML = '';
  tbl = tableCreate();
  container.appendChild(tbl);
}

function getFieldValue(name) {
  return document.getElementById(name).value;
}

function getPortees() {
  var el = document.getElementById('values');
  var nodes = el.children[0].querySelectorAll('input[type="number"]');
  var values = Array.prototype.slice.call(nodes).map(x => parseFloat(x.value));
  var portees = [];
  for (var i = 0; i < values.length; i += 8) {
    if (values[i + 0] > 0) {
      portees.push(new Portee(values[i + 0], values[i + 1], values[i + 2], values[i + 3], values[i + 4], values[i + 5], values[i + 6], values[i + 7]));
    }
  }
  return portees;
}

//==================================================================================
class Portee {
  constructor(length, hauteur, ancrage, angle, diameter, section, tension, coeffTrainee) {
    this.length = length;
    this.hauteur = hauteur;
    this.ancrage = ancrage;
    this.angle = angle;
    this.diameter = diameter;
    this.section = section;
    this.tension = tension;
    this.coeffTrainee = coeffTrainee;
  }

  getWindForceVector(Q) {
    // calcul de l'effort du vent en conditions été et hiver.
    // F = C x Q x A     (kg/m²)
    // C = coëfficient de traînée.
    // A = Surface frappée par le vent (m²).
    // Q = Pression dynamique (kg/m²).
    const coeffEte = this.length > 100 ? 0.5 : 0.7;
    //const coeffHiver = 0.25;
    var forceVentEte = this.coeffTrainee * this.length * this.diameter/1000 * Q * coeffEte * (this.hauteur - this.ancrage) / this.hauteur;
    //var forceVentHiver = coeffTrainee * this.diameter * Q * coeffHiver;
    return Vector.from(forceVentEte, this.angle + 90); // We take summer wind force
  }

  getTensionForceVector() {
    return Vector.from(this.section * this.tension * (this.hauteur - this.ancrage) / this.hauteur, this.angle);
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static from(len, alpha) {
    var angle = alpha / 180 * Math.PI;
    return new Vector(len * Math.cos(angle), len * Math.sin(angle));
  }
  add(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  }
  multiply(f) {
    return new Vector(this.x * f, this.y * f);
  }
  combine(v) {
    v = (Math.abs(this.angle - v.angle) % 180) < 90 ? v : v.multiply(-1);
    return this.add(v);
  }
  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  get angle() {
    if (this.x == 0) {
      return this.y > 0 ? 90 : -90;
    }
    var correction = this.x > 0 ? 0 : 180;
    return Math.atan(this.y / this.x) / Math.PI * 180 + correction;
  }
  toString() {
    return `${this.length.toFixed(2)} à ${this.angle.toFixed(2)}°`;
  }
}

function dynamiquePression(poidsSpecifiqueAir, vitesseVent, g) {
  // calcul de  la pression dynamique
  // Q = (a x v²) : 2 g
  // a = Poids Spécifique de l//air
  // v = Vitesse du vent (m/s)
  // g = Accélération de la pesanteur (m/s²)
  return poidsSpecifiqueAir * vitesseVent * vitesseVent / (2 * g);
}

function recalc() {
  clear();
  calculate();
}

function calculate() {
  var g = 9.81;
  var poidsSpecifiqueAir = 1.225;
  var vitesseVent = 34.64;

  const Q = dynamiquePression(poidsSpecifiqueAir, vitesseVent, g);

  var portees = getPortees();

  var windForces = portees.map(p => p.getWindForceVector(Q).multiply(0.5));
  var totalwindForce = windForces.reduce((a, v) => a.combine(v), new Vector(0, 0));

  var tensionForces = portees.map(p => p.getTensionForceVector());
  var totalTensionForce = tensionForces.reduce((a, p) => a.add(p));

  var totalForce = totalTensionForce.add(totalwindForce);

  logHeader('force vent');
  logValue('#', 'intensitée (kg)', 'angle (°)');
  windForces.forEach((f, i) => logVector(i + 1, f));
  logVector('total', totalwindForce);

  logHeader('force tension');
  logValue('#', 'intensitée (kg)', 'angle (°)');
  tensionForces.forEach((f, i) => logVector(i + 1, f));
  logVector('total', totalTensionForce);

  logHeader('force tension + vent');
  logValue('#', 'intensitée (kg)', 'angle (°)');
  logVector('résultante', totalForce);
}

recalc();
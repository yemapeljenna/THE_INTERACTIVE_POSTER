/* =========================================================
   CARTEL INTERACTIVO · 21 DE DICIEMBRE
   QUE EN CADA CASA HAYA UN REGALO · casita de jengibre vóxel (Three.js r128)
   Solo ratón. Sin clics ni sonido.
   ========================================================= */

(function () {
  'use strict';

  var ANCHO = 848, ALTO = 1200;            // tamaño del diseño (px)

  /* ---------- Paleta ---------- */
  var COLOR = {
    galleta:   '#c9824a',
    sombra:    '#9a5a2c',
    glaseado:  '#fff8ef',
    apagada:   '#3a1a14',                  // ventana sin luz
    luz:       '#ffd27a',               // luz de ventanas y amarillo cálido
    rojo:      '#c0283a',
    verde:     '#2e6b4a',
    verdeClaro:'#3f8a5f',
    plata:     '#c8ccd4',
    morado:    '#7b4fa0',               // solo lazo de la corona (y la etiqueta del QR, en HTML)
    rosa:      '#f08aa6'                // pastel, solo como toque
  };
  /* Caramelos del tejado: navideños, con un toque pastel */
  var CARAMELOS_TEJADO = [COLOR.rojo, COLOR.verdeClaro, COLOR.plata, COLOR.rojo, COLOR.verdeClaro, COLOR.rosa];

  /* ---------- Elementos ---------- */
  var cartel = document.getElementById('cartel');
  var lienzo = document.getElementById('escena');

  /* Azar con semilla: la casa sale siempre igual (también al imprimir) */
  var semilla = 2112;
  function azarFijo() {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
  }


  /* =========================================================
     PARTE 1 · ESCENA ESTÁTICA
     ========================================================= */

  /* --- Renderizador, escena y cámara --- */
  var renderizador = new THREE.WebGLRenderer({
    canvas: lienzo,
    alpha: true,                           // fondo transparente: se ven los cuadros del CSS
    antialias: true,
    preserveDrawingBuffer: true            // para poder capturar el canvas (impresión)
  });
  renderizador.setClearColor(0x000000, 0);

  var escena = new THREE.Scene();

  /* Unos 17,8 px del diseño por cubo: 1200 / 17,8 ≈ 67 cubos de alto visibles */
  var camara = new THREE.PerspectiveCamera(30, ANCHO / ALTO, 1, 400);
  var DISTANCIA = 126;
  var ELEVACION = THREE.MathUtils.degToRad(9);
  camara.position.set(0, Math.sin(ELEVACION) * DISTANCIA, Math.cos(ELEVACION) * DISTANCIA);
  camara.lookAt(0, 0, 0);

  /* --- Luces: cielo cálido + rebote del fondo vino + sol suave --- */
  escena.add(new THREE.HemisphereLight(0xfff6ec, 0xe0b4a4, 0.62));
  escena.add(new THREE.AmbientLight(0xffffff, 0.12));
  var sol = new THREE.DirectionalLight(0xffffff, 0.42);
  sol.position.set(-20, 40, 30);
  escena.add(sol);

  /* --- Pivote de la casa (en las partes 2 y 3 flota y gira) ---
     La casa mide de y = -2 (base) a y = 30,5 (chimenea): la centramos en el pivote. */
  var pivote = new THREE.Group();
  pivote.position.y = 0.5;              // la base queda apoyada en el borde de la nieve (y ≈ 920 px)
  escena.add(pivote);
  var casa = new THREE.Group();
  casa.position.y = -14.2;
  pivote.add(casa);


  /* --- Constructor de vóxeles --- */
  var cubos = [];                          // { x, y, z, color }
  var indice = {};                         // "x,y,z" → posición en cubos

  function poner(x, y, z, color) {
    var clave = x + ',' + y + ',' + z;
    if (indice[clave] !== undefined) {
      cubos[indice[clave]].color = color;
      return;
    }
    indice[clave] = cubos.length;
    cubos.push({ x: x, y: y, z: z, color: color });
  }

  /* Pequeña variación de tono para que la galleta parezca horneada */
  function variar(hex, cuanto) {
    var c = new THREE.Color(hex);
    c.offsetHSL(0, 0, (azarFijo() - 0.5) * cuanto);
    return c;
  }

  /* Todos los cubos en un solo InstancedMesh (rápido) */
  function crearMallaVoxel(lista, lado) {
    var geo = new THREE.BoxGeometry(lado, lado, lado);
    var mat = new THREE.MeshLambertMaterial();
    var malla = new THREE.InstancedMesh(geo, mat, lista.length);
    var m = new THREE.Matrix4();
    for (var i = 0; i < lista.length; i++) {
      var b = lista[i];
      m.makeTranslation(b.x, b.y, b.z);
      malla.setMatrixAt(i, m);
      malla.setColorAt(i, b.color instanceof THREE.Color ? b.color : new THREE.Color(b.color));
    }
    malla.instanceMatrix.needsUpdate = true;
    malla.instanceColor.needsUpdate = true;
    return malla;
  }


  /* --- Las 4 ventanas (en cubos): 5 de ancho × 4 de alto --- */
  var VENTANAS = [
    { x0: -9, x1: -5, y0: 9, y1: 12 },     // arriba izquierda
    { x0:  5, x1:  9, y0: 9, y1: 12 },     // arriba derecha
    { x0: -9, x1: -5, y0: 2, y1: 5 },      // abajo izquierda
    { x0:  5, x1:  9, y0: 2, y1: 5 }       // abajo derecha
  ];
  var PUERTA = { x0: -1, x1: 1, y0: 0, y1: 4 };

  function dentro(r, x, y) {
    return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  }
  function esHueco(x, y) {
    if (dentro(PUERTA, x, y)) return true;
    for (var i = 0; i < VENTANAS.length; i++) {
      if (dentro(VENTANAS[i], x, y)) return true;
    }
    return false;
  }
  function esMarco(r, x, y) {              // anillo de un cubo alrededor del hueco
    var fuera = { x0: r.x0 - 1, x1: r.x1 + 1, y0: r.y0 - 1, y1: r.y1 + 1 };
    return dentro(fuera, x, y) && !dentro(r, x, y);
  }

  /* --- Cuerpo de la casa: x -11…11, y 0…15, z -6…6 (pared delantera doble) --- */
  function construirCuerpo() {
    for (var y = 0; y <= 15; y++) {
      for (var x = -11; x <= 11; x++) {
        for (var z = -6; z <= 6; z++) {
          var cascara = x === -11 || x === 11 || z === -6 || z >= 5;
          if (!cascara) continue;
          if (z >= 5 && esHueco(x, y)) continue;
          var color = COLOR.galleta;
          if (y === 15 && z === 6) color = (x % 2 === 0) ? COLOR.glaseado : COLOR.galleta;   // cenefa de glaseado
          if (y === 0) color = COLOR.sombra;                                               // zócalo
          poner(x, y, z, color === COLOR.galleta ? variar(color, 0.07) : color);
        }
      }
    }

    // Marcos de glaseado de las ventanas, con alféizar más ancho
    VENTANAS.forEach(function (v) {
      for (var y = v.y0 - 1; y <= v.y1 + 1; y++) {
        for (var x = v.x0 - 1; x <= v.x1 + 1; x++) {
          if (esMarco(v, x, y)) poner(x, y, 7, COLOR.glaseado);
        }
      }
      poner(v.x0 - 2, v.y0 - 1, 7, COLOR.glaseado);
      poner(v.x1 + 2, v.y0 - 1, 7, COLOR.glaseado);
    });

    // Puerta de galleta oscura, hundida, con marco de glaseado
    for (var py = PUERTA.y0; py <= PUERTA.y1; py++) {
      for (var px = PUERTA.x0; px <= PUERTA.x1; px++) poner(px, py, 5, variar(COLOR.sombra, 0.05));
    }
    for (var fy = 0; fy <= PUERTA.y1 + 1; fy++) {
      poner(PUERTA.x0 - 1, fy, 7, COLOR.glaseado);
      poner(PUERTA.x1 + 1, fy, 7, COLOR.glaseado);
    }
    for (var fx = PUERTA.x0; fx <= PUERTA.x1; fx++) poner(fx, PUERTA.y1 + 1, 7, COLOR.glaseado);
  }

  /* --- Tejado a dos aguas, en escalera, con glaseado --- */
  function construirTejado() {
    for (var k = 0; k <= 12; k++) {
      var w = 13 - k;                      // medio ancho de esta fila
      var y = 16 + k;
      for (var z = -7; z <= 7; z++) {
        [w, w - 1, -w, -(w - 1)].forEach(function (x) {
          var exterior = Math.abs(x) === w || w === 1;
          poner(x, y, z, exterior ? COLOR.glaseado : variar(COLOR.sombra, 0.06));
        });
      }
      // Hastial (el triángulo de galleta) delante y detrás
      for (var x = -(w - 2); x <= w - 2; x++) {
        poner(x, y, 6, variar(COLOR.galleta, 0.07));
        poner(x, y, -6, variar(COLOR.galleta, 0.07));
      }
      // Ribete de glaseado bajo el alero, sobre el hastial (de él cuelgan los carámbanos)
      if (w - 2 >= 1) {
        poner(w - 2, y, 7, COLOR.glaseado);
        poner(-(w - 2), y, 7, COLOR.glaseado);
      }
    }
    // Montoncitos de nieve en la cumbrera
    for (var zc = -7; zc <= 7; zc++) {
      if (azarFijo() < 0.35) poner(0, 29, zc, COLOR.glaseado);
    }
  }

  /* --- Chimenea (faldón derecho), de ladrillos de galleta --- */
  var BOCA_CHIMENEA = new THREE.Vector3(7, 30.6, -2);   // de aquí saldrán las chispitas

  function construirChimenea() {
    for (var y = 20; y <= 29; y++) {
      for (var x = 6; x <= 8; x++) {
        for (var z = -3; z <= -1; z++) {
          var ladrillo = (y + x + z) % 2 === 0 ? COLOR.galleta : COLOR.sombra;
          poner(x, y, z, variar(ladrillo, 0.05));
        }
      }
    }
    for (var cx = 5; cx <= 9; cx++) {      // remate de glaseado con la boca oscura
      for (var cz = -4; cz <= 0; cz++) {
        var boca = cx >= 6 && cx <= 8 && cz >= -3 && cz <= -1;
        if (!boca) poner(cx, 30, cz, COLOR.glaseado);
      }
    }
    poner(7, 29, -2, COLOR.apagada);
  }

  /* --- Base de nieve sobre una galleta (la casa flota sobre ella) --- */
  function construirBase() {
    for (var x = -14; x <= 14; x++) {
      for (var z = -9; z <= 9; z++) {
        var esquina = Math.abs(x) === 14 && Math.abs(z) === 9;
        if (!esquina) poner(x, -1, z, variar(COLOR.glaseado, 0.03));
        if (Math.abs(x) <= 13 && Math.abs(z) <= 8) poner(x, -2, z, variar(COLOR.sombra, 0.06));
        // montoncitos de nieve fuera de la casa
        var fuera = Math.abs(x) > 11 || z > 7 || z < -6;
        if (fuera && !esquina && azarFijo() < 0.16) poner(x, 0, z, COLOR.glaseado);
      }
    }
    // Caminito hasta la puerta
    for (var cz = 7; cz <= 9; cz++) {
      for (var cx = -1; cx <= 1; cx++) poner(cx, -1, cz, variar(COLOR.sombra, 0.04));
    }
  }

  /* --- Caramelos: cubitos pequeños sobre el tejado y la fachada --- */
  var caramelos = [];
  function caramelo(x, y, z) {
    var c = CARAMELOS_TEJADO[Math.floor(azarFijo() * CARAMELOS_TEJADO.length)];
    caramelos.push({ x: x, y: y, z: z, color: c });
  }
  function ponerCaramelos() {
    var k, w;
    // Sobre los escalones de glaseado del tejado
    for (k = 0; k <= 11; k++) {
      w = 13 - k;
      for (var z = -7; z <= 7; z += 2) {
        if (azarFijo() < 0.3) caramelo(w, 16 + k + 0.75, z);
        if (azarFijo() < 0.3) caramelo(-w, 16 + k + 0.75, z);
      }
    }
    // Pomo de la puerta (abajo a la derecha, para dejar sitio a la corona)
    caramelos.push({ x: 1.05, y: 1.3, z: 5.75, color: COLOR.plata });
  }

  /* --- Montaje de la casa --- */
  construirCuerpo();
  construirTejado();
  construirChimenea();
  construirBase();
  ponerCaramelos();
  casa.add(crearMallaVoxel(cubos, 1));
  casa.add(crearMallaVoxel(caramelos, 0.55));


  /* =========================================================
     DECORACIÓN DE LA CASA (cubitos de ¼ de cubo)
     Ordenada sobre la rejilla de la fachada, sin recargar.
     ========================================================= */
  var C = 0.25;                            // lado del cubito de decoración
  var ROJO_BASTON = COLOR.rojo;
  var VERDE_ABETO = '#3f8a5f';             // abetos: verde intenso, que no se confunda con la nieve
  var VERDE_ABETO_OSCURO = '#2e6b4a';
  var deco = [];                           // cubitos en coordenadas de la casa

  function cubito(x, y, z, color) {
    deco.push({ x: x, y: y, z: z, color: color });
  }
  /* Rejilla de cubitos plana (filas de arriba abajo) en el plano XY, con grosor hacia z */
  function cubitosDeFilas(filas, paleta, x0, yArriba, z0, grosor) {
    filas.forEach(function (fila, r) {
      for (var c = 0; c < fila.length; c++) {
        var color = paleta[fila.charAt(c)];
        if (!color) continue;
        for (var g = 0; g < grosor; g++) cubito(x0 + c * C, yArriba - r * C, z0 + g * C, color);
      }
    });
  }

  /* --- Carámbanos de glaseado, de largos distintos (patrón fijo: ordenado) --- */
  function ponerCarambanos() {
    var largos = [4, 6, 3, 7, 5, 3];
    var n = 0;
    function carambano(x, yArriba, z) {
      var largo = largos[n++ % largos.length];
      for (var i = 0; i < largo; i++) {
        var y = yArriba - C / 2 - i * C;
        cubito(x, y, z, COLOR.glaseado);
        if (i < largo - 2) cubito(x + C, y, z, COLOR.glaseado);   // más gordo arriba, punta fina
      }
    }
    // bajo el ribete del hastial, un escalón sí y otro no
    for (var k = 0; k <= 10; k += 2) {
      var w = 13 - k;
      carambano(w - 2 - 0.125, 15.5 + k, 7.1);
      carambano(-(w - 2) - 0.125, 15.5 + k, 7.1);
    }
    // en los aleros de abajo
    [-13.1, -12.35, 12.1, 12.85].forEach(function (x) { carambano(x, 15.5, 7.1); });
  }

  /* --- Contraventanas de galleta con un corazoncito de glaseado --- */
  function ponerContraventanas() {
    var tabla = ['sss', 'ggg', 'ggg', 'sss', 'ggg', 'hgh', 'hhh', 'ghg', 'ggg', 'sss', 'ggg', 'ggg', 'sss', 'ggg', 'ggg', 'sss'];
    var paleta = { s: COLOR.sombra, g: COLOR.galleta, h: COLOR.glaseado };
    VENTANAS.forEach(function (v) {
      var arriba = v.y1 + 0.5 - C / 2;
      cubitosDeFilas(tabla, paleta, v.x0 - 1.5 - 3 * C + C / 2, arriba, 6.5 + C / 2, 2);   // izquierda
      cubitosDeFilas(tabla, paleta, v.x1 + 1.5 + C / 2, arriba, 6.5 + C / 2, 2);           // derecha
    });
  }

  /* --- Corona verde en la puerta con lazo morado --- */
  function ponerCorona() {
    var cx = 0, cy = 3.1, z = 5.5 + C / 2;
    for (var i = -4; i <= 4; i++) {
      for (var j = -4; j <= 4; j++) {
        var d = Math.sqrt(i * i + j * j);
        if (d < 2.2 || d > 3.9) continue;
        var color = (i + j) % 2 === 0 ? COLOR.verdeClaro : COLOR.verde;
        if ((i === 3 && j === 1) || (i === -2 && j === 3) || (i === -3 && j === -1)) color = COLOR.rojo;   // bayas
        cubito(cx + i * C, cy + j * C, z, color);
        cubito(cx + i * C, cy + j * C, z + C, color);
      }
    }
    var morado = COLOR.morado;
    cubitosDeFilas(['x...x', 'xxxxx', '.x.x.', '.x.x.'], { x: morado }, cx - 2 * C, cy - 3 * C, z + 2 * C, 1);
  }

  /* --- Dos piruletas de espiral a los lados de la puerta --- */
  function ponerPiruletas() {
    [[-2.9, COLOR.rojo], [2.9, COLOR.verde]].forEach(function (p) {
      var x = p[0], color = p[1], z = 7.9, cy = 3.1;
      for (var y = -0.5 + C / 2; y < cy - 0.6; y += C) cubito(x, y, z, COLOR.plata);   // palito
      for (var i = -4; i <= 4; i++) {
        for (var j = -4; j <= 4; j++) {
          var r = Math.sqrt(i * i + j * j);
          if (r > 3.7) continue;
          var vuelta = Math.atan2(j, i) / (Math.PI * 2) + r * 0.32;
          var banda = ((Math.floor(vuelta * 2) % 2) + 2) % 2;
          var c = (r < 0.5 || banda === 0) ? COLOR.glaseado : color;
          cubito(x + i * C, cy + j * C, z, c);
          cubito(x + i * C, cy + j * C, z + C, c);
        }
      }
    });
  }

  /* --- Gominolas en la pared (entre las ventanas de arriba), en triángulo ---
     Cúpulas redondeadas: tres capas que se estrechan hacia delante, con brillo de azúcar. */
  function ponerGominolas() {
    var sitios = [[-1.5, 11.4, COLOR.rojo], [0, 11.4, COLOR.verdeClaro], [1.5, 11.4, COLOR.luz],
                  [-0.75, 9.6, COLOR.plata], [0.75, 9.6, COLOR.rojo]];
    sitios.forEach(function (s) {
      var x0 = s[0] - 2 * C, arriba = s[1], z = 6.5 + C / 2, color = s[2];
      var brillo = color === COLOR.plata ? COLOR.glaseado : '#ffffff';
      cubitosDeFilas(['.xxx.', 'xxxxx', 'xxxxx', 'xxxxx'], { x: color }, x0, arriba, z, 1);            // capa de atrás
      cubitosDeFilas(['.....', '.bxx.', '.xxx.', '.xxx.'], { x: color, b: brillo }, x0, arriba, z + C, 1);   // capa media
      cubitosDeFilas(['.....', '.....', '..x..', '.....'], { x: color }, x0, arriba, z + 2 * C, 1);    // la panza de la cúpula
    });
  }

  /* --- Ribetes de glaseado ondulado en las esquinas de la fachada --- */
  function ponerRibetes() {
    var onda = [0, 1, 2, 1];
    [-1, 1].forEach(function (lado) {
      for (var i = 0; i < 64; i++) {
        var y = -0.5 + C / 2 + i * C;
        var o = onda[Math.floor(i / 2) % 4] * C * 0.5;
        cubito(lado * (11.5 + o), y, 6.5 + o, COLOR.glaseado);
        cubito(lado * (11.5 + o - C), y, 6.5 + o, COLOR.glaseado);
      }
    });
  }

  /* --- Calcetín de Navidad colgado en la chimenea, justo bajo el remate de glaseado ---
     Rojo, con el borde de arriba blanco, talón y puntera verdes y un ganchito plateado. */
  function ponerCalcetin() {
    cubitosDeFilas([
      '.p......',
      'wwwww...',
      'wwwww...',
      '.rrr....',
      '.rrr....',
      '.rrr....',
      '.rrrr...',
      '.grrrrr.',
      '.grrrrgg',
      '..rrrrgg'
    ], { p: COLOR.plata, w: COLOR.glaseado, r: COLOR.rojo, g: COLOR.verde },
    7 - 3.5 * C, 29.4, -0.5 + C / 2, 2);
  }

  /* --- "Bon Nadal" escrito con glaseado en el hastial, como con manga pastelera --- */
  var LETRAS = {
    B: ['xx.', 'x.x', 'xx.', 'x.x', 'xx.'],
    o: ['...', '...', 'xxx', 'x.x', 'xxx'],
    n: ['...', '...', 'xx.', 'x.x', 'x.x'],
    N: ['x..x', 'xx.x', 'x.xx', 'x..x', 'x..x'],
    a: ['...', '...', '.xx', 'x.x', '.xx'],
    d: ['..x', '..x', '.xx', 'x.x', '.xx'],
    l: ['x.', 'x.', 'x.', 'x.', '.x']
  };
  var LETRA = 0.32;                        // cubito de las letras (algo mayor que la decoración)
  var letras = [];
  function escribirGlaseado(palabra, centroX, yArriba) {
    var filas = ['', '', '', '', ''];
    palabra.split('').forEach(function (letra, i) {
      for (var r = 0; r < 5; r++) filas[r] += (i > 0 ? '.' : '') + LETRAS[letra][r];
    });
    var x0 = centroX - (filas[0].length - 1) / 2 * LETRA;
    filas.forEach(function (fila, r) {
      for (var c = 0; c < fila.length; c++) {
        if (fila.charAt(c) !== 'x') continue;
        // dos cubitos de grosor: el glaseado queda en relieve sobre la galleta
        for (var g = 0; g < 2; g++) {
          letras.push({ x: x0 + c * LETRA, y: yArriba - r * LETRA, z: 6.5 + LETRA / 2 + g * LETRA, color: COLOR.glaseado });
        }
      }
    });
  }
  /* En la parte ancha del hastial, centrado entre la punta (y ≈ 28) y las ventanas de arriba (y ≈ 13,5) */
  function ponerBonNadal() {
    escribirGlaseado('Bon', 0, 22.5);
    escribirGlaseado('Nadal', 0, 22.5 - 5 * LETRA - 0.5);
    casa.add(crearMallaVoxel(letras, LETRA));
  }

  /* --- Valla de bastones de caramelo delante de la casa (con hueco ante la puerta) ---
     Los regalitos del final caen un poco por delante de ella. */
  function ponerValla() {
    var forma = [];                        // [u, v] del bastón: palo de 2 de ancho y gancho
    for (var v = 0; v <= 5; v++) { forma.push([0, v]); forma.push([1, v]); }
    forma.push([0, 6], [1, 6], [1, 7], [2, 7], [3, 7], [3, 6], [4, 6], [4, 5]);
    var z = 8.6, suelo = -0.5;
    [-1, 1].forEach(function (lado) {
      for (var x = 3.6; x <= 13.2; x += 1.6) {
        forma.forEach(function (p) {
          var color = (p[0] + p[1]) % 2 === 0 ? ROJO_BASTON : COLOR.glaseado;
          var px = lado * (x + p[0] * C);    // el gancho mira hacia fuera
          cubito(px, suelo + C / 2 + p[1] * C, z, color);
          cubito(px, suelo + C / 2 + p[1] * C, z + C, color);
        });
      }
      for (var rx = 3.6; rx <= 13.6; rx += C) {   // travesaño
        var franja = Math.floor(rx / (2 * C)) % 2 === 0 ? ROJO_BASTON : COLOR.glaseado;
        cubito(lado * rx, suelo + C / 2 + 3 * C, z - C, franja);
      }
    });
  }

  ponerCarambanos();
  ponerContraventanas();
  ponerCorona();
  ponerPiruletas();
  ponerGominolas();
  ponerRibetes();
  ponerCalcetin();
  ponerBonNadal();
  ponerValla();
  casa.add(crearMallaVoxel(deco, C));


  /* --- Guirnalda de bombillitas por el borde del tejado (parpadean en actualizarBombillas) --- */
  var COLORES_BOMBILLA = [COLOR.rojo, COLOR.verdeClaro, COLOR.glaseado, COLOR.plata, COLOR.luz];
  var bombillas = [];                      // todas: las 3D del tejado y las HTML de los carteles
  var bombillas3d = [];
  var mallaBombillas, haloBombillas;

  function ponerGuirnaldaTejado() {
    var sitios = [];
    for (var k = 0; k <= 12; k++) {
      var w = 13 - k;
      sitios.push([-w, 16 + k - 0.3]);
      sitios.push([w, 16 + k - 0.3]);
    }
    sitios.push([0, 28 - 0.3]);
    sitios.sort(function (a, b) { return a[0] - b[0]; });   // de izquierda a derecha: colores en orden

    var cuerpo = new THREE.BoxGeometry(0.42, 0.5, 0.42);
    mallaBombillas = new THREE.InstancedMesh(cuerpo, new THREE.MeshBasicMaterial(), sitios.length);
    var casquillos = [];
    var posiciones = new Float32Array(sitios.length * 3);
    var m = new THREE.Matrix4();
    sitios.forEach(function (s, i) {
      m.makeTranslation(s[0], s[1], 7.78);
      mallaBombillas.setMatrixAt(i, m);
      mallaBombillas.setColorAt(i, new THREE.Color(COLORES_BOMBILLA[i % 5]));
      casquillos.push({ x: s[0], y: s[1] + 0.33, z: 7.78, color: COLOR.plata });
      posiciones[i * 3] = s[0]; posiciones[i * 3 + 1] = s[1]; posiciones[i * 3 + 2] = 8.1;
      var b = { encendida: azarFijo() < 0.5, brillo: 0, base: new THREE.Color(COLORES_BOMBILLA[i % 5]), indice: i };
      bombillas.push(b);
      bombillas3d.push(b);
    });
    casa.add(mallaBombillas);
    casa.add(crearMallaVoxel(casquillos, 0.22));

    // Halo de cada bombilla: puntos con mezcla aditiva (negro = invisible)
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sitios.length * 3), 3));
    haloBombillas = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.4, map: texturaHalo(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    casa.add(haloBombillas);
  }
  ponerGuirnaldaTejado();


  /* --- Dos abetos vóxel con nieve, a los lados (no flotan con la casa) --- */
  var PLATA_BRILLO = '#eef0f4';            // brillo de la boquilla de la manga
  var ORO = '#e8b84a', ORO_BRILLO = '#ffd27a';   // estrellas de los abetos, a juego con las luces

  /* Estrella plana de 5 puntas, dorada, con brillo arriba a la izquierda */
  function crearEstrellaDorada() {
    var filas = [
      '....b....',
      '....b....',
      '...bbx...',
      'xbbbbxxxx',
      '.xbbxxxx.',
      '..xbxxx..',
      '..xxxxx..',
      '.xxx.xxx.',
      'xx.....xx'
    ];
    var L = 0.32, lista = [];
    filas.forEach(function (fila, r) {
      for (var c = 0; c < fila.length; c++) {
        var letra = fila.charAt(c);
        if (letra === '.') continue;
        var color = letra === 'b' ? ORO_BRILLO : ORO;
        for (var g = 0; g < 2; g++) lista.push({ x: (c - 4) * L, y: (8 - r) * L + L / 2, z: g * L, color: color });
      }
    });
    return crearMallaVoxel(lista, L);
  }

  function crearAbeto(lado) {
    var lista = [];
    var pisos = [[3, 5], [4, 5], [5, 4], [6, 4], [7, 4], [8, 3], [9, 3], [10, 3], [11, 2], [12, 2], [13, 1]];
    var empiezaPiso = { 3: true, 6: true, 9: true, 12: true };
    var x, z;
    // Tronco de galleta oscura
    for (x = -1; x <= 1; x++) for (z = -1; z <= 1; z++) for (var t = 0; t <= 2; t++) lista.push({ x: x, y: t, z: z, color: variar(COLOR.sombra, 0.05) });
    // Montoncito de nieve en la base: tapa la parte de abajo del tronco
    for (x = -3; x <= 3; x++) {
      for (z = -3; z <= 3; z++) {
        var d = Math.max(Math.abs(x), Math.abs(z));
        var esquinaBase = Math.abs(x) === 3 && Math.abs(z) === 3;
        if (!esquinaBase) lista.push({ x: x, y: 0, z: z, color: variar(COLOR.glaseado, 0.02) });
        if (d === 2 && azarFijo() < 0.6) lista.push({ x: x, y: 1, z: z, color: COLOR.glaseado });
      }
    }
    pisos.forEach(function (p) {
      var y = p[0], r = p[1];
      for (x = -r; x <= r; x++) {
        for (z = -r; z <= r; z++) {
          var borde = Math.max(Math.abs(x), Math.abs(z)) === r;
          // nieve solo en las puntas: esquinas de cada piso, algún borde suelto y la copa
          var esquina = Math.abs(x) === r && Math.abs(z) === r;
          var nevado = (empiezaPiso[y] && borde && (esquina || azarFijo() < 0.3)) || y >= 13;
          lista.push({ x: x, y: y, z: z, color: nevado ? COLOR.glaseado : variar(azarFijo() < 0.4 ? VERDE_ABETO_OSCURO : VERDE_ABETO, 0.04) });
        }
      }
    });
    var abeto = new THREE.Group();
    abeto.add(crearMallaVoxel(lista, 1));
    // Estrella dorada en la punta, de cara al público (compensa el giro del abeto)
    var estrella = crearEstrellaDorada();
    estrella.position.set(0, 13.4, 0);
    estrella.rotation.y = lado * 0.35;
    abeto.add(estrella);
    abeto.position.set(lado * 19.5, -18.1, -2);   // la base del montoncito, sobre el suelo de nieve
    abeto.rotation.y = lado * -0.35;
    escena.add(abeto);
  }
  crearAbeto(-1);
  crearAbeto(1);


  /* =========================================================
     PARTE 2 · VENTANAS Y REGALOS
     Muñequitos y regalos con cubitos pequeños (¼ de cubo).
     ========================================================= */
  var S = 0.25;                            // lado de los cubitos pequeños

  /* Malla de cubitos con el origen abajo y en el centro (para escalar desde el suelo) */
  function mallaPequena(lista) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
    lista.forEach(function (b) {
      minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x);
      minY = Math.min(minY, b.y);
      minZ = Math.min(minZ, b.z); maxZ = Math.max(maxZ, b.z);
    });
    var cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    var escalada = lista.map(function (b) {
      return { x: (b.x - cx) * S, y: (b.y - minY + 0.5) * S, z: (b.z - cz) * S, color: b.color };
    });
    var grupo = new THREE.Group();
    grupo.add(crearMallaVoxel(escalada, S));
    grupo.userData.ancho = (maxX - minX + 1) * S;
    return grupo;
  }

  /* Dibujo por filas (de arriba abajo) con profundidad: la capa delantera lleva los detalles */
  function deFilas(filas, paleta, fondo, profundidad) {
    var lista = [];
    filas.forEach(function (fila, r) {
      for (var c = 0; c < fila.length; c++) {
        var letra = fila.charAt(c);
        if (letra === '.') continue;
        for (var z = 0; z < profundidad; z++) {
          var delante = z === profundidad - 1;
          var color = delante ? paleta[letra] : paleta[fondo];
          lista.push({ x: c, y: filas.length - 1 - r, z: z, color: typeof color === 'function' ? color() : color });
        }
      }
    });
    return lista;
  }

  /* Recorre una caja de cubitos y pregunta a "pinta" el color de cada uno (null = vacío) */
  function deVolumen(x0, x1, y0, y1, z0, z1, pinta) {
    var lista = [];
    for (var x = x0; x <= x1; x++) {
      for (var y = y0; y <= y1; y++) {
        for (var z = z0; z <= z1; z++) {
          var c = pinta(x, y, z);
          if (c) lista.push({ x: x, y: y, z: z, color: c });
        }
      }
    }
    return lista;
  }
  function enEsfera(x, y, z, cx, cy, cz, r) {
    var dx = x - cx, dy = y - cy, dz = z - cz;
    return dx * dx + dy * dy + dz * dz <= r * r;
  }
  function galleta() { return variar(COLOR.galleta, 0.06); }

  /* --- Muñequito de jengibre (9 × 12 cubitos, 2 de grosor) --- */
  function crearMuneco(boton) {
    return mallaPequena(deFilas([
      '..XXXXX..',
      '..XoXoX..',
      '..XXXXX..',
      '..XmmmX..',
      '...XXX...',
      'XXXXXXXXX',
      'gXXXbXXXg',
      '...XXX...',
      '..XXbXX..',
      '..XX.XX..',
      '..XX.XX..',
      '..gg.gg..'
    ], { X: galleta, o: COLOR.glaseado, m: COLOR.glaseado, g: COLOR.glaseado, b: boton }, 'X', 2));
  }

  /* --- Regalo 1: osito con bufanda roja y verde --- */
  function crearOsito() {
    var marron = COLOR.sombra, morro = COLOR.glaseado, ojo = COLOR.apagada;
    function bufanda(x) { return Math.abs(x) % 2 === 0 ? COLOR.rojo : COLOR.verde; }
    var lista = deVolumen(-4, 4, 0, 12, -3, 3, function (x, y, z) {
      if (y === 6 && x * x + z * z <= 7.3) return bufanda(x);                     // bufanda al cuello
      if (enEsfera(x, y, z, 0, 3, 0, 3.2)) return (z >= 2 && Math.abs(x) <= 1 && y >= 2 && y <= 4) ? morro : variar(marron, 0.05);
      if (enEsfera(x, y, z, 0, 8, 0, 2.7)) return variar(marron, 0.05);
      if (enEsfera(x, y, z, -2, 10.6, 0, 1.2) || enEsfera(x, y, z, 2, 10.6, 0, 1.2)) return marron;
      if (enEsfera(x, y, z, -3.3, 4, 0.5, 1.2) || enEsfera(x, y, z, 3.3, 4, 0.5, 1.2)) return marron;   // bracitos
      return null;
    });
    // morro, ojos, nariz y la punta de la bufanda colgando por delante
    lista.push({ x: 0, y: 7, z: 3, color: morro }, { x: -1, y: 7, z: 2, color: morro }, { x: 1, y: 7, z: 2, color: morro });
    lista.push({ x: 0, y: 8, z: 3, color: ojo }, { x: -1, y: 9, z: 2, color: ojo }, { x: 1, y: 9, z: 2, color: ojo });
    lista.push({ x: 1, y: 5, z: 3, color: COLOR.rojo }, { x: 1, y: 4, z: 3, color: COLOR.verde }, { x: 1, y: 3, z: 3, color: COLOR.rojo });
    return mallaPequena(lista);
  }

  /* --- Regalo 2: balón de gajos rojos y blancos --- */
  function crearBalon() {
    var gajos = [COLOR.rojo, COLOR.glaseado, COLOR.rojo, COLOR.glaseado, COLOR.rojo, COLOR.glaseado];
    return mallaPequena(deVolumen(-4, 4, 0, 7, -4, 4, function (x, y, z) {
      if (!enEsfera(x, y, z, 0, 3.5, 0, 3.7)) return null;
      if (Math.abs(y - 3.5) >= 3) return COLOR.glaseado;                 // casquetes
      var angulo = Math.atan2(z, x) + Math.PI + 0.35;   // un gajo de color mirando al frente
      return gajos[Math.floor(angulo / (Math.PI * 2) * 6) % 6];
    }));
  }

  /* --- Regalo 3: coche de juguete rojo con franja verde (alto como el osito) --- */
  function crearCoche() {
    var rojo = COLOR.rojo, franja = COLOR.verde, cristal = COLOR.plata;
    var rueda = COLOR.apagada, tapacubos = COLOR.plata, faro = COLOR.luz, parachoques = COLOR.glaseado;
    return mallaPequena(deVolumen(-4, 3, 0, 9, -3, 3, function (x, y, z) {
      var az = Math.abs(z);
      // ruedas grandes de 3 × 3, por fuera, con tapacubos
      if (az === 3) {
        var enRueda = y <= 2 && ((x >= -4 && x <= -2) || (x >= 1 && x <= 3));
        if (!enRueda) return null;
        return (y === 1 && (x === -3 || x === 2)) ? tapacubos : rueda;
      }
      if (y === 0) return null;
      if (y <= 4) {                                                         // chasis
        if (x === 3 && y === 3 && az === 1) return faro;
        if ((x === 3 || x === -4) && y === 1) return parachoques;
        if (y === 3 && az === 2) return franja;
        return variar(rojo, 0.03);
      }
      if (x >= -3 && x <= 1) {                                             // cabina alta
        if (y >= 6 && y <= 8) {
          if (az === 2 && x >= -2 && x <= 0) return cristal;               // ventanillas
          if ((x === 1 || x === -3) && az <= 1) return cristal;            // parabrisas y luna
        }
        return variar(rojo, 0.03);
      }
      return null;
    }));
  }

  /* --- Regalo 4: caja con papel verde y lazo rojo --- */
  function crearCaja() {
    var papel = COLOR.verde, cinta = COLOR.rojo;
    var lista = deVolumen(-3, 3, 0, 5, -3, 3, function (x, y, z) {
      if (x === 0 || z === 0) return cinta;
      return variar(papel, 0.04);
    });
    // lazo encima
    [[0, 6, 0], [-1, 6, 0], [1, 6, 0], [-2, 7, 0], [-1, 7, 0], [1, 7, 0], [2, 7, 0], [-2, 6, 0], [2, 6, 0]].forEach(function (p) {
      lista.push({ x: p[0], y: p[1], z: p[2], color: cinta });
    });
    return mallaPequena(lista);
  }

  var FABRICAS_REGALO = [crearOsito, crearBalon, crearCoche, crearCaja];

  /* --- Halo de luz cálida delante de cada ventana (textura radial) --- */
  function texturaHalo() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var g = cv.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 210, 122, 0.9)');
    grad.addColorStop(0.45, 'rgba(255, 190, 100, 0.35)');
    grad.addColorStop(1, 'rgba(255, 170, 80, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }
  var TEXTURA_HALO = texturaHalo();

  /* --- Cada ventana: cristal, luz, halo, muñequito, regalo y zona para el raycaster --- */
  var ventanas = [];
  var zonasVentana = [];                   // lo que mirará el raycaster (parte 3)
  var Z_FIGURAS = 5.45;                    // dentro del hueco (de z 4,5 a 6,5)

  VENTANAS.forEach(function (v, i) {
    var ancho = v.x1 - v.x0 + 1, alto = v.y1 - v.y0 + 1;
    var cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2;
    var izquierda = v.x0 - 0.5, derecha = v.x1 + 0.5, suelo = v.y0 - 0.5;
    var espejo = cx > 0;                   // en la columna derecha, el muñequito va a la derecha

    // Cristal del fondo: apagado (#3a1a14) → luz (#ffd27a) con la emisión
    var cristal = new THREE.Mesh(
      new THREE.BoxGeometry(ancho, alto, 1),
      new THREE.MeshLambertMaterial({ color: COLOR.apagada, emissive: new THREE.Color(COLOR.luz), emissiveIntensity: 0 })
    );
    cristal.position.set(cx, cy, 4);
    casa.add(cristal);

    // Luz cálida que ilumina al muñequito y al regalo
    var luz = new THREE.PointLight(0xffc06a, 0, 9, 2);
    luz.position.set(cx, cy + 0.5, 7.2);
    casa.add(luz);

    // Halo suave por fuera de la ventana
    var halo = new THREE.Mesh(
      new THREE.PlaneGeometry(ancho + 6, alto + 6),
      new THREE.MeshBasicMaterial({ map: TEXTURA_HALO, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    halo.position.set(cx, cy, 7.7);
    casa.add(halo);

    // Muñequito de jengibre, mirando un poco hacia su regalo
    var muneco = crearMuneco(i % 2 === 0 ? COLOR.rojo : COLOR.verdeClaro);
    var mx = espejo ? derecha - 0.2 - muneco.userData.ancho / 2 : izquierda + 0.2 + muneco.userData.ancho / 2;
    muneco.position.set(mx, suelo, Z_FIGURAS);
    muneco.rotation.y = espejo ? -0.3 : 0.3;
    casa.add(muneco);

    // Regalo: escondido (escala 0) hasta que se enciende la ventana
    var regalo = FABRICAS_REGALO[i]();
    var rx = espejo ? izquierda + 0.25 + regalo.userData.ancho / 2 : derecha - 0.25 - regalo.userData.ancho / 2;
    regalo.position.set(rx, suelo, Z_FIGURAS);
    regalo.rotation.y = espejo ? 0.35 : -0.35;
    regalo.scale.setScalar(0.001);
    regalo.visible = false;
    casa.add(regalo);

    // Zona invisible (hueco + marco) para detectar el ratón
    var zona = new THREE.Mesh(new THREE.PlaneGeometry(ancho + 2, alto + 2), new THREE.MeshBasicMaterial({ visible: false }));
    zona.position.set(cx, cy, 7.6);
    zona.userData.ventana = i;
    casa.add(zona);
    zonasVentana.push(zona);

    ventanas.push({
      cristal: cristal, luz: luz, halo: halo, muneco: muneco, regalo: regalo,
      sueloMuneco: suelo, estado: 'apagada', brillo: 0, objetivo: 0, saltoDesde: -1
    });
  });

  var BRILLO_ACTIVO = 1;                   // ratón encima
  var BRILLO_SUAVE = 0.4;                  // después de mouseleave

  /* Enciende la ventana. Devuelve true si es la primera vez (para contar). */
  function encenderVentana(i, ahora) {
    var v = ventanas[i];
    var primera = v.estado === 'apagada';
    v.estado = 'activa';
    v.objetivo = BRILLO_ACTIVO;
    if (primera) {
      v.regalo.visible = true;
      v.saltoDesde = ahora;                // empieza el saltito
    }
    return primera;
  }

  /* La luz baja a un brillo suave; el regalo se queda */
  function bajarLuz(i) {
    var v = ventanas[i];
    if (v.estado !== 'activa') return;
    v.estado = 'encendida';
    v.objetivo = BRILLO_SUAVE;
  }

  /* Saltito: sube y baja con un pequeño rebote, aplastándose al caer */
  function curvaSalto(u, altura) {
    if (u <= 0 || u >= 1) return 0;
    if (u < 0.7) { var a = u / 0.7; return 4 * altura * a * (1 - a); }
    var b = (u - 0.7) / 0.3; return 4 * altura * 0.18 * b * (1 - b);
  }

  /* Se llama en cada fotograma: suaviza la luz y anima los saltitos */
  function actualizarVentanas(dt, ahora) {
    var suavizado = 1 - Math.exp(-dt * 7);
    ventanas.forEach(function (v, i) {
      v.brillo += (v.objetivo - v.brillo) * suavizado;
      v.cristal.material.emissiveIntensity = v.brillo * 0.8;
      v.luz.intensity = v.brillo * 0.9;
      v.halo.material.opacity = v.brillo * 0.45;
      if (reflejos[i]) reflejos[i].el.setAttribute('opacity', (v.brillo * reflejos[i].fuerza).toFixed(3));   // reflejo en la nieve

      if (v.saltoDesde < 0) return;
      var u = (ahora - v.saltoDesde) / 0.75;                     // 0,75 s de saltito
      var crece = Math.min(1, u / 0.25);
      var escala = crece < 1 ? crece * (1.15 - 0.15 * crece) / 1 : 1;
      var aplasta = (u > 0.62 && u < 0.78) ? 0.12 : 0;           // al tocar el suelo
      v.regalo.scale.set(escala * (1 + aplasta), Math.max(0.001, escala * (1 - aplasta)), escala * (1 + aplasta));
      v.regalo.position.y = v.sueloMuneco + curvaSalto(u, 1.1);
      v.muneco.position.y = v.sueloMuneco + curvaSalto(u - 0.12, 0.45);   // el muñequito salta de alegría
      if (u >= 1.15) {
        v.regalo.scale.setScalar(1);
        v.regalo.position.y = v.muneco.position.y = v.sueloMuneco;
        v.saltoDesde = -1;
      }
    });
  }


  /* =========================================================
     SUELO DE NIEVE, ESTRELLITAS Y GUIRNALDAS HTML
     En SVG/HTML (no en el canvas): nítidos al imprimir.
     ========================================================= */
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Azar con su propia semilla, para no cambiar la casa */
  function crearAzar(s) {
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  function rect(svg, x, y, w, h, relleno) {
    var r = document.createElementNS(SVGNS, 'rect');
    r.setAttribute('x', x.toFixed(1));
    r.setAttribute('y', y.toFixed(1));
    r.setAttribute('width', w.toFixed(1));
    r.setAttribute('height', h.toFixed(1));
    r.setAttribute('fill', relleno);
    svg.appendChild(r);
  }
  var SOMBRA_NIEVE = '#dfe6ef';            // sombras azuladas suaves sobre la nieve
  var HUELLA = '#cdd7e3';                  // huellas hundidas en la nieve
  var sombraCasa = null;
  var reflejos = [];                       // reflejo cálido de cada ventana sobre la nieve

  /* Rectángulo con opacidad */
  function rectOp(padre, x, y, w, h, relleno, opacidad) {
    rect(padre, x, y, w, h, relleno);
    if (opacidad < 1) padre.lastChild.setAttribute('fill-opacity', opacidad);
    return padre.lastChild;
  }
  function grupo(padre) {
    var g = document.createElementNS(SVGNS, 'g');
    padre.appendChild(g);
    return g;
  }

  /* Montoncito de cubitos de nieve apoyado en el suelo (con su sombra: no flota) */
  function montoncito(svg, cx, suelo, cubos, azar) {
    var L = 12;
    rectOp(svg, cx - cubos * L / 2 - 6, suelo - 3, cubos * L + 16, 7, SOMBRA_NIEVE, 0.9);   // sombra en el suelo
    for (var nivel = 0, n = cubos; n > 0; nivel++) {
      var izq = cx - n * L / 2 + (nivel > 0 ? Math.round(azar() * 2 - 1) * L / 4 : 0);
      var cy = suelo - (nivel + 1) * L;
      rect(svg, izq, cy, n * L, L, COLOR.glaseado);                        // caras de delante
      rectOp(svg, izq + n * L - 4, cy + 3, 4, L - 3, SOMBRA_NIEVE, 1);     // costado en sombra
      rectOp(svg, izq, cy + L - 3, n * L, 3, SOMBRA_NIEVE, 0.8);           // pie de cada fila
      n -= azar() < 0.4 ? 2 : 1;
    }
  }

  function construirSuelo() {
    var svg = document.getElementById('suelo');
    var azar = crearAzar(1221);
    var i, x, g;

    // Degradado del reflejo cálido de las ventanas
    var defs = document.createElementNS(SVGNS, 'defs');
    defs.innerHTML = '<radialGradient id="reflejo-ventana"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.9"/>' +
                     '<stop offset="0.55" stop-color="#ffd27a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>';
    svg.appendChild(defs);

    // 1. Nieve con borde superior en bloques (32 columnas): cara de arriba y cara de delante en sombra
    var desnivel = [2, 1, 1, 0, 1, 2, 2, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1, 2, 1, 0, 1, 1, 2, 1];
    var col = ANCHO / desnivel.length;
    for (i = 0; i < desnivel.length; i++) {
      var arriba = 896 + desnivel[i] * 8;
      x = i * col;
      rect(svg, x, arriba, col + 0.5, ALTO - arriba, COLOR.glaseado);
      rectOp(svg, x, arriba + 6, col + 0.5, 7, SOMBRA_NIEVE, 1);
      rectOp(svg, x, arriba + 13, col + 0.5, 6, SOMBRA_NIEVE, 0.45);
    }

    // 2. Ondulaciones suaves: lomas escalonadas con su cara en sombra
    [[985, 9, 190, 0.4], [1048, 12, 240, 2.1], [1118, 10, 200, 4.0], [1178, 8, 170, 1.2]].forEach(function (o) {
      var base = o[0], amp = o[1], periodo = o[2], fase = o[3];
      for (x = 0; x < ANCHO; x += 8) {
        var h = Math.round(amp * (0.5 + 0.5 * Math.sin(x / periodo * Math.PI * 2 + fase)) / 2) * 2;
        if (h < 2) continue;
        rectOp(svg, x, base - h, 8.5, h, SOMBRA_NIEVE, 0.75);              // la loma, en sombra
        rectOp(svg, x, base - h, 8.5, 2, '#ffffff', 0.7);                   // su cresta, con luz
      }
    });

    // 3. Sombras suaves de la casa (elipse escalonada) y de los abetos
    sombraCasa = grupo(svg);                 // al flotar la casa, su sombra se aclara un poco
    [[480, 914, 0.95], [452, 922, 0.75], [404, 930, 0.55], [330, 938, 0.35]].forEach(function (s) {
      rectOp(sombraCasa, ANCHO / 2 - s[0] / 2, s[1], s[0], 8, SOMBRA_NIEVE, s[2]);
    });
    [88, 760].forEach(function (cx) {
      rectOp(svg, cx - 70, 902, 140, 8, SOMBRA_NIEVE, 0.95);
      rectOp(svg, cx - 54, 910, 108, 6, SOMBRA_NIEVE, 0.6);
    });

    // 4. Reflejo cálido de cada ventana sobre la nieve (main.js sube su opacidad al encenderla)
    VENTANAS.forEach(function (v, n) {
      var arribaV = v.y0 > 6;                // las de arriba reflejan más lejos y más flojo
      var e = document.createElementNS(SVGNS, 'ellipse');
      e.setAttribute('cx', (v.x0 + v.x1) / 2 < 0 ? 296 : 552);
      e.setAttribute('cy', arribaV ? 948 : 940);
      e.setAttribute('rx', arribaV ? 92 : 70);
      e.setAttribute('ry', arribaV ? 16 : 12);
      e.setAttribute('fill', 'url(#reflejo-ventana)');
      e.setAttribute('opacity', '0');
      svg.appendChild(e);
      reflejos[n] = { el: e, fuerza: arribaV ? 0.7 : 0.9 };
    });

    // 5. Caminito de piedras pisaderas desde la puerta: una a una, en ligero zigzag
    //    siguiendo una curva suave, bien separadas, de formas y grises algo distintos,
    //    con nieve encima; cada vez más pequeñas y más tapadas hasta perderse.
    var GRISES = [                                           // [cara de arriba, canto]
      ['#b5b9c2', '#8a8f99'], ['#a9adb6', '#878c96'], ['#bfc2ca', '#959aa4'], ['#9ea3ad', '#80858f']
    ];
    var PIEDRAS = 6;
    var y = 926;
    for (var p = 0; p < PIEDRAS; p++) {
      var t = p / (PIEDRAS - 1);                             // 0 junto a la puerta → 1 donde se pierde
      var escala = 1 - t * 0.55;
      var centro = ANCHO / 2 + Math.sin(p * 0.5) * 26;       // curva suave
      var zigzag = (p % 2 === 0 ? -1 : 1) * 16 * escala;     // alterna a un lado y a otro
      var gris = GRISES[Math.floor(azar() * GRISES.length)];
      var pw = (40 + azar() * 14) * escala;                  // tamaño algo irregular
      var ph = (15 + azar() * 4) * escala;
      var px = centro + zigzag - pw / 2;
      g = grupo(svg);
      g.setAttribute('opacity', (1 - Math.max(0, t - 0.55) * 1.3).toFixed(2));

      // Forma vóxel irregular: tres franjas de anchos distintos (sin esquinas rectas de ladrillo)
      var franja = ph / 3;
      var anchos = [0.72 + azar() * 0.12, 1, 0.8 + azar() * 0.12];
      var desvios = [azar() * 0.2, 0, azar() * 0.15];
      rectOp(g, px - 4, y + ph - 2, pw + 8, 5, SOMBRA_NIEVE, 1);                  // sombrita
      for (var f = 0; f < 3; f++) {
        var fw = pw * anchos[f];
        var fx = px + (pw - fw) * (0.5 + (desvios[f] - 0.1));
        rect(g, fx, y + f * franja, fw, franja + 0.5, f < 2 ? gris[0] : gris[1]);   // cara arriba, canto abajo
      }
      rectOp(g, px + pw * 0.2, y + franja * 1.1, Math.min(8, pw * 0.2), 2, '#ffffff', 0.3);   // brillo

      // Nieve acumulada encima (con algún bulto) y en los bordes; más cuanto más lejos
      var cw = pw * anchos[0] + 4, cx = px + (pw - cw) / 2;
      var capa = franja * (0.6 + t * 1.4);
      rect(g, cx, y - 2, cw, capa + 2, COLOR.glaseado);
      rect(g, cx + cw * (0.15 + azar() * 0.4), y - 4 - t * 2, cw * 0.3, 3 + t * 2, COLOR.glaseado);
      rect(g, px - 2, y + franja, 4, franja * (1 + t), COLOR.glaseado);
      rect(g, px + pw - 2, y + franja * (1.2 - t * 0.5), 4, franja * (0.8 + t), COLOR.glaseado);

      y += ph + 14 * escala;                                 // bien separadas
    }

    // 6. Huellas de muñequito de jengibre que llevan hasta la puerta, junto a las piedras
    for (i = 0; i < 6; i++) {
      var hy = 972 - i * 9;
      var hx = 380 + i * 2.5 + (i % 2 === 0 ? -5 : 5);
      rectOp(svg, hx - 2, hy - 3, 4, 6, HUELLA, 1);          // la huella: un piececito redondeado
      rectOp(svg, hx - 3, hy - 2, 6, 4, HUELLA, 1);
    }

    // 7. Montoncitos de cubitos de nieve, bien apoyados (con sombra)
    montoncito(svg, 272, 978, 3, azar);
    montoncito(svg, 586, 976, 3, azar);
    montoncito(svg, 330, 1190, 3, azar);
    montoncito(svg, 548, 1190, 3, azar);

    // 8. Detalles clavados en la nieve: un bastón de caramelo y una ramita de abeto
    g = grupo(svg);                          // bastón (pixel art de 3 px)
    rectOp(g, 560, 1184, 26, 5, SOMBRA_NIEVE, 1);
    [[0, 0], [1, 0], [2, 0], [3, 1], [3, 2], [-1, 1]].forEach(function (c, k) {
      rect(g, 566 + c[0] * 3, 1136 + c[1] * 3, 3, 3, k % 2 === 0 ? COLOR.rojo : COLOR.glaseado);
    });
    for (i = 0; i < 15; i++) rect(g, 563, 1139 + i * 3, 3, 3, i % 2 === 0 ? COLOR.glaseado : COLOR.rojo);
    rect(g, 559, 1180, 11, 5, COLOR.glaseado);              // nieve al pie

    g = grupo(svg);                          // ramita de abeto
    rectOp(g, 380, 1182, 40, 5, SOMBRA_NIEVE, 1);
    for (i = 0; i < 9; i++) {
      var rx = 384 + i * 3.5, ry = 1180 - i * 4;
      rect(g, rx, ry, 3, 4, COLOR.sombra);                   // tallito
      if (i > 1) {
        rect(g, rx - 5, ry - 1, 5, 3, i % 2 === 0 ? COLOR.verde : COLOR.verdeClaro);   // agujas
        rect(g, rx + 3, ry + 1, 5, 3, i % 2 === 0 ? COLOR.verdeClaro : COLOR.verde);
      }
    }
    rect(g, 408, 1146, 8, 3, COLOR.glaseado);               // nieve en la punta
    rect(g, 380, 1178, 14, 5, COLOR.glaseado);              // y al pie

    // 9. Sombras bajo los palitos de los carteles
    rectOp(svg, 106, 1124, 52, 6, SOMBRA_NIEVE, 1);
    rectOp(svg, 694, 1164, 52, 6, SOMBRA_NIEVE, 1);

    // 10. Brillitos que titilan en la nieve (CSS los anima con retrasos distintos)
    var sitios = [[262, 930], [318, 944], [455, 936], [528, 966], [602, 938], [286, 1128], [352, 1158],
                  [470, 1140], [520, 1168], [590, 1122], [40, 908], [812, 906], [232, 912], [640, 904]];
    sitios.forEach(function (s, k) {
      var b = grupo(svg);
      b.setAttribute('class', 'brillito');
      b.setAttribute('style', 'animation-delay: ' + (-azar() * 3.2).toFixed(2) + 's');
      var color = k % 3 === 0 ? '#ffe9a8' : '#ffffff';
      rect(b, s[0] - 1, s[1] - 3, 2, 6, color);
      rect(b, s[0] - 3, s[1] - 1, 6, 2, color);
    });
  }

  /* Estrellitas cuadradas, pequeñas y discretas */
  function construirEstrellas() {
    var svg = document.getElementById('estrellas');
    var azar = crearAzar(2112);
    for (var i = 0; i < 26; i++) {
      var x = Math.round(20 + azar() * 808), y = Math.round(16 + azar() * 840);
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('fill', '#f7efe4');
      g.setAttribute('opacity', (0.16 + azar() * 0.24).toFixed(2));
      if (azar() < 0.35) {                 // en cruz
        rect(g, x - 2, y - 6, 4, 12, '#f7efe4');
        rect(g, x - 6, y - 2, 12, 4, '#f7efe4');
      } else {
        var lado = azar() < 0.5 ? 3 : 4;
        rect(g, x, y, lado, lado, '#f7efe4');
      }
      svg.appendChild(g);
    }
  }

  /* Bombillitas HTML alrededor del cartelito y de la etiqueta */
  function construirGuirnaldasHTML() {
    var cuenta = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.guirnalda'), function (g) {
      var conArriba = g.getAttribute('data-arriba') === 'si';
      var nH = conArriba ? 8 : 7, nV = conArriba ? 7 : 9;
      var puntos = [], i;
      if (conArriba) for (i = 0; i < nH; i++) puntos.push([i / nH, 0]);
      for (i = conArriba ? 0 : 1; i < nV; i++) puntos.push([1, i / nV]);
      for (i = nH; i > 0; i--) puntos.push([i / nH, 1]);
      for (i = nV; i > (conArriba ? 0 : 1); i--) puntos.push([0, i / nV]);
      if (!conArriba) puntos.push([0, 1 / nV]);
      puntos.forEach(function (p) {
        var el = document.createElement('span');
        el.className = 'bombilla';
        el.style.left = (p[0] * 100).toFixed(2) + '%';
        el.style.top = (p[1] * 100).toFixed(2) + '%';
        el.style.setProperty('--color', COLORES_BOMBILLA[cuenta++ % 5]);
        g.appendChild(el);
        bombillas.push({ encendida: Math.random() < 0.5, el: el });
      });
    });
  }

  /* --- Parpadeo común (tejado + carteles): al azar y, a veces, todas a la vez --- */
  var proximoCambio = 0, proximaFiesta = 5, fiestaHasta = -1;
  var colorTemporal = new THREE.Color();
  var BLANCO = new THREE.Color('#ffffff');

  function actualizarBombillas(dt, ahora) {
    if (ahora >= proximoCambio) {
      proximoCambio = ahora + 0.9;                         // ritmo tranquilo
      if (ahora >= proximaFiesta) {
        fiestaHasta = ahora + 2;
        proximaFiesta = ahora + 9 + Math.random() * 6;
      }
      var fiesta = ahora < fiestaHasta;
      bombillas.forEach(function (b) {
        if (fiesta) b.encendida = true;
        else if (Math.random() < 0.3) b.encendida = !b.encendida;
        if (b.el) b.el.classList.toggle('encendida', b.encendida);
      });
    }
    // Las 3D cambian de brillo con suavidad
    var suavizado = 1 - Math.exp(-dt * 5);
    var colores = haloBombillas.geometry.attributes.color;
    bombillas3d.forEach(function (b) {
      b.brillo += ((b.encendida ? 1 : 0) - b.brillo) * suavizado;
      colorTemporal.copy(b.base).multiplyScalar(0.4 + 0.6 * b.brillo).lerp(BLANCO, 0.25 * b.brillo);
      mallaBombillas.setColorAt(b.indice, colorTemporal);
      colores.setXYZ(b.indice, b.base.r * b.brillo * 0.8, b.base.g * b.brillo * 0.8, b.base.b * b.brillo * 0.8);
    });
    mallaBombillas.instanceColor.needsUpdate = true;
    colores.needsUpdate = true;
  }


  /* =========================================================
     PARTE 3 · ANIMACIÓN SOLA Y EVENTOS
     ========================================================= */
  var reloj = 0;                           // segundos desde que empezó la animación
  var movimientoReducido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ayudante = new THREE.Object3D();     // para componer matrices de los InstancedMesh

  function azar(min, max) { return min + Math.random() * (max - min); }
  function elegir(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

  /* Pieza de cubos reutilizable (chispitas y glaseado) */
  function crearReserva(maximo, material, geometria) {
    var malla = new THREE.InstancedMesh(geometria || new THREE.BoxGeometry(1, 1, 1), material, maximo);
    // Primero los colores: setColorAt crea el búfer con el tamaño de "count", así que aún debe valer "maximo"
    for (var i = 0; i < maximo; i++) malla.setColorAt(i, BLANCO);
    malla.count = 0;                       // luego, empieza sin ninguna pieza visible
    malla.frustumCulled = false;
    escena.add(malla);
    return malla;
  }


  /* ---------- 1. NIEVE SUAVE: copos redondos por delante y por detrás de la casa ---------- */
  var NUM_COPOS = 260;
  var copos = [];
  var geoNieve = new THREE.BufferGeometry();
  var posCopos = new Float32Array(NUM_COPOS * 3);
  var tamCopos = new Float32Array(NUM_COPOS);
  var alfaCopos = new Float32Array(NUM_COPOS);

  function colocarCopo(c, arriba) {
    c.x = azar(-30, 30);
    c.y = arriba ? azar(36, 44) : azar(-38, 40);
    c.z = azar(-12, 30);                   // la casa ocupa de z -9 a 9: unos copos pasan detrás, otros delante
    c.vy = azar(1.0, 2.6);                 // cubos por segundo
    c.amp = azar(0.3, 1.1);                // vaivén
    c.frec = azar(0.3, 0.9);
    c.fase = azar(0, Math.PI * 2);
    c.tam = 0.2 + Math.pow(Math.random(), 2.2) * 0.65;   // muchos pequeños, pocos grandes
    c.alfa = azar(0.35, 0.9);
  }
  for (var nc = 0; nc < NUM_COPOS; nc++) {
    var copo = {};
    colocarCopo(copo, false);
    copos.push(copo);
    tamCopos[nc] = copo.tam;
    alfaCopos[nc] = copo.alfa;
  }
  geoNieve.setAttribute('position', new THREE.BufferAttribute(posCopos, 3));
  geoNieve.setAttribute('tam', new THREE.BufferAttribute(tamCopos, 1));
  geoNieve.setAttribute('alfa', new THREE.BufferAttribute(alfaCopos, 1));

  /* Shader: cada copo es un círculo de borde suave; el tamaño depende de la distancia */
  var materialNieve = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(COLOR.glaseado) },
      escala: { value: 1000 }
    },
    vertexShader: [
      'attribute float tam;',
      'attribute float alfa;',
      'uniform float escala;',
      'varying float vAlfa;',
      'void main() {',
      '  vAlfa = alfa;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_PointSize = tam * escala / -mv.z;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 color;',
      'varying float vAlfa;',
      'void main() {',
      '  float d = length(gl_PointCoord - vec2(0.5));',
      '  if (d > 0.5) discard;',
      '  gl_FragColor = vec4(color, vAlfa * (1.0 - smoothstep(0.28, 0.5, d)));',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false
  });
  var nieve = new THREE.Points(geoNieve, materialNieve);
  nieve.frustumCulled = false;
  escena.add(nieve);

  function actualizarNieve(dt) {
    var paso = movimientoReducido ? dt * 0.3 : dt;
    for (var i = 0; i < NUM_COPOS; i++) {
      var c = copos[i];
      c.y -= c.vy * paso;
      if (c.y < -40) colocarCopo(c, true);
      posCopos[i * 3] = c.x + Math.sin(reloj * c.frec + c.fase) * c.amp;
      posCopos[i * 3 + 1] = c.y;
      posCopos[i * 3 + 2] = c.z;
    }
    geoNieve.attributes.position.needsUpdate = true;
  }


  /* ---------- 2. LA CASA FLOTA Y GIRA HACIA EL CURSOR (suavizado) ---------- */
  var PIVOTE_Y = pivote.position.y;
  var GIRO_MAX = 0.22;                     // radianes: «un poco»
  var giro = { objetivoY: 0, objetivoX: 0 };

  function moverCasa(dt) {
    var flota = movimientoReducido ? 0 : (1 - Math.cos(reloj * 1.1)) * 0.22;   // sube y baja 0…0,44 cubos
    pivote.position.y = PIVOTE_Y + flota;
    pivote.rotation.z = movimientoReducido ? 0 : Math.sin(reloj * 0.7) * 0.01;
    var suavizado = 1 - Math.exp(-dt * 3.5);
    pivote.rotation.y += (giro.objetivoY - pivote.rotation.y) * suavizado;
    pivote.rotation.x += (giro.objetivoX - pivote.rotation.x) * suavizado;
    if (sombraCasa) sombraCasa.setAttribute('opacity', (1 - flota * 0.9).toFixed(2));
  }


  /* ---------- 3. CURSOR: MANGA PASTELERA EN PIXEL ART 2D (SVG, 44 px) ----------
     Cono alargado inclinado 45°: la boquilla, abajo a la izquierda, es la punta del cursor.
     Se dibuja en una rejilla de 22 × 22 píxeles (2 px del diseño cada uno). */
  var Z_MANGA = 13;                        // plano 3D delante de la casa donde cae el rastro de glaseado
  var PLANO_MANGA = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z_MANGA);
  var manga = document.getElementById('manga');
  var MANGA_REJILLA = 22;
  var MANGA_PUNTA = { x: 1.5, y: 20.5 };   // centro del píxel de la punta, dentro de la rejilla

  function dibujarManga() {
    var BOLSA = '#fff8ef', BORDE = '#d9cfc2', GLASEADO = '#ffffff', PLIEGUE = '#e9dfd2';
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + MANGA_REJILLA + ' ' + MANGA_REJILLA);
    svg.setAttribute('shape-rendering', 'crispEdges');
    var R2 = Math.SQRT2;

    for (var py = 0; py < MANGA_REJILLA; py++) {
      for (var px = 0; px < MANGA_REJILLA; px++) {
        var rx = px + 0.5 - MANGA_PUNTA.x, ry = py + 0.5 - MANGA_PUNTA.y;
        var u = (rx - ry) / R2;            // distancia a lo largo del cono, desde la punta
        var w = (rx + ry) / R2;            // distancia al eje (negativa = lado de arriba, el iluminado)
        var aw = Math.abs(w);
        var color = null, opacidad = 1, mw;

        if (u >= -0.3 && u < 4.4) {
          // Boquilla de estrella: plateada, con dientes y brillo en el lado de la luz
          mw = 0.7 + Math.max(0, u) * 0.4 + (Math.floor(u * 1.2) % 2 === 0 ? 0.45 : 0);
          if (aw <= mw) color = w < -0.1 ? PLATA_BRILLO : COLOR.plata;
        } else if (u >= 4.4 && u < 5.2) {
          if (aw <= 2.6) color = '#d9cfc2';                                 // aro entre boquilla y bolsa
        } else if (u >= 5.2 && u < 19.4) {
          // Bolsa: cono que se ensancha y se redondea arriba
          mw = u < 16 ? 2.4 + (u - 5.2) * 0.29 : 5.55 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 16) / 3.9, 2)));
          mw = Math.max(mw, 1.3);
          if (aw <= mw) {
            if (mw - aw < 0.9) color = BORDE;                                  // borde de la bolsa
            else if (u < 13.2 + Math.sin(w * 1.6) * 0.7) color = GLASEADO;    // glaseado dentro (opaco)
            else { color = BOLSA; opacidad = 0.62; }                          // bolsa crema translúcida
            if (color === BOLSA && w < -mw + 1.8 && u > 8) opacidad = 0.85;   // brillo del plástico
          }
        } else if (u >= 19.4 && u < 20.7) {
          if (aw <= 1.35) color = COLOR.rojo;                                // gomita roja
        } else if (u >= 20.7 && u < 24.6) {
          // Parte de arriba retorcida, que se abre un poco
          mw = 1.0 + (u - 20.7) * 0.38;
          if (aw <= mw) color = (mw - aw < 0.8) ? BORDE : (Math.floor(u - w * 0.9) % 2 === 0 ? BOLSA : PLIEGUE);
        }

        if (!color) continue;
        var r = document.createElementNS(SVGNS, 'rect');
        r.setAttribute('x', px);
        r.setAttribute('y', py);
        r.setAttribute('width', 1);
        r.setAttribute('height', 1);
        r.setAttribute('fill', color);
        if (opacidad < 1) r.setAttribute('fill-opacity', opacidad);
        svg.appendChild(r);
      }
    }
    manga.appendChild(svg);
  }
  dibujarManga();

  /* Coloca la manga para que la punta de la boquilla quede justo en el ratón */
  function colocarManga(clienteX, clienteY) {
    var r = cartel.getBoundingClientRect();
    var lado = manga.offsetWidth;
    var x = clienteX - r.left - MANGA_PUNTA.x / MANGA_REJILLA * lado;
    var y = clienteY - r.top - MANGA_PUNTA.y / MANGA_REJILLA * lado;
    manga.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
  }


  /* ---------- 4. RASTRO DE GLASEADO: gotitas finas que gotean y se desvanecen en menos de 1 s ----------
     Una gotita cada cierto trecho (no una línea continua), como mucho las 22 últimas,
     y si el ratón da un salto largo no se rellena el hueco: nunca cruza la casa una raya. */
  var MAX_GOTITAS = 22;
  var mallaGlaseado = crearReserva(MAX_GOTITAS * 2, new THREE.MeshLambertMaterial({ color: COLOR.glaseado }));
  var glaseado = [];                       // { x, y, nace, gota, max, vel }
  var GOTITA = 0.3;                        // lado de cada gotita (fina)
  var SEPARACION = 0.55;                   // trecho entre gotitas
  var SALTO_MAXIMO = 3;                    // más que esto entre dos fotogramas: no se rellena
  var VIDA_GLASEADO = 0.5, DESVANECE = 0.45;   // 0,95 s en total
  var trecho = 0;                          // recorrido desde la última gotita

  function glasear(a, b) {
    var distancia = a.distanceTo(b);
    if (distancia > SALTO_MAXIMO) {        // salto largo: una sola gotita donde está la boquilla
      trecho = 0;
      ponerGotita(b.x, b.y);
      return;
    }
    trecho += distancia;
    while (trecho >= SEPARACION) {
      trecho -= SEPARACION;
      var u = 1 - trecho / Math.max(distancia, 0.001);
      ponerGotita(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    }
  }

  function ponerGotita(x, y) {
    glaseado.push({ x: x, y: y, nace: reloj, gota: Math.random() < 0.3, max: azar(0.25, 0.55), vel: azar(1.0, 1.6) });
    while (glaseado.length > MAX_GOTITAS) glaseado.shift();
  }

  function actualizarGlaseado() {
    var n = 0, vivos = [];
    glaseado.forEach(function (b) {
      var edad = reloj - b.nace;
      var s = edad < VIDA_GLASEADO ? 1 : 1 - (edad - VIDA_GLASEADO) / DESVANECE;   // se desvanece encogiéndose
      if (s <= 0) return;
      vivos.push(b);
      ayudante.rotation.set(0, 0, 0);
      // la gotita
      ayudante.position.set(b.x, b.y, Z_MANGA - 0.1);
      ayudante.scale.setScalar(GOTITA * s);
      ayudante.updateMatrix();
      mallaGlaseado.setMatrixAt(n++, ayudante.matrix);
      if (!b.gota) return;
      // algunas gotean: un hilito fino que crece a saltitos
      var largo = Math.max(0.05, Math.min(b.max, Math.floor(edad * b.vel / 0.1) * 0.1));
      ayudante.position.set(b.x, b.y - GOTITA / 2 - largo / 2, Z_MANGA - 0.1);
      ayudante.scale.set(0.1 * s, largo * s, 0.1 * s);
      ayudante.updateMatrix();
      mallaGlaseado.setMatrixAt(n++, ayudante.matrix);
    });
    glaseado = vivos;
    mallaGlaseado.count = n;
    mallaGlaseado.instanceMatrix.needsUpdate = true;
  }


  /* ---------- 5. EVENTOS DEL RATÓN ---------- */
  var raycaster = new THREE.Raycaster();
  var raton = { dentro: false, sobreCartel: false, movido: false, ndc: new THREE.Vector2() };
  var puntoManga = new THREE.Vector3();
  var puntoAnterior = null;
  var ventanaActual = -1;
  var encendidas = 0;
  var completo = false;
  var finalEn = -1;

  /* mousemove: posición del ratón, giro de la casa y si está sobre los carteles HTML */
  cartel.addEventListener('mousemove', function (e) {
    var r = lienzo.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width * 2 - 1;
    var ny = -((e.clientY - r.top) / r.height * 2 - 1);
    raton.ndc.set(nx, ny);
    raton.dentro = true;
    raton.movido = true;
    raton.sobreCartel = !!(e.target && e.target.closest && e.target.closest('.cartelito, .etiqueta'));
    giro.objetivoY = Math.max(-1, Math.min(1, nx)) * GIRO_MAX;
    giro.objetivoX = -ny * 0.05;
    // la manga sigue al ratón; sobre los carteles HTML se ve el cursor normal
    colocarManga(e.clientX, e.clientY);
    manga.classList.toggle('visible', !raton.sobreCartel);
  });
  cartel.addEventListener('mouseenter', function () {
    raton.dentro = true;
  });
  /* mouseleave del cartel: la casa vuelve al frente, la manga desaparece y la ventana se apaga a brillo suave */
  cartel.addEventListener('mouseleave', function () {
    raton.dentro = false;
    puntoAnterior = null;
    giro.objetivoY = giro.objetivoX = 0;
    manga.classList.remove('visible');
  });

  /* «mouseenter» / «mouseleave» de cada ventana: el raycaster dice qué ventana hay bajo el cursor */
  function elegirVentana(i) {
    if (i === ventanaActual) return;
    if (ventanaActual >= 0) bajarLuz(ventanaActual);        // sale: la luz baja a brillo suave
    if (i >= 0 && encenderVentana(i, reloj)) {              // entra: luz cálida y, la 1.ª vez, el regalo
      encendidas++;
      if (encendidas === ventanas.length) finalEn = reloj + 0.9;
    }
    ventanaActual = i;
  }

  function actualizarRaton() {
    if (!raton.dentro) {
      elegirVentana(-1);
      return;
    }
    raycaster.setFromCamera(raton.ndc, camara);

    // El rastro de glaseado sale de la boquilla: el punto 3D que queda justo bajo el ratón
    if (raycaster.ray.intersectPlane(PLANO_MANGA, puntoManga)) {
      var visible = !raton.sobreCartel;
      if (visible && raton.movido && puntoAnterior) glasear(puntoAnterior, puntoManga);
      puntoAnterior = visible ? puntoManga.clone() : null;
    }
    raton.movido = false;

    // ¿Qué ventana hay bajo el cursor?
    var nueva = -1;
    if (!raton.sobreCartel) {
      pivote.updateMatrixWorld(true);
      var choques = raycaster.intersectObjects(zonasVentana, false);
      if (choques.length) nueva = choques[0].object.userData.ventana;
    }
    elegirVentana(nueva);
  }


  /* ---------- 6. ESTADO FINAL: chispitas, lluvia de regalitos y mensaje ---------- */
  var mallaChispas = crearReserva(160, new THREE.MeshBasicMaterial());
  var chispas = [];
  var COLORES_CHISPA = [COLOR.luz, COLOR.glaseado, '#ffe9a8', COLOR.rojo];
  var bocaMundo = new THREE.Vector3();
  var chispasPendientes = 0;

  function actualizarChispas(dt) {
    if (completo) {
      chispasPendientes += dt * 16;        // unas 16 chispitas por segundo
      while (chispasPendientes >= 1 && chispas.length < 160) {
        chispasPendientes -= 1;
        casa.localToWorld(bocaMundo.copy(BOCA_CHIMENEA));
        chispas.push({
          x: bocaMundo.x + azar(-0.6, 0.6), y: bocaMundo.y, z: bocaMundo.z + azar(-0.6, 0.6),
          vx: azar(-0.7, 0.7), vy: azar(3, 5.5), fase: azar(0, 6.3),
          vida: 1, dura: azar(1.1, 1.9), tam: azar(0.2, 0.42), color: new THREE.Color(elegir(COLORES_CHISPA))
        });
      }
    }
    var n = 0;
    chispas = chispas.filter(function (c) {
      c.vida -= dt / c.dura;
      if (c.vida <= 0) return false;
      c.x += (c.vx + Math.sin(reloj * 4 + c.fase) * 0.5) * dt;
      c.y += c.vy * dt;
      c.vy *= 1 - dt * 0.5;
      ayudante.position.set(c.x, c.y, c.z);
      ayudante.rotation.set(0, 0, 0);
      ayudante.scale.setScalar(c.tam * (0.4 + 0.6 * c.vida));
      ayudante.updateMatrix();
      mallaChispas.setMatrixAt(n, ayudante.matrix);
      mallaChispas.setColorAt(n, c.color);
      n++;
      return true;
    });
    mallaChispas.count = n;
    mallaChispas.instanceMatrix.needsUpdate = true;
    mallaChispas.instanceColor.needsUpdate = true;
  }

  /* --- Regalitos vóxel que salen disparados de la chimenea ---
     Salen en arco, alternando hacia la izquierda y la derecha, giran en el aire y caen
     delante de la casa, en la franja de nieve visible entre los dos carteles, un poco
     por delante de la valla. Nunca sobre la puerta, los carteles ni el mensaje final.
     Los 8 primeros forman dos montoncitos fijos (4 a cada lado de la puerta) que se quedan
     en el estado final; los demás caen en sitios al azar y se desvanecen poco a poco.
     Van en coordenadas del mundo (no flotan con la casa), igual que la nieve dibujada. */
  var TOTAL_REGALITOS = 18;
  var FIJOS = 8;
  var LADO_REGALITO = 0.22;                // cubito de los regalitos
  var ALTO_CAJA = 4 * LADO_REGALITO;       // para apilarlos (sin contar el lazo)
  var Z_REGALITOS = 12;                    // un poco por delante de la valla (z ≈ 9 en la casa)
  var MODELOS_REGALITO = [                 // [papel, cinta]
    [COLOR.rojo, ORO], [COLOR.verde, COLOR.rojo], [COLOR.glaseado, COLOR.rojo], [ORO, COLOR.verde]
  ];
  var GRAVEDAD = 14;                       // cubos/s²
  var regalitos = [];
  var regalitosSalidos = 0;
  var proximoRegalito = 0;
  var sitiosRegalitos = null;              // se calculan una vez, a partir de puntos de la pantalla
  var bocaLanzamiento = new THREE.Vector3();

  /* Punto 3D, en el plano z dado, que se ve en (sx, sy) px del diseño */
  function puntoDePantalla(sx, sy, z) {
    var rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(sx / ANCHO * 2 - 1, -(sy / ALTO * 2 - 1)), camara);
    var p = new THREE.Vector3();
    rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), p);
    return p;
  }

  /* Sitios de aterrizaje (en px del diseño): montones fijos a cada lado de la puerta,
     y tramos libres a izquierda, centro y derecha para los demás (la puerta queda en 376–472). */
  function calcularSitios() {
    sitiosRegalitos = {
      montonIzquierdo: puntoDePantalla(334, 954, Z_REGALITOS),
      montonDerecho: puntoDePantalla(514, 954, Z_REGALITOS),
      tramos: [[262, 352], [356, 372], [478, 494], [496, 598]]   // [desde, hasta] en x
    };
    // en cada montón: 2 abajo, 1 encima y otro arriba, algo desplazados y girados
    sitiosRegalitos.huecosMonton = [[-0.62, 0.15, 0.25], [0.6, -0.1, -0.3], [0.05, 0.05, 0.55], [-0.1, -0.05, -0.2]];
  }

  function crearRegalito(papel, cinta) {
    var L = LADO_REGALITO, lista = [], x, y, z;
    for (x = -2; x <= 2; x++) {
      for (y = 0; y <= 3; y++) {
        for (z = -2; z <= 2; z++) lista.push({ x: x * L, y: y * L + L / 2, z: z * L, color: (x === 0 || z === 0) ? cinta : papel });
      }
    }
    // lazo encima: nudo y dos lazadas
    [[-1, 4], [0, 4], [1, 4], [-2, 5], [-1, 5], [1, 5], [2, 5]].forEach(function (p) {
      lista.push({ x: p[0] * L, y: p[1] * L + L / 2, z: 0, color: cinta });
    });
    var malla = crearMallaVoxel(lista, L);
    malla.material.transparent = true;     // para desvanecerse poco a poco
    var grupoRegalo = new THREE.Group();
    grupoRegalo.add(malla);
    escena.add(grupoRegalo);
    return grupoRegalo;
  }

  /* Destino del regalito n.º k: [x, z, suelo, giro final] en el mundo */
  function destinoRegalito(k) {
    if (!sitiosRegalitos) calcularSitios();
    if (k < FIJOS) {
      var monton = k % 2 === 0 ? sitiosRegalitos.montonIzquierdo : sitiosRegalitos.montonDerecho;
      var hueco = sitiosRegalitos.huecosMonton[Math.floor(k / 2)];
      return [monton.x + hueco[0], Z_REGALITOS + hueco[1], monton.y, hueco[2]];
    }
    var tramo = elegir(sitiosRegalitos.tramos);
    var p = puntoDePantalla(azar(tramo[0], tramo[1]), azar(944, 960), Z_REGALITOS);
    return [p.x, Z_REGALITOS + azar(-0.4, 0.4), p.y, azar(-0.6, 0.6)];
  }

  function soltarRegalito() {
    var k = regalitosSalidos++;
    var destino = destinoRegalito(k);
    var modelo = MODELOS_REGALITO[(k + Math.floor(k / 4)) % MODELOS_REGALITO.length];   // colores variados
    casa.localToWorld(bocaLanzamiento.copy(BOCA_CHIMENEA));
    var vuelo = azar(2.4, 2.8);
    var lado = destino[0] < bocaLanzamiento.x - 3 ? -1 : 1;
    regalitos.push({
      grupo: crearRegalito(modelo[0], modelo[1]),
      x0: bocaLanzamiento.x, y0: bocaLanzamiento.y, z0: bocaLanzamiento.z, sale: reloj,
      vx: (destino[0] - bocaLanzamiento.x) / vuelo, vz: (destino[1] - bocaLanzamiento.z) / vuelo,
      vy: (destino[2] - bocaLanzamiento.y) / vuelo + GRAVEDAD * vuelo / 2,   // arco que cae en su sitio
      x: bocaLanzamiento.x, y: bocaLanzamiento.y, z: bocaLanzamiento.z,
      suelo: destino[2], giroFinal: destino[3],
      giro: azar(0, 6.3), vgiro: azar(2, 3.5) * lado,                        // giran en el aire
      vuelta: 0, vvuelta: azar(3, 5) * lado,
      fijo: k < FIJOS, aterrizo: -1, opacidad: 1
    });
  }

  function actualizarRegalitos(dt) {
    if (completo && regalitosSalidos < TOTAL_REGALITOS && reloj >= proximoRegalito) {
      soltarRegalito();
      proximoRegalito = reloj + azar(0.45, 0.7);
    }
    regalitos = regalitos.filter(function (r) {
      // Apoyo: la nieve o la caja que haya debajo (de las que aterrizaron antes)
      var apoyo = r.suelo;
      regalitos.forEach(function (o) {
        if (o === r || o.aterrizo < 0 || (r.aterrizo >= 0 && o.aterrizo > r.aterrizo)) return;
        if (Math.abs(o.x - r.x) < 0.95 && Math.abs(o.z - r.z) < 1.0) apoyo = Math.max(apoyo, o.y + ALTO_CAJA);
      });

      if (r.aterrizo < 0) {
        // En el aire: arco con gravedad, dando vueltas
        var t = reloj - r.sale;
        r.x = r.x0 + r.vx * t;
        r.z = r.z0 + r.vz * t;
        r.y = r.y0 + r.vy * t - GRAVEDAD * t * t / 2;
        r.giro += r.vgiro * dt;
        r.vuelta += r.vvuelta * dt;
        if (r.vy - GRAVEDAD * t < 0 && r.y <= apoyo) {
          r.y = apoyo;
          r.aterrizo = reloj;
        }
      } else {
        // En la nieve: se endereza y queda algo girado; los que no son fijos se desvanecen
        var derecho = Math.round(r.vuelta / (Math.PI * 2)) * Math.PI * 2;
        r.vuelta += (derecho - r.vuelta) * Math.min(1, dt * 10);
        var giroDestino = Math.round((r.giro - r.giroFinal) / (Math.PI * 2)) * Math.PI * 2 + r.giroFinal;
        r.giro += (giroDestino - r.giro) * Math.min(1, dt * 6);
        if (r.y > apoyo) r.y = Math.max(apoyo, r.y - 4 * dt);   // si se va el de abajo, baja
        if (!r.fijo) {
          var quieto = reloj - r.aterrizo;
          if (quieto > 3.5) r.opacidad = Math.max(0, 1 - (quieto - 3.5) / 1.5);
          if (r.opacidad <= 0) {
            escena.remove(r.grupo);
            r.grupo.children[0].geometry.dispose();
            r.grupo.children[0].material.dispose();
            return false;
          }
        }
      }
      r.grupo.position.set(r.x, r.y, r.z);
      r.grupo.rotation.set(0, r.giro, r.vuelta);
      r.grupo.children[0].material.opacity = r.opacidad;
      return true;
    });
  }

  /* Con las 4 ventanas encendidas: es el estado final (no hay vuelta atrás) */
  function estadoFinal() {
    completo = true;
    proximoRegalito = reloj;
    cartel.classList.add('completo');      // el CSS muestra el mensaje final
  }


  /* --- Tamaño del canvas: sigue al cartel, sin deformarse --- */
  function ajustarTamano() {
    var r = cartel.getBoundingClientRect();
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderizador.setSize(r.width, r.height, false);
    // los copos miden lo mismo a cualquier tamaño de pantalla
    materialNieve.uniforms.escala.value = lienzo.height / (2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)));
  }


  /* ---------- Bucle de dibujo ---------- */
  var antes = null;
  function fotograma(ms) {
    var ahora = ms / 1000;                 // segundos
    var dt = antes === null ? 0 : Math.min(ahora - antes, 0.1);
    antes = ahora;
    reloj = ahora;

    moverCasa(dt);
    actualizarRaton();
    actualizarVentanas(dt, ahora);
    actualizarBombillas(dt, ahora);
    actualizarNieve(dt);
    actualizarGlaseado();
    actualizarChispas(dt);
    actualizarRegalitos(dt);
    if (finalEn > 0 && !completo && reloj >= finalEn) estadoFinal();

    renderizador.render(escena, camara);
    requestAnimationFrame(fotograma);
  }


  /* ---------- Arranque ---------- */
  construirSuelo();
  construirEstrellas();
  construirGuirnaldasHTML();
  ajustarTamano();
  window.addEventListener('resize', ajustarTamano);
  requestAnimationFrame(fotograma);
})();

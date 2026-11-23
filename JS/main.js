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
    glaseado:  '#ffffff',               // glaseado blanco puro (como el del tejado)
    sombraGlaseado: '#dfe6ef',          // sus sombras azuladas
    apagada:   '#3a1a14',                  // ventana sin luz
    luz:       '#ffd27a',               // luz de ventanas y amarillo cálido
    rojo:      '#c0283a',
    verde:     '#2e6b4a',
    verdeClaro:'#3f8a5f',
    plata:     '#c8ccd4',
    rosa:      '#f08aa6'                // pastel, solo como toque
  };
  /* Caramelos del tejado: navideños, con un toque pastel */
  /* Glaseado de colores: el de la manga (bolsa y rastro) y las perlitas de los marcos */
  var COLORES_GLASEADO = [COLOR.rojo, COLOR.verdeClaro, COLOR.rosa, '#8ee0c4', COLOR.plata];   // rojo, verde, rosa, menta y plata
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
  pivote.position.y = -0.9;             // la base queda apoyada en la nieve (y ≈ 946 px), lejos del eslogan
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

  /* Textura pixelada de los bloques: 16 × 16 píxeles grises claros con variaciones de tono, hecha con código.
     Se multiplica por el color de cada cubo (galleta, glaseado, abetos…). Cada cara de cada cubo enseña
     un trozo de 8 × 8 distinto (elegido por su posición), así no se nota que se repite. */
  var texturaBloque = null;
  function obtenerTexturaBloque() {
    if (texturaBloque) return texturaBloque;
    var n = 16, datos = new Uint8Array(n * n * 4), az = crearAzar(808);
    for (var i = 0; i < n * n; i++) {
      var v = 218 + Math.floor(az() * 38);           // tonos entre 0,85 y 1
      if (az() < 0.12) v -= 26;                      // algún píxel más oscuro
      datos[i * 4] = datos[i * 4 + 1] = datos[i * 4 + 2] = v;
      datos[i * 4 + 3] = 255;
    }
    texturaBloque = new THREE.DataTexture(datos, n, n, THREE.RGBAFormat);
    texturaBloque.wrapS = texturaBloque.wrapT = THREE.RepeatWrapping;
    texturaBloque.magFilter = THREE.NearestFilter;  // píxeles nítidos
    texturaBloque.minFilter = THREE.LinearMipmapLinearFilter;
    texturaBloque.generateMipmaps = true;
    texturaBloque.needsUpdate = true;
    return texturaBloque;
  }
  function pixelarMaterial(mat) {
    mat.map = obtenerTexturaBloque();
    mat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', [
        '#include <uv_vertex>',
        '#ifdef USE_INSTANCING',
        '  vec3 semilla = instanceMatrix[3].xyz * 1.37 + normal * 0.71;',
        '  vec2 trozo = floor(fract(sin(vec2(dot(semilla, vec3(12.9898, 78.233, 37.719)), dot(semilla, vec3(39.346, 11.135, 83.155)))) * 43758.5453) * 16.0);',
        '  vUv = (uv * 8.0 + trozo) / 16.0;',
        '#endif'
      ].join(String.fromCharCode(10)));
    };
    return mat;
  }

  /* Todos los cubos en un solo InstancedMesh (rápido). Los bloques (no los cubitos de decoración) llevan textura pixelada */
  function crearMallaVoxel(lista, lado) {
    var geo = new THREE.BoxGeometry(lado, lado, lado);
    var mat = new THREE.MeshLambertMaterial();
    if (lado >= 0.5) pixelarMaterial(mat);
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
  var PUERTA = { x0: -1, x1: 1, y0: 1, y1: 4 };      // sobre el zócalo de piedra: se sube por dos escalones

  function dentro(r, x, y) {
    return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  }
  function esHueco(x, y) {                 // en la pared: las ventanas llevan una fila más arriba (el arco)
    if (dentro(PUERTA, x, y)) return true;
    for (var i = 0; i < VENTANAS.length; i++) {
      var v = VENTANAS[i];
      if (x >= v.x0 && x <= v.x1 && y >= v.y0 && y <= v.y1 + 1) return true;
    }
    return false;
  }
  /* Piedra gris pixelada del zócalo, los escalones y el caminito */
  var GRISES_PIEDRA = ['#8e9199', '#a3a6ae', '#7c7f88', '#989ba3', '#b0b3ba'];
  function gris() { return variar(GRISES_PIEDRA[Math.floor(azarFijo() * GRISES_PIEDRA.length)], 0.03); }
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
          poner(x, y, z, y === 0 ? gris() : variar(COLOR.galleta, 0.07));               // abajo, el zócalo de piedra
        }
      }
    }

    // Marcos rojos de las ventanas (laterales y alféizar ancho; el arco de arriba va en cubitos, ponerArcos)
    VENTANAS.forEach(function (v) {
      for (var y = v.y0 - 1; y <= v.y1; y++) {
        for (var x = v.x0 - 1; x <= v.x1 + 1; x++) {
          if (esMarco(v, x, y)) poner(x, y, 7, variar(x === v.x1 + 1 || y === v.y0 - 1 ? ROJO_OSCURO : COLOR.rojo, 0.03));
        }
      }
      poner(v.x0 - 2, v.y0 - 1, 7, variar(ROJO_OSCURO, 0.03));
      poner(v.x1 + 2, v.y0 - 1, 7, variar(ROJO_OSCURO, 0.03));
    });

    // Puerta de galleta oscura, hundida; encima, un dintel de glaseado (a los lados, columnas de caramelo)
    for (var py = PUERTA.y0; py <= PUERTA.y1; py++) {
      for (var px = PUERTA.x0; px <= PUERTA.x1; px++) poner(px, py, 5, variar(COLOR.sombra, 0.05));
    }
    for (var fx = PUERTA.x0; fx <= PUERTA.x1; fx++) poner(fx, PUERTA.y1 + 1, 7, COLOR.glaseado);
  }

  /* --- Tejado a dos aguas, en escalera (por delante lleva las tejas y el glaseado de ponerTejado) --- */
  function construirTejado() {
    for (var k = 0; k <= 12; k++) {
      var w = 13 - k;                      // medio ancho de esta fila
      var y = 16 + k;
      for (var z = -7; z <= 7; z++) {
        var hilera = (z + 7 + (k % 2)) % 2 === 0;      // tejas al tresbolillo a lo largo del tejado
        [w, w - 1, -w, -(w - 1)].forEach(function (x) {
          poner(x, y, z, variar(hilera ? '#b87440' : '#d4935a', 0.04));
        });
      }
      // Hastial (el triángulo de galleta) delante y detrás
      for (var x = -(w - 2); x <= w - 2; x++) {
        poner(x, y, 6, variar(COLOR.galleta, 0.07));
        poner(x, y, -6, variar(COLOR.galleta, 0.07));
      }
    }
  }

  /* --- Chimenea (faldón derecho), de ladrillos de galleta --- */
  var BOCA_CHIMENEA = new THREE.Vector3(7, 30.6, -2);   // de aquí saldrán las chispitas
  var ROJO_OSCURO = '#9a1f2f';            // sombra del rojo (marcos y gorro)

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
      }
    }
    // Caminito de piedra hasta los escalones de la puerta
    for (var cz = 7; cz <= 9; cz++) {
      for (var cx = -1; cx <= 1; cx++) poner(cx, -1, cz, gris());
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
    // Pomo de la puerta (abajo a la derecha, para dejar sitio a las campanas)
    caramelos.push({ x: 1.05, y: 2.1, z: 5.75, color: COLOR.plata });
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

  /* --- Tejado: tejas de galleta en escamas, glaseado blanco puro con gotas y nieve en la cumbrera ---
     Desde delante se ve la cara frontal del tejado: una franja inclinada entre las líneas x + y = 27,4
     (sobre el hastial) y x + y = 30 (borde de fuera). En ella van las tejas redondas solapadas.
     Debajo, una capa gruesa de glaseado (#ffffff, sombra #dfe6ef) con gotas redondeadas de largos
     muy distintos, que nunca tocan "Feliz Navidad" ni el festón. Arriba, nieve blandita con bultitos. */
  var GLASEADO_PURO = '#ffffff', SOMBRA_GLASEADO = '#dfe6ef';
  var TEJA = '#c9824a', TEJA_CLARA = '#dd9a5f', TEJA_BORDE = '#8f522a', TEJA_DEBAJO = '#a9693a';
  var Z_TEJADO = 7.5;                      // cara de delante de las tejas

  function ponerTejado() {
    var azar = crearAzar(3131);
    var lado, xi, yi;
    for (var s = 0; s < 2; s++) {
      lado = s === 0 ? -1 : 1;
      for (xi = 0; xi < 60; xi++) {
        var ax = (xi + 0.5) * C;
        for (yi = 60; yi < 116; yi++) {
          var y = (yi + 0.5) * C;
          if (y > 28.5) continue;
          var p = ax + y;
          if (p >= 27.4 && p <= 30 && y >= 15.5) {
            // Tejas en escamas: una teja redonda a todo el ancho de la franja, solapadas hacia el alero
            var a = (30 - p) / Math.SQRT2;                     // 0 en el borde de fuera, 1,84 en el de dentro
            var b = (y - ax) / Math.SQRT2;                     // a lo largo, hacia la cumbrera
            var bb = b / 1.3;
            var fb = bb - Math.floor(bb);                      // 0 = abajo (hacia el alero), 1 = arriba
            var fa = a / 1.84 - 0.5;                           // -0,5 … 0,5 a lo ancho
            var r = Math.sqrt(fa * fa + (fb - 0.5) * (fb - 0.5) * 1.6);
            var color = TEJA;
            if (fb >= 0.5 || r < 0.38) color = (fa < -0.12 && fb > 0.45 && fb < 0.85) ? TEJA_CLARA : TEJA;   // la teja, con brillo
            else if (r < 0.5) color = TEJA_BORDE;              // su borde redondo, hacia el alero
            else color = TEJA_DEBAJO;                          // la sombra que deja sobre la de abajo
            color = variar(color, 0.03);
            cubito(lado * ax, y, Z_TEJADO + C / 2, color);
            cubito(lado * ax, y, Z_TEJADO + 1.5 * C, color);
          } else if (p >= 26.0 && p < 27.4 && y >= 15.5) {
            // Capa gruesa de glaseado bajo las tejas: un cordón redondeado (más grueso en el centro)
            var q = (p - 26.0) / 1.4;                          // 0 abajo … 1 arriba
            var capas = q > 0.2 && q < 0.85 ? 4 : (q > 0.08 ? 3 : 2);
            for (var g2 = 0; g2 < capas; g2++) {
              var luz = q > 0.35 || g2 === capas - 1 && q > 0.2;
              cubito(lado * ax, y, Z_TEJADO + (g2 + 0.5) * C, luz ? GLASEADO_PURO : SOMBRA_GLASEADO);
            }
          }
        }
        // Glaseado en el alero de abajo (bajo las tejas de la primera fila)
        if (ax >= 11.1 && ax <= 14.5) {
          cubito(lado * ax, 15.5 - C / 2, Z_TEJADO + C / 2, GLASEADO_PURO);
          cubito(lado * ax, 15.5 - C / 2, Z_TEJADO + 1.5 * C, GLASEADO_PURO);
          cubito(lado * ax, 15.5 - 1.5 * C, Z_TEJADO + C / 2, SOMBRA_GLASEADO);
        }
      }

      // Gotas redondeadas de largos muy distintos
      var LARGOS = [0.25, 1.5, 0.5, 0.25, 2.25, 0.75, 0.25, 1, 2.75, 0.5, 0.25, 1.75, 0.5, 1.25];
      var n = 0;
      for (var gx = 0.55; gx < 11; gx += 0.85) (function (x) {
        var arriba = 26.0 - x + 0.1;                             // borde de abajo del glaseado
        var largo = LARGOS[(n++ + s * 5) % LARGOS.length] + (azar() < 0.5 ? 0.25 : 0);
        var limite = 15.7;                                        // por encima del festón
        if (x <= 3.4) limite = 21.6;                              // por encima de "Feliz"
        else if (x <= 5.1) limite = 19.1;                         // por encima de "Navidad"
        limite += 0.5;                                            // lo que ocupa la bolita del final
        var cabe = arriba - limite;
        if (cabe < 0.25) return;                                  // aquí no cabe una gota
        gota(lado * x, arriba, Math.min(largo, cabe));
      })(gx);
      [11.7, 12.6, 13.5, 14.2].forEach(function (x, i) {           // en el alero
        gota(lado * x, 15.5 - 2 * C, [1.25, 0.5, 2, 0.75][(i + s) % 4]);
      });
    }

    // Nieve blandita con bultitos irregulares en la cumbrera
    for (xi = -8; xi < 8; xi++) {
      var nx = (xi + 0.5) * C;
      for (var zi = 0; zi < 62; zi++) {
        var nz = -7.5 + (zi + 0.5) * C;
        var h = 0.7 * (1 - (nx / 2.1) * (nx / 2.1)) + 0.2 * Math.sin(nz * 1.9 + nx * 2.3) + 0.13 * Math.sin(nz * 4.3 + 1) + azar() * 0.12;
        var alto = Math.max(1, Math.round(h / C));
        for (var j = 0; j < alto; j++) {
          var arribaDel = j === alto - 1;
          cubito(nx, 28.5 + (j + 0.5) * C, nz, (nx > 0.8 && !arribaDel) || (nx > 1.3) ? SOMBRA_GLASEADO : GLASEADO_PURO);
        }
      }
    }
    // Bultitos de nieve que asoman por delante de la cumbrera, de tamaños distintos
    [[-1.45, 28.55, 2.6], [-0.35, 28.95, 3.8], [0.85, 28.75, 3.1], [1.75, 28.4, 2.1]].forEach(function (b) {
      var r = b[2], n2 = Math.ceil(r);
      for (var i = -n2; i <= n2; i++) {
        for (var j2 = -n2; j2 <= n2; j2++) {
          if (i * i + j2 * j2 > r * r) continue;
          var sombra = i + j2 * -1 > r * 0.7 || j2 < -r * 0.55;          // abajo a la derecha, en sombra
          for (var g = 0; g < 2; g++) cubito(b[0] + i * C, b[1] + j2 * C, 7.6 + (g + 0.5) * C, sombra ? SOMBRA_GLASEADO : GLASEADO_PURO);
        }
      }
    });
  }

  /* Gota de glaseado: un chorro de 3 cubitos de ancho (luz a la izquierda, sombra a la derecha)
     que se ensancha y acaba en una bolita redonda */
  function gota(x, arriba, largo) {
    var x0 = (Math.floor(x / C) + 0.5) * C;
    var filas = Math.max(0, Math.round(largo / C) - 1);
    for (var g = 0; g < 3; g++) {
      var z = Z_TEJADO + C / 2 + g * C;
      if (g === 2 && filas < 2) continue;
      for (var i = 0; i < filas; i++) {
        var y = arriba - (i + 0.5) * C;
        cubito(x0 - C, y, z, GLASEADO_PURO);
        cubito(x0, y, z, GLASEADO_PURO);
        cubito(x0 + C, y, z, SOMBRA_GLASEADO);
      }
      var yb = arriba - (filas + 0.5) * C;                      // la bolita: 4 de ancho y 3 de alto
      [[-1, 0, 2], [-1, -1, 2], [0, -2, 1]].forEach(function (f) {
        for (var cx = f[0]; cx <= f[2]; cx++) {
          cubito(x0 + cx * C, yb + f[1] * C, z, cx === f[2] || f[1] === -2 ? SOMBRA_GLASEADO : GLASEADO_PURO);
        }
      });
    }
  }

  /* --- Cordón de glaseado sobre los marcos: grueso y redondeado ---
     Cubre la cara de delante del marco (z 7,5) con cubitos: en el centro de la banda 2 de grosor,
     en los bordes 1; los bordes de abajo y de la derecha, en sombra (#dfe6ef). */
  function cordonGlaseado(dentro, x0, x1, y0, y1, z0) {
    for (var x = x0 + C / 2; x < x1; x += C) {
      for (var y = y0 + C / 2; y < y1; y += C) {
        if (!dentro(x, y)) continue;
        var borde = !dentro(x - C, y) || !dentro(x + C, y) || !dentro(x, y - C) || !dentro(x, y + C);
        var sombra = !dentro(x + C, y) || !dentro(x, y - C);
        cubito(x, y, z0 + C / 2, borde && sombra ? COLOR.sombraGlaseado : COLOR.glaseado);
        if (!borde) cubito(x, y, z0 + 1.5 * C, COLOR.glaseado);
      }
    }
  }
  function ponerCordonesGlaseado() {
    cordonGlaseado(function (x, y) {           // dintel de la puerta
      return x > PUERTA.x0 - 0.5 && x < PUERTA.x1 + 0.5 && y > PUERTA.y1 + 0.5 && y < PUERTA.y1 + 1.5;
    }, PUERTA.x0 - 0.5, PUERTA.x1 + 0.5, PUERTA.y1 + 0.5, PUERTA.y1 + 1.5, 7.5);
    // Labio redondeado de glaseado en el borde de delante de la base de nieve (no sobre el caminito)
    for (var x = -14.5 + C / 2; x < 14.5; x += C) {
      if (Math.abs(x) < 1.5) continue;
      cubito(x, -0.5 - C / 2, 9.5 + C / 2, COLOR.glaseado);
      cubito(x, -0.5 + C / 2, 9.5 - C / 2, COLOR.glaseado);
      cubito(x, -0.5 - 1.5 * C, 9.5 + C / 2, COLOR.sombraGlaseado);
    }
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

  /* --- Dos piruletas de espiral a los lados de la puerta --- */
  function ponerPiruletas() {
    [[-3.45, COLOR.rojo], [3.45, COLOR.verde]].forEach(function (p) {
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

  /* --- Corona de Navidad en el centro de la fachada, entre las cuatro ventanas ---
     Anillo de abeto vóxel frondoso (radio 2,3), con bayas rojas y un lazo rojo abajo.
     Cabe entre las contraventanas (x = ±2,75), sobre el marco de la puerta (y 5,5)
     y bajo el festón del tejado (y ≈ 14,25). Sus lucecitas van con las del tejado (ponerGuirnaldaTejado). */
  var CORONA = { x: 0, y: 9.6, fuera: 2.3, dentro: 1.25 };
  function ponerCoronaFachada() {
    var azar = crearAzar(777);
    var verdes = [VERDE_ABETO, VERDE_ABETO_OSCURO, COLOR.verde, VERDE_ABETO];
    var z = 6.5 + C / 2;
    var n = Math.ceil(CORONA.fuera / C) + 1;
    var medio = (CORONA.fuera + CORONA.dentro) / 2, ancho = (CORONA.fuera - CORONA.dentro) / 2;
    for (var i = -n; i <= n; i++) {
      for (var j = -n; j <= n; j++) {
        var x = (i + 0.5) * C, y = (j + 0.5) * C;
        var r = Math.sqrt(x * x + y * y);
        var borde = Math.abs(r - medio) - ancho;                  // < 0 dentro del anillo
        if (borde > (azar() < 0.3 ? C : 0)) continue;            // ramitas sueltas en los bordes
        var capas = Math.abs(r - medio) < ancho * 0.45 ? 3 : 2;   // más bulto en el centro del anillo: redondeada
        var baya = capas === 3 && azar() < 0.07;
        for (var g = 0; g < capas; g++) {
          var color = (baya && g === capas - 1) ? COLOR.rojo : variar(verdes[Math.floor(azar() * verdes.length)], 0.05);
          cubito(CORONA.x + x, CORONA.y + y, z + g * C, color);
        }
      }
    }
    // Lazo rojo abajo, por delante del anillo, con las cintas colgando
    cubitosDeFilas(['xx...xx', 'xxx.xxx', 'xxxkxxx', 'xxx.xxx', 'xx.x.xx', '..x.x..', '.x...x.'],
      { x: COLOR.rojo, k: '#8e1b2a' }, CORONA.x - 3 * C, CORONA.y - CORONA.fuera + 4 * C, 6.5 + 3.5 * C, 1);
  }

  /* --- Columnas de bastón de caramelo: rayas rojas y blancas en espiral, con remate de glaseado ---
     Prisma de n × n cubitos (solo la piel); la raya avanza un cubito por fila alrededor de la columna. */
  function columnaCaramelo(cx, cz, yAbajo, yArriba, n) {
    var filas = Math.round((yArriba - yAbajo) / C), mitad = (n - 1) / 2;
    for (var j = 0; j < filas; j++) {
      var y = yAbajo + (j + 0.5) * C;
      for (var i = 0; i < n; i++) {
        for (var k = 0; k < n; k++) {
          if (i !== 0 && i !== n - 1 && k !== 0 && k !== n - 1) continue;      // solo la piel
          // posición alrededor de la columna (0 … 4n-4), para que la raya dé vueltas
          var vuelta = k === n - 1 ? i : (i === n - 1 ? n - 1 + (n - 1 - k) : (k === 0 ? 2 * (n - 1) + (n - 1 - i) : 3 * (n - 1) + k));
          var raya = ((j + vuelta) % 6 + 6) % 6 < 3;
          var color = raya ? (i === n - 1 ? ROJO_OSCURO : COLOR.rojo) : (i === n - 1 ? COLOR.sombraGlaseado : COLOR.glaseado);
          cubito(cx + (i - mitad) * C, y, cz + (k - mitad) * C, color);
        }
      }
    }
    for (var a = 0; a < n + 2; a++) {      // remate de glaseado, algo más ancho
      for (var b = 0; b < n + 2; b++) {
        var borde = a === n + 1 || b === 0;
        cubito(cx + (a - mitad - 1) * C, yArriba + C / 2, cz + (b - mitad - 1) * C, borde ? COLOR.sombraGlaseado : COLOR.glaseado);
      }
    }
  }
  function ponerColumnas() {
    columnaCaramelo(-11.5, 6.6, -0.5, 15.25, 5);      // esquinas de la fachada
    columnaCaramelo(11.5, 6.6, -0.5, 15.25, 5);
    columnaCaramelo(-2, 7, -0.5, 5.5, 4);             // junto a la puerta
    columnaCaramelo(2, 7, -0.5, 5.5, 4);
  }

  /* --- Arco escalonado encima de cada ventana ---
     El hueco sube una fila y se cierra con un arco: una banda roja (en cubitos, con su lado en sombra)
     entre dos medias elipses; por dentro se ve el cristal, que se enciende con la ventana. */
  var ARCO = { ai: 2.5, hi: 0.75, ae: 3.5, he: 1.5 };   // medio ancho y alto: hueco y borde de fuera
  function enArco(u, dy, a, h) { return dy >= 0 && (u / a) * (u / a) + (dy / h) * (dy / h) <= 1; }
  function ponerArcos() {
    VENTANAS.forEach(function (v) {
      var cx = (v.x0 + v.x1) / 2, yb = v.y1 + 0.5;
      for (var x = cx - ARCO.ae + C / 2; x < cx + ARCO.ae; x += C) {
        for (var y = yb + C / 2; y < yb + ARCO.he; y += C) {
          var u = x - cx, dy = y - yb;
          if (!enArco(u, dy, ARCO.ae, ARCO.he) || (Math.abs(u) < ARCO.ai && enArco(u, dy, ARCO.ai, ARCO.hi))) continue;
          var sombra = u > 0 && !enArco(u + C, dy, ARCO.ae, ARCO.he);
          // sobre el hueco (fila quitada de la pared) la banda llega hasta el fondo; si no, va sobre la pared
          var hondo = Math.abs(u) < ARCO.ai && dy < 1 ? 12 : 4;
          for (var g = 0; g < hondo; g++) cubito(x, y, 7.5 - C / 2 - g * C, sombra ? ROJO_OSCURO : COLOR.rojo);
        }
      }
    });
  }

  /* --- Dos escalones de piedra hasta la puerta, que siguen en el caminito --- */
  function ponerEscalones() {
    for (var x = -1.5 + C / 2; x < 1.5; x += C) {
      for (var z = 6.5 + C / 2; z < 8.5; z += C) {
        var arriba = z < 7.5 ? 0.5 : 0;      // el de arriba llega al umbral de la puerta
        for (var y = -0.5 + C / 2; y < arriba; y += C) {
          var cara = y > arriba - C;
          cubito(x, y, z, variar(cara ? '#b3b6bd' : GRISES_PIEDRA[Math.floor(azarFijo() * 4)], 0.03));
        }
      }
    }
  }

  /* --- Festón de glaseado bajo el tejado, de lado a lado de la fachada ---
     Olitas (arcos colgantes) de cubitos #fff8ef, con trazo de 2 cubitos y relieve de 2,
     como hechas con manga pastelera, y una perlita redonda en cada punto de unión. */
  var FESTON_ARRIBA = 15.5;                // borde de abajo del tejado
  var FESTON_OLAS = 11, FESTON_ANCHO = 2;  // 11 olitas de 2 cubos: de x = -11 a x = 11
  var FESTON_HONDO = [0, 1, 2, 3, 3, 2, 1, 0];   // cuánto baja cada columna de cubitos de una olita
  function ponerFestonTejado() {
    var desde = -FESTON_OLAS * FESTON_ANCHO / 2, z = 6.5 + C / 2;
    for (var o = 0; o < FESTON_OLAS; o++) {
      for (var u = 0; u < FESTON_HONDO.length; u++) {
        var x = desde + o * FESTON_ANCHO + C / 2 + u * C;
        var y = FESTON_ARRIBA - C / 2 - FESTON_HONDO[u] * C;
        for (var g = 0; g < 2; g++) {
          cubito(x, y, z + g * C, COLOR.glaseado);
          cubito(x, y - C, z + g * C, COLOR.sombraGlaseado);
        }
      }
    }
    // Perlitas en las uniones
    var perlas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshPhongMaterial({ color: COLOR.glaseado, emissive: 0x22252a, specular: 0x6a6e76, shininess: 70 }), FESTON_OLAS + 1);
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(0.28, 0.28, 0.24);
    for (var k = 0; k <= FESTON_OLAS; k++) {
      m.compose(new THREE.Vector3(desde + k * FESTON_ANCHO, FESTON_ARRIBA - 0.3, 6.5 + 0.5), q, e);   // por delante del trazo
      perlas.setMatrixAt(k, m);
    }
    casa.add(perlas);
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

  /* --- "Feliz Navidad" escrito con manga pastelera: perlitas de glaseado en fila ---
     Letra de un solo trazo, 7 filas (mayúsculas y astas de 7, minúsculas de 5). Cada punto del trazo
     es una perlita redonda blanca (#ffffff) que toca a la siguiente; en los pasos en diagonal se añade
     una perlita intermedia para que la fila no se corte. Debajo, una sombra suave sobre la galleta.
     "Navidad" va de y 16,3 a 18,2 y "Feliz" de 18,95 a 20,85: centradas y por debajo de las gotas del tejado. */
  var LETRAS = {
    F: ['xxxx', 'x...', 'x...', 'xxx.', 'x...', 'x...', 'x...'],
    e: ['....', '....', '.xx.', 'x..x', 'xxxx', 'x...', '.xxx'],
    l: ['x.', 'x.', 'x.', 'x.', 'x.', 'x.', '.x'],
    i: ['x', '.', 'x', 'x', 'x', 'x', 'x'],
    z: ['....', '....', 'xxxx', '..x.', '.x..', 'x...', 'xxxx'],
    N: ['x...x', 'xx..x', 'x.x.x', 'x..xx', 'x...x', 'x...x', 'x...x'],
    a: ['....', '....', '.xx.', '...x', '.xxx', 'x..x', '.xxx'],
    v: ['.....', '.....', 'x...x', 'x...x', '.x.x.', '.x.x.', '..x..'],
    d: ['...x', '...x', '.xxx', 'x..x', 'x..x', 'x..x', '.xxx']
  };
  var PASO_LETRA = 0.27;                   // distancia entre perlitas
  var R_PERLA_LETRA = 0.145;               // radio: se tocan unas con otras
  var Z_LETRAS = 6.5;                      // cara del hastial

  function ponerFelizNavidad() {
    var perlas = [];
    function palabra(texto, yAbajo) {
      var filas = ['', '', '', '', '', '', ''];
      texto.split('').forEach(function (l, n) {
        for (var r = 0; r < 7; r++) filas[r] += (n > 0 ? '.' : '') + LETRAS[l][r];
      });
      var ancho = filas[0].length;
      function en(c, r) { return r >= 0 && r < 7 && c >= 0 && c < ancho && filas[r].charAt(c) === 'x'; }
      function pos(c, r) { return { x: (c - (ancho - 1) / 2) * PASO_LETRA, y: yAbajo + (6 - r) * PASO_LETRA + PASO_LETRA / 2 }; }
      for (var r = 0; r < 7; r++) {
        for (var c = 0; c < ancho; c++) {
          if (!en(c, r)) continue;
          perlas.push(pos(c, r));
          // pasos en diagonal sin vecino recto: una perlita en medio
          [[1, 1], [-1, 1]].forEach(function (d) {
            if (en(c + d[0], r + d[1]) && !en(c + d[0], r) && !en(c, r + d[1])) {
              var a = pos(c, r), b = pos(c + d[0], r + d[1]);
              perlas.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, chica: true });
            }
          });
        }
      }
    }
    palabra('Navidad', 16.3);
    palabra('Feliz', 18.95);

    var geo = new THREE.SphereGeometry(1, 14, 10);
    var mallaPerlas = new THREE.InstancedMesh(geo,
      new THREE.MeshPhongMaterial({ color: COLOR.glaseado, emissive: 0x22252a, specular: 0x8a8e96, shininess: 80 }), perlas.length);
    var mallaSombras = new THREE.InstancedMesh(geo,
      new THREE.MeshBasicMaterial({ color: 0x7a4120, transparent: true, opacity: 0.32, depthWrite: false }), perlas.length);
    var m = new THREE.Matrix4();
    perlas.forEach(function (p, n) {
      var r = R_PERLA_LETRA * (p.chica ? 0.9 : 1);
      mallaPerlas.setMatrixAt(n, m.makeScale(r, r, r * 0.85).setPosition(p.x, p.y, Z_LETRAS + r * 0.55));
      mallaSombras.setMatrixAt(n, m.makeScale(r * 1.15, r * 1.15, 0.01).setPosition(p.x + 0.07, p.y - 0.09, Z_LETRAS + 0.015));
    });
    casa.add(mallaSombras);
    casa.add(mallaPerlas);
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

  ponerTejado();
  ponerCordonesGlaseado();
  ponerContraventanas();
  ponerPiruletas();
  ponerCoronaFachada();
  ponerColumnas();
  ponerArcos();
  ponerEscalones();
  ponerFestonTejado();
  ponerCalcetin();
  ponerFelizNavidad();
  ponerValla();
  casa.add(crearMallaVoxel(deco, C));

  /* --- Gorro de Papá Noel encima de la chimenea ---
     Vóxel rojo con borde blanco peludo y pompón, doblado hacia la derecha (no sube más de 1,8 cubos:
     no llega a la cinta del eslogan). Es una tapa: gira sobre una bisagra en su borde izquierdo
     (actualizarGorro). Cuando llega el trineo se levanta, el trineo entra y vuelve a caer con un rebote;
     cuando salen los regalos y cuando el trineo se va, se levanta un momento. */
  var BISAGRA_GORRO = new THREE.Vector3(4.75, 30.5, -2);
  var gorro = { grupo: new THREE.Group(), a: 0, v: 0, objetivo: 0, hasta: -1 };
  (function () {
    var lista = [], az = crearAzar(1225);
    function c(x, y, z, color) { lista.push({ x: x, y: y, z: z, color: color }); }
    var x, y, z, i;
    // borde peludo blanco: 18 × 18 cubitos y 2 de alto, con bultitos
    for (x = 4.75 + C / 2; x < 9.25; x += C) {
      for (z = -4.25 + C / 2; z < 0.25; z += C) {
        var fuera = x < 5 || x > 9 || z < -4 || z > 0;
        c(x, 30.5 + C / 2, z, fuera || az() < 0.25 ? COLOR.sombraGlaseado : COLOR.glaseado);
        if (!fuera || az() < 0.5) c(x, 30.5 + 1.5 * C, z, az() < 0.15 ? COLOR.sombraGlaseado : COLOR.glaseado);
      }
    }
    // cuerpo rojo: 5 capas que se estrechan y se doblan hacia la derecha
    for (var capa = 0; capa < 5; capa++) {
      var r = 1.95 - capa * 0.33, desvio = 0.1 * capa * capa;
      var cx = 7 + desvio, yC = 31 + (capa + 0.5) * C;
      for (x = cx - r + C / 2; x < cx + r; x += C) {
        for (z = -2 - r + C / 2; z < -2 + r; z += C) {
          var ladoSombra = x > cx + r * 0.35 || z < -2 - r * 0.6;
          c(x, yC, z, ladoSombra ? ROJO_OSCURO : COLOR.rojo);
        }
      }
    }
    // punta que cae hacia la derecha
    [[8.95, 32.05], [9.35, 31.9], [9.65, 31.7]].forEach(function (p) {
      for (i = -1; i <= 0; i++) for (var k = -1; k <= 0; k++) c(p[0] + (i + 0.5) * C, p[1], -2 + (k + 0.5) * C, k === 0 ? COLOR.rojo : ROJO_OSCURO);
    });
    // pompón blanco
    for (x = -2; x <= 2; x++) {
      for (y = -2; y <= 2; y++) {
        for (z = -2; z <= 2; z++) {
          if (x * x + y * y + z * z > 5) continue;
          c(10.0 + x * C * 0.9, 31.45 + y * C * 0.9, -2 + z * C * 0.9, x + y < -1 ? COLOR.glaseado : (x - y > 2 ? COLOR.sombraGlaseado : COLOR.glaseado));
        }
      }
    }
    var malla = crearMallaVoxel(lista, C);
    malla.position.copy(BISAGRA_GORRO).negate();
    gorro.grupo.position.copy(BISAGRA_GORRO);
    gorro.grupo.add(malla);
    casa.add(gorro.grupo);
  })();

  /* Levanta el gorro (0 cerrado … 1 abierto del todo); con «cuanto» segundos, vuelve a caer solo */
  function levantarGorro(cuanto, segundos) {
    gorro.objetivo = cuanto;
    gorro.hasta = segundos > 0 ? reloj + segundos : -1;
  }
  function actualizarGorro(dt) {
    if (gorro.hasta >= 0 && reloj >= gorro.hasta) { gorro.objetivo = 0; gorro.hasta = -1; }
    if (movimientoReducido) {
      gorro.a += (gorro.objetivo - gorro.a) * Math.min(1, dt * 8);
    } else if (gorro.objetivo > 0) {                        // se abre con un muelle suave
      gorro.v += (70 * (gorro.objetivo - gorro.a) - 13 * gorro.v) * dt;
      gorro.a += gorro.v * dt;
    } else if (gorro.a > 0 || gorro.v !== 0) {              // cae como una tapa y rebota
      gorro.v -= 16 * dt;
      gorro.a += gorro.v * dt;
      if (gorro.a <= 0) {
        gorro.a = 0;
        gorro.v = gorro.v < -1.2 ? -gorro.v * 0.32 : 0;
      }
    }
    gorro.a = Math.max(0, gorro.a);
    gorro.grupo.rotation.z = gorro.a * 1.15;                 // hasta unos 65°, hacia la izquierda
    gorro.grupo.position.y = BISAGRA_GORRO.y + gorro.a * 0.35;
  }


  /* --- Guirnalda de bombillitas por el borde del tejado (parpadean en actualizarBombillas) --- */
  var COLORES_BOMBILLA = [COLOR.rojo, COLOR.verdeClaro, COLOR.glaseado, COLOR.plata, COLOR.luz];
  var bombillas = [];                      // todas: las 3D del tejado y las HTML de los carteles
  var bombillas3d = [];
  var mallaBombillas, haloBombillas;

  var TEXTURA_HALO_BOMBILLA = null;
  function ponerGuirnaldaTejado() {
    TEXTURA_HALO_BOMBILLA = texturaHalo();
    var sitios = [];
    for (var k = 0; k <= 12; k++) {
      var w = 13 - k;
      sitios.push([-w, 16 + k - 0.3]);
      sitios.push([w, 16 + k - 0.3]);
    }
    sitios.push([0, 28 - 0.3]);
    sitios.sort(function (a, b) { return a[0] - b[0]; });   // de izquierda a derecha: colores en orden
    // lucecitas más pequeñas sobre la corona de la fachada (no abajo, donde va el lazo): [x, y, z, escala]
    var radioLuces = (CORONA.fuera + CORONA.dentro) / 2;
    [90, 135, 180, 225, 315, 0, 45].forEach(function (grados) {
      var ang = grados * Math.PI / 180;
      sitios.push([CORONA.x + Math.cos(ang) * radioLuces, CORONA.y + Math.sin(ang) * radioLuces, 6.5 + 3.8 * C, 0.75]);
    });

    var cuerpo = new THREE.BoxGeometry(0.42, 0.5, 0.42);
    mallaBombillas = new THREE.InstancedMesh(cuerpo, new THREE.MeshBasicMaterial(), sitios.length);
    var casquillos = [];
    var posiciones = new Float32Array(sitios.length * 3);
    var m = new THREE.Matrix4();
    sitios.forEach(function (s, i) {
      var z = s[2] || 8.3, escala = s[3] || 1;           // las del tejado, por delante de las tejas
      m.makeScale(escala, escala, escala).setPosition(s[0], s[1], z);
      mallaBombillas.setMatrixAt(i, m);
      mallaBombillas.setColorAt(i, new THREE.Color(COLORES_BOMBILLA[i % 5]));
      casquillos.push({ x: s[0], y: s[1] + 0.33 * escala, z: z, color: COLOR.plata });
      posiciones[i * 3] = s[0]; posiciones[i * 3 + 1] = s[1]; posiciones[i * 3 + 2] = z + 0.32;
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
      size: 4.2, map: TEXTURA_HALO_BOMBILLA, vertexColors: true, transparent: true,
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

  var abetos = [];                         // { grupo, malla, estrella, ... } (las bolitas, en la parte 3)
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
    var mallaAbeto = crearMallaVoxel(lista, 1);
    abeto.add(mallaAbeto);
    // Estrella dorada en la punta, de cara al público (compensa el giro del abeto)
    var estrella = crearEstrellaDorada();
    estrella.position.set(0, 13.4, 0);
    estrella.rotation.y = lado * 0.35;
    abeto.add(estrella);
    abeto.scale.setScalar(0.85);
    abeto.position.set(lado * 21.5, -19.17, -6);  // separados hacia los lados y atrás; la base, sobre la nieve
    abeto.rotation.y = lado * -0.35;
    escena.add(abeto);
    abetos.push({ grupo: abeto, malla: mallaAbeto, estrella: estrella, estrellaMaterial: estrella.material });
  }
  crearAbeto(-1);
  crearAbeto(1);


  /* --- Dos campanas de Navidad doradas en la puerta, colgando juntas de un lazo rojo ---
     Cuelgan de un pivote bajo el lazo; con mousemove reciben un empujoncito y se balancean un poco
     (muelle amortiguado en actualizarCampanas). */
  var B = 0.2;                             // cubito de las campanas y el lazo
  var ORO_OSCURO = '#b8862f';
  var PUERTA_PIVOTE = new THREE.Vector3(0, 4.05, 5.5 + 3.8 * B);   // delante de la puerta (z 5,5), sin tocarla

  function crearCampana() {
    var perfil = [3.3, 2.7, 2.3, 2.1, 2.0, 1.8, 1.4, 0.9];   // radio de cada fila, de abajo arriba: boca abierta
    var lista = [];
    for (var y = 0; y < perfil.length; y++) {
      for (var x = -3; x <= 3; x++) {
        for (var z = -3; z <= 3; z++) {
          if (x * x + z * z > perfil[y] * perfil[y]) continue;
          var color = ORO;
          if (y === 0) color = ORO_OSCURO;                                  // borde de la boca
          else if (x < 0 && z > 0 && y >= 2 && y <= 6) color = ORO_BRILLO;  // brillo del lado de la luz
          lista.push({ x: x * B, y: y * B, z: z * B, color: color });
        }
      }
    }
    lista.push({ x: 0, y: -B, z: 0, color: ORO_OSCURO }, { x: 0, y: -2 * B, z: 0, color: ORO_OSCURO });   // badajo
    lista.push({ x: 0, y: 8 * B, z: 0, color: ORO_OSCURO }, { x: 0, y: 9 * B, z: 0, color: COLOR.rojo });  // asa y cinta
    var malla = crearMallaVoxel(lista, B);
    malla.position.y = -10 * B;             // la cinta queda en el pivote: la campana cuelga
    return malla;
  }

  var campanas = new THREE.Group();
  campanas.position.copy(PUERTA_PIVOTE);
  var campanasHijas = [];
  [-1, 1].forEach(function (lado) {
    var colgador = new THREE.Group();       // cada una algo abierta hacia su lado: cuelgan juntas
    colgador.rotation.z = lado * 0.24;
    colgador.position.x = lado * 0.3;
    colgador.add(crearCampana());
    campanas.add(colgador);
    campanasHijas.push({ grupo: colgador, base: lado * 0.24 });
  });
  // Lazo rojo encima, por delante de las cintas
  (function () {
    var filas = ['xx...xx', 'xxx.xxx', 'xxxkxxx', 'xxx.xxx', 'xx.x.xx', '..x.x..', '.x...x.'];
    var lista = [];
    filas.forEach(function (fila, r) {
      for (var c = 0; c < fila.length; c++) {
        var ch = fila.charAt(c);
        if (ch === '.') continue;
        var color = ch === 'k' ? '#8e1b2a' : COLOR.rojo;
        lista.push({ x: (c - 3) * B, y: (2 - r) * B, z: B, color: color });
        if (r < 5) lista.push({ x: (c - 3) * B, y: (2 - r) * B, z: 0, color: color });
      }
    });
    campanas.add(crearMallaVoxel(lista, B));
  })();
  casa.add(campanas);

  var balanceo = { angulo: 0, velocidad: 0, empujon: 0 };
  function actualizarCampanas(dt) {
    if (dt <= 0) return;
    balanceo.velocidad += balanceo.empujon;
    balanceo.empujon = 0;
    balanceo.velocidad += (-28 * balanceo.angulo - 2.2 * balanceo.velocidad) * dt;   // muelle con freno
    balanceo.angulo = Math.max(-0.22, Math.min(0.22, balanceo.angulo + balanceo.velocidad * dt));
    campanas.rotation.z = balanceo.angulo;
    campanasHijas.forEach(function (h, i) {   // cada campana con un pequeño retraso, más vivo
      h.grupo.rotation.z = h.base + balanceo.angulo * (i === 0 ? 0.5 : -0.35);
    });
  }


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
  /* Sitios en la nieve (px del diseño): farolillos a los lados del caminito; arbustos y bloques de hielo */
  var FAROLILLOS = [[374, 976], [476, 976]];
  /* Perfil de «bloom»: núcleo intenso y una falda ancha que se apaga despacio (como la luz que se derrama) */
  function texturaHalo() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var g = cv.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 240, 200, 1)');
    grad.addColorStop(0.1, 'rgba(255, 220, 150, 0.8)');
    grad.addColorStop(0.28, 'rgba(255, 196, 110, 0.38)');
    grad.addColorStop(0.55, 'rgba(255, 175, 85, 0.12)');
    grad.addColorStop(0.8, 'rgba(255, 165, 80, 0.03)');
    grad.addColorStop(1, 'rgba(255, 160, 80, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }
  var TEXTURA_HALO = texturaHalo();

  /* Brillo cálido suave alrededor de las campanas (más intenso en el estado final) */
  var haloCampanas = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEXTURA_HALO, color: 0xffd27a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  haloCampanas.position.set(0, -1.5, -0.2);
  haloCampanas.scale.set(4.4, 4.4, 1);
  campanas.add(haloCampanas);

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
      new THREE.BoxGeometry(ancho, alto + 1, 1),          // una fila más: se ve dentro del arco
      new THREE.MeshLambertMaterial({ color: COLOR.apagada, emissive: new THREE.Color(COLOR.luz), emissiveIntensity: 0 })
    );
    cristal.position.set(cx, cy + 0.5, 4);
    casa.add(cristal);

    // Luz cálida que ilumina al muñequito y al regalo
    var luz = new THREE.PointLight(0xffc06a, 0, 9, 2);
    luz.position.set(cx, cy + 0.5, 7.2);
    casa.add(luz);

    // Halo suave por fuera de la ventana
    var halo = new THREE.Mesh(
      new THREE.PlaneGeometry(ancho + 10, alto + 10),
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
      sueloMuneco: suelo, estado: 'apagada', brillo: 0, objetivo: 0, saltoDesde: -1, destello: -1
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
    if (completo) return;                  // en el estado final, todas encendidas
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
      var extra = 0;                                               // pequeño brillo al completar el marco
      if (v.destello >= 0) {
        var ud = (ahora - v.destello) / 0.9;
        if (ud < 1) extra = Math.sin(Math.PI * ud);
        else v.destello = -1;
      }
      v.cristal.material.emissiveIntensity = v.brillo * 0.8 + extra * 0.7;
      v.luz.intensity = v.brillo * 0.9 + extra * 1.2;
      v.halo.material.opacity = v.brillo * 0.45 + extra * 0.35;
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
  var SOMBRA_NIEVE = '#cfdaea';            // sombras azuladas suaves sobre la nieve
  var sombraCasa = null;
  var reflejos = [];                       // reflejo cálido de cada ventana sobre la nieve

  function nodo(padre, tipo, attrs) {
    var el = document.createElementNS(SVGNS, tipo);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    padre.appendChild(el);
    return el;
  }
  function grupo(padre) {
    return nodo(padre, 'g', {});
  }
  /* Sombra suave: elipse con degradado radial (sin filtros: ligera e imprimible) */
  function sombraSuave(padre, cx, cy, rx, ry, opacidad) {
    return nodo(padre, 'ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: 'url(#sombra-suave)', opacity: opacidad });
  }
  /* Curva suave (bezier cuadrática por los puntos medios) a través de [x, y] */
  function curva(puntos) {
    var d = 'M' + puntos[0][0].toFixed(1) + ' ' + puntos[0][1].toFixed(1);
    for (var i = 1; i < puntos.length - 1; i++) {
      var mx = (puntos[i][0] + puntos[i + 1][0]) / 2, my = (puntos[i][1] + puntos[i + 1][1]) / 2;
      d += ' Q' + puntos[i][0].toFixed(1) + ' ' + puntos[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    var u = puntos[puntos.length - 1];
    return d + ' L' + u[0].toFixed(1) + ' ' + u[1].toFixed(1);
  }
  /* Contorno cerrado y redondeado a través de [x, y] */
  function curvaCerrada(p) {
    var n = p.length, d = '';
    for (var i = 0; i < n; i++) {
      var a = p[i], b = p[(i + 1) % n];
      var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      d += (i === 0 ? 'M' + m[0].toFixed(1) + ' ' + m[1].toFixed(1) : '') +
           ' Q' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ' ' +
           (((b[0] + p[(i + 2) % n][0]) / 2).toFixed(1)) + ' ' + (((b[1] + p[(i + 2) % n][1]) / 2).toFixed(1));
    }
    return d + ' Z';
  }
  /* Forma irregular redondeada alrededor de (cx, cy) */
  function bulto(cx, cy, rx, ry, azar, puntos) {
    var p = [], n = puntos || 9;
    for (var k = 0; k < n; k++) {
      var ang = (k + (azar() - 0.5) * 0.35) / n * Math.PI * 2, r = 0.86 + azar() * 0.24;
      p.push([cx + Math.cos(ang) * rx * r, cy + Math.sin(ang) * ry * r]);
    }
    return p;
  }
  /* Piedra pisadera: sombrita, canto oscuro, cara de arriba, brillo y nieve encima (más cuanto más lejos) */
  function piedra(g, cx, cy, rx, ry, gris, t, azar) {   // losa de piedra en bloques, con nieve encima
    g.setAttribute('opacity', (1 - Math.max(0, t - 0.55) * 1.4).toFixed(2));
    var w = Math.max(8, Math.round(rx * 2 / 4) * 4), h = Math.max(4, Math.round(ry * 1.2 / 4) * 4), x0 = Math.round((cx - w / 2) / 2) * 2, y0 = Math.round((cy - h / 2) / 2) * 2;
    sombraSuave(g, cx + 3, cy + ry * 0.9, rx * 1.35, ry * 0.75, 0.85);
    rect(g, x0, y0 + h, w, Math.max(4, Math.round(h * 0.5 / 2) * 2), gris[1]);           // cara de delante
    rect(g, x0, y0, w, h, gris[0]);                                                     // cara de arriba
    for (var i = 0; i < w / 4; i++) {                                                   // píxeles de tonos distintos
      if (azar() < 0.35) rect(g, x0 + i * 4, y0 + (azar() < 0.5 ? 0 : h - 4), 4, 4, azar() < 0.5 ? gris[1] : '#c9ccd3');
    }
    var nieve = Math.round(w * (0.5 + t * 0.3) / 4) * 4;                                // nieve encima
    rect(g, x0 + Math.round((w - nieve) / 8) * 4, y0 - 2, nieve, Math.max(4, Math.round(h * (0.4 + t * 0.4) / 2) * 2), COLOR.glaseado);
  }

  /* Estrellita de cuatro puntas */
  function estrellita(padre, x, y, r, color) {
    var k = r * 0.24;
    return nodo(padre, 'path', {
      d: 'M' + x + ' ' + (y - r) + ' L' + (x + k) + ' ' + (y - k) + ' L' + (x + r) + ' ' + y + ' L' + (x + k) + ' ' + (y + k) +
         ' L' + x + ' ' + (y + r) + ' L' + (x - k) + ' ' + (y + k) + ' L' + (x - r) + ' ' + y + ' L' + (x - k) + ' ' + (y - k) + ' Z',
      fill: color
    });
  }

  function construirSuelo() {
    var svg = document.getElementById('suelo');
    var azar = crearAzar(1221);
    var i, x, g;

    var defs = nodo(svg, 'defs', {});
    defs.innerHTML =
      // reflejo cálido de las ventanas
      '<radialGradient id="reflejo-ventana"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.9"/>' +
      '<stop offset="0.55" stop-color="#ffd27a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>' +
      // sombra azulada de borde difuso
      '<radialGradient id="sombra-suave"><stop offset="0" stop-color="#8fa3c4" stop-opacity="0.75"/>' +
      '<stop offset="0.6" stop-color="#a9b9d3" stop-opacity="0.35"/><stop offset="1" stop-color="#b8c6dc" stop-opacity="0"/></radialGradient>' +
      // cuerpo de la nieve: crema arriba, algo más azulado abajo
      '<linearGradient id="nieve-cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf3"/>' +
      '<stop offset="1" stop-color="#f1f3f8"/></linearGradient>' +
      // cara en sombra de cada loma: azul bajo la cresta que se funde hacia abajo
      '<linearGradient id="loma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3d0e3" stop-opacity="0.85"/>' +
      '<stop offset="1" stop-color="#dfe6f0" stop-opacity="0"/></linearGradient>' +
      '';

    // 1. Manto de nieve en bloques escalonados: el borde de arriba y tres desniveles más abajo,
    //    en tramos de 16 px de ancho y escalones de 8 px de alto. Cada desnivel deja ver su cara
    //    (#9fc3e6, sombra azulada) y los laterales de los escalones; encima, una textura pixelada.
    var patron = nodo(defs, 'pattern', { id: 'pixeles-nieve', width: 64, height: 64, patternUnits: 'userSpaceOnUse' });
    for (var py = 0; py < 8; py++) {
      for (var qx = 0; qx < 8; qx++) {
        var v = azar();
        if (v < 0.22) rect(patron, qx * 8, py * 8, 8, 8, 'rgba(159,195,230,0.2)');
        else if (v < 0.3) rect(patron, qx * 8, py * 8, 8, 8, 'rgba(120,160,210,0.14)');
        else if (v > 0.86) rect(patron, qx * 8, py * 8, 8, 8, 'rgba(255,255,255,0.9)');
      }
    }
    function escalones(base, amp, fase, hondo) {   // tramos [x, y] del borde de un desnivel
      var lista = [];
      for (var x = -16, n = 0; x < ANCHO + 16; n++) {
        var ancho = 16 * (2 + Math.floor(azar() * 3));
        var centro = hondo ? 16 * Math.exp(-Math.pow((x + ancho / 2 - ANCHO / 2) / 200, 2)) : 0;   // más bajo bajo la casa
        var y = base + centro + amp * Math.sin((x + ancho / 2) / 90 + fase) + (azar() - 0.5) * amp;
        lista.push([x, ancho, Math.round(y / 8) * 8]);
        x += ancho;
      }
      return lista;
    }
    function trazo(lista, dy) {
      var d = '';
      lista.forEach(function (t, k) { d += (k === 0 ? 'M' : ' L') + t[0] + ' ' + (t[2] + dy) + ' L' + (t[0] + t[1]) + ' ' + (t[2] + dy); });
      return d;
    }
    var bordeArriba = escalones(896, 6, 0.4, true);
    var dManto = trazo(bordeArriba, 0) + ' L' + (ANCHO + 40) + ' 1210 L-16 1210 Z';
    nodo(svg, 'path', { d: dManto, fill: 'url(#nieve-cuerpo)' });
    nodo(svg, 'path', { d: dManto, fill: 'url(#pixeles-nieve)' });
    nodo(svg, 'path', { d: trazo(bordeArriba, 1.5), fill: 'none', stroke: '#ffffff', 'stroke-width': 3 });   // canto con brillo
    [[968, 10, 1.3], [1040, 12, 2.6], [1118, 10, 4.1], [1180, 8, 5.2]].forEach(function (n) {
      var lista = escalones(n[0], n[1], n[2], false);
      lista.forEach(function (t, k) {
        rect(svg, t[0], t[2], t[1], 9, '#9fc3e6');                                 // cara del desnivel
        rect(svg, t[0], t[2] + 9, t[1], 3, 'rgba(159,195,230,0.45)');
        rect(svg, t[0], t[2] - 2, t[1], 2, '#ffffff');                             // borde con brillo
        var sig = lista[k + 1];
        if (sig && sig[2] !== t[2]) {                                              // lateral del escalón
          var alto = Math.abs(sig[2] - t[2]);
          if (sig[2] > t[2]) rect(svg, sig[0], t[2], 5, alto + 9, '#9fc3e6');
          else rect(svg, sig[0] - 5, sig[2], 5, alto + 9, '#8fb5dc');
        }
      });
    });

    // Brillo cálido de los farolillos en la nieve
    FAROLILLOS.forEach(function (f) {
      nodo(svg, 'ellipse', { cx: f[0], cy: f[1] + 2, rx: 44, ry: 11, fill: 'url(#reflejo-ventana)', opacity: 0.9 });
      nodo(svg, 'ellipse', { cx: f[0], cy: f[1] + 1, rx: 18, ry: 5, fill: 'url(#reflejo-ventana)', opacity: 0.95 });
    });

    // 3. Caminito de piedras pisaderas desde la puerta: en ligero zigzag siguiendo una curva suave,
    //    de formas y grises algo distintos, con nieve encima; cada vez más pequeñas y tapadas hasta perderse.
    var GRISES = [['#b5b9c2', '#8a8f99'], ['#a9adb6', '#878c96'], ['#bfc2ca', '#959aa4'], ['#9ea3ad', '#80858f']];
    var PIEDRAS = 6, py0 = 962;
    for (var n = 0; n < PIEDRAS; n++) {
      var t = n / (PIEDRAS - 1);                             // 0 junto a la puerta → 1 donde se pierde
      var escala = 1 - t * 0.55;
      var rx = (23 + azar() * 6) * escala, ry = (8.5 + azar() * 2) * escala;
      var pcx = ANCHO / 2 + Math.sin(n * 0.55) * 18 + (n % 2 === 0 ? -1 : 1) * 13 * escala;
      piedra(grupo(svg), pcx, py0, rx, ry, GRISES[Math.floor(azar() * GRISES.length)], t, azar);
      py0 += ry * 2 + 9 * escala;                            // bien separadas
    }
    // Huellas de muñequito que llegan a la puerta, junto a las piedras
    for (i = 0; i < 5; i++) {
      nodo(svg, 'ellipse', { cx: 366 + i * 5 + (i % 2 === 0 ? -4 : 4), cy: 1002 - i * 10, rx: 3.2, ry: 2.2, fill: '#b9c6da', opacity: (0.9 - i * 0.12).toFixed(2) });
    }

    // 4. Sombras: la de la casa (luz desde la izquierda, cae algo a la derecha) y las de los abetos
    sombraCasa = grupo(svg);                 // al flotar la casa, su sombra se aclara un poco
    sombraSuave(sombraCasa, ANCHO / 2 + 14, 950, 290, 24, 1);
    sombraSuave(sombraCasa, ANCHO / 2 + 6, 946, 236, 9, 0.8);
    [54, 794].forEach(function (cx) {
      sombraSuave(svg, cx + 18, 908, 104, 15, 1);
      sombraSuave(svg, cx + 8, 904, 66, 6, 0.8);
    });
    // y las de los palitos de los carteles
    sombraSuave(svg, 140, 1128, 34, 5, 0.9);
    sombraSuave(svg, 728, 1168, 34, 5, 0.9);

    // 5. Reflejo cálido de cada ventana sobre la nieve (main.js sube su opacidad al encenderla)
    VENTANAS.forEach(function (v, n) {
      var arribaV = v.y0 > 6;                // las de arriba reflejan más lejos y más flojo
      reflejos[n] = {
        el: nodo(svg, 'ellipse', {
          cx: (v.x0 + v.x1) / 2 < 0 ? 296 : 552, cy: arribaV ? 974 : 964,
          rx: arribaV ? 96 : 72, ry: arribaV ? 17 : 12, fill: 'url(#reflejo-ventana)', opacity: 0
        }),
        fuerza: arribaV ? 0.7 : 0.9
      };
    });

    // 6. Brillitos que titilan en la nieve (CSS los anima con retrasos distintos)
    var sitios = [[262, 958], [318, 966], [470, 966], [530, 990], [602, 962], [286, 1046], [352, 1100],
                  [610, 1036], [520, 1170], [590, 1104], [40, 910], [812, 908], [232, 914], [646, 906], [300, 1176]];
    sitios.forEach(function (s, k) {
      g = grupo(svg);
      g.setAttribute('class', 'brillito');
      g.setAttribute('style', 'animation-delay: ' + (-azar() * 3.2).toFixed(2) + 's');
      estrellita(g, s[0], s[1], k % 4 === 0 ? 6 : 4.5, k % 3 === 0 ? '#ffe9a8' : '#ffffff');
    });
  }

  /* =========================================================
     CIELO NOCTURNO: estrellas que titilan, luna, aurora boreal, estrella fugaz
     y colinas con pinos vóxel al fondo. Todo por detrás de la casa y de los textos.
     ========================================================= */

  /* Cielo en bloques: estrellas cuadradas que titilan (el CSS las anima, cada una a su ritmo),
     luna cuadrada pixelada con halo suave y nubes planas de bloques que se mueven muy despacio */
  var LUNA = { x: 72, y: 312, lado: 60 };   // cielo libre a la izquierda de la casa, entre la cinta del eslogan y el tejado
  function construirEstrellas() {
    var svg = document.getElementById('estrellas');
    var azar = crearAzar(2112);
    var defs = nodo(svg, 'defs', {});
    defs.innerHTML =
      '<radialGradient id="halo-luna">' +
      '<stop offset="0" stop-color="#f4f6ff" stop-opacity="0.4"/>' +
      '<stop offset="0.15" stop-color="#e2e9ff" stop-opacity="0.22"/>' +
      '<stop offset="0.35" stop-color="#c3cff3" stop-opacity="0.09"/>' +
      '<stop offset="0.65" stop-color="#a7b5e6" stop-opacity="0.03"/>' +
      '<stop offset="1" stop-color="#a7b5e6" stop-opacity="0"/></radialGradient>';
    var lx = LUNA.x + LUNA.lado / 2, ly = LUNA.y + LUNA.lado / 2;
    for (var i = 0; i < 80; i++) {
      var x = Math.round(10 + azar() * 828), y = Math.round(10 + azar() * 760);
      var lado = [2, 2, 3, 3, 4][Math.floor(azar() * 5)];
      var o = (0.35 + azar() * 0.55).toFixed(2), dura = (2.5 + azar() * 3.5).toFixed(2), retraso = (-azar() * 6).toFixed(2);
      var color = azar() < 0.2 ? '#fff1c9' : '#ffffff';
      if (Math.abs(x - lx) < 44 && Math.abs(y - ly) < 44) continue;   // ninguna encima de la luna
      var r = nodo(svg, 'rect', { x: x, y: y, width: lado, height: lado, fill: color, 'class': 'estrella' });
      r.setAttribute('style', '--o: ' + o + '; animation-duration: ' + dura + 's; animation-delay: ' + retraso + 's');
    }
    // Luna: un bloque cuadrado blanco de 6 × 6 píxeles de 8 px, con tonos algo distintos, y un halo suave
    nodo(svg, 'circle', { cx: lx, cy: ly, r: 170, fill: 'url(#halo-luna)' });
    // Luna: bloque de 10 × 10 píxeles de 6 px, blanco frío con manchitas grises suaves (mares)
    var luna = grupo(svg);
    var manchas = [[3, 3, 2.2], [6.6, 5.4, 1.6], [3.2, 7.2, 1.3], [7.4, 2.2, 1]];
    for (var fy = 0; fy < 10; fy++) {
      for (var fx = 0; fx < 10; fx++) {
        var gris = 0;
        manchas.forEach(function (m) {
          var d = Math.hypot(fx + 0.5 - m[0], fy + 0.5 - m[1]) / m[2];
          if (d < 1) gris = Math.max(gris, d < 0.55 ? 2 : 1);
        });
        if (gris === 0 && azar() < 0.08) gris = 1;                     // alguna manchita suelta
        var color = ['#f4f6fb', '#e2e6ee', '#d3d8e2'][gris];
        if (gris === 0 && azar() < 0.3) color = '#fbfcff';
        rect(luna, LUNA.x + fx * 6, LUNA.y + fy * 6, 6, 6, color);
      }
    }
    rect(luna, LUNA.x, LUNA.y + LUNA.lado - 6, LUNA.lado, 6, 'rgba(120,130,160,0.18)');   // borde de abajo y derecha, en sombra
    rect(luna, LUNA.x + LUNA.lado - 6, LUNA.y, 6, LUNA.lado - 6, 'rgba(120,130,160,0.18)');
    construirNubes(svg, azar);
  }

  /* Nubes planas y rectangulares, hechas de bloques de 8 px, semitransparentes. El CSS las mueve muy
     despacio de lado a lado (cada una a su ritmo). Por detrás de los textos y la casa. */
  function construirNubes(svg, azar) {
    [[150, 150, 18, 0.2], [560, 250, 22, 0.18], [690, 118, 13, 0.2], [60, 560, 16, 0.16], [600, 640, 20, 0.15], [250, 720, 14, 0.13]].forEach(function (n, k) {
      var x0 = n[0], y0 = n[1], ancho = n[2];
      var g = grupo(svg);
      g.setAttribute('class', 'nube');
      g.setAttribute('opacity', n[3]);
      g.setAttribute('style', '--viaje: ' + (30 + azar() * 30).toFixed(0) + 'px; animation-duration: ' + (38 + azar() * 30).toFixed(1) +
                     's; animation-delay: ' + (-azar() * 40).toFixed(1) + 's');
      // filas de bloques: la de abajo ancha y plana, encima una o dos más cortas
      var filas = [[0, ancho], [2 + Math.floor(azar() * 3), Math.round(ancho * 0.55)], [4 + Math.floor(azar() * 3), Math.round(ancho * 0.3)]];
      filas.forEach(function (f, fila) {
        if (fila === 2 && azar() < 0.4) return;
        rect(g, x0 + f[0] * 8, y0 - fila * 8, f[1] * 8, 8, '#dfe6ff');
      });
      rect(g, x0 + 8, y0 + 8, (ancho - 3) * 8, 8, '#dfe6ff');     // base, algo más corta
    });
  }

  /* Colinas oscuras y pinos vóxel al fondo, detrás de la casa y de los abetos */
  function construirColinas() {
    var svg = document.getElementById('colinas');
    var azar = crearAzar(4747);
    // Textura pixelada (8 × 8 píxeles de 8 px con tonos algo más claros y más oscuros) que se pone encima
    var defs = nodo(svg, 'defs', {});
    var patron = nodo(defs, 'pattern', { id: 'pixeles-colina', width: 64, height: 64, patternUnits: 'userSpaceOnUse' });
    for (var py = 0; py < 8; py++) {
      for (var qx0 = 0; qx0 < 8; qx0++) {
        var v = azar();
        if (v < 0.3) rect(patron, qx0 * 8, py * 8, 8, 8, 'rgba(0,0,0,0.22)');
        else if (v > 0.75) rect(patron, qx0 * 8, py * 8, 8, 8, 'rgba(170,160,255,0.07)');
      }
    }
    function colina(base, amp, fase, color) {
      // contorno en escalones de 16 px de ancho y 8 de alto (bloques), con nieve encima de cada bloque
      var d = 'M-8 1000', alto = function (x) { return base - amp * (0.6 + 0.4 * Math.sin(x / 150 + fase)) - amp * 0.3 * Math.sin(x / 57 + fase * 2); };
      var tapas = [];
      for (var x = -8; x <= ANCHO + 8; x += 16) {
        var y = Math.round(alto(x + 8) / 8) * 8;
        d += ' L' + x + ' ' + y + ' L' + (x + 16) + ' ' + y;
        tapas.push([x, y]);
      }
      d += ' L' + (ANCHO + 24) + ' 1000 Z';
      nodo(svg, 'path', { d: d, fill: color });
      nodo(svg, 'path', { d: d, fill: 'url(#pixeles-colina)' });
      tapas.forEach(function (t, k) {      // nieve: una capa clara y, debajo, otra más azulada
        rect(svg, t[0], t[1], 16, 4, '#e4ecfb');
        rect(svg, t[0], t[1] + 4, 16, 3, '#a9bde6');
        var prev = tapas[k - 1];
        if (prev && prev[1] < t[1]) rect(svg, t[0], prev[1], 3, t[1] - prev[1] + 4, '#c5d3f0');   // lateral del escalón
      });
      return function (x) {                // altura de la colina en x
        return Math.round(alto(Math.floor((x + 8) / 16) * 16) / 8) * 8;
      };
    }
    // Pinos de bloques: cada piso, fila de bloques de 8 px de tonos distintos, con nieve en los bordes
    var VERDES_PINO = ['#1f4a4f', '#245659', '#1a3f46', '#2a5d5c'];
    var VERDES_LEJOS = ['#1d3550', '#213c58', '#1a304a', '#24425d'];   // los lejanos, más apagados y azulados
    function pino(x, suelo, alto, lejano) {
      x = Math.round(x / 8) * 8;
      var pisos = Math.max(3, Math.round(alto / 8));
      rect(svg, x - 4, suelo - 8, 8, 12, '#3a2a3a');                            // tronco
      for (var k = 0; k < pisos; k++) {
        var w = Math.max(8, Math.round(((alto * 0.6) * (1 - k / pisos) + 8) / 16) * 16);
        var y = suelo - 8 - 8 * (k + 1);
        for (var b = 0; b < w / 8; b++) {
          var col = (lejano ? VERDES_LEJOS : VERDES_PINO)[Math.floor(azar() * 4)];
          rect(svg, x - w / 2 + b * 8, y, 8, 8, col);
          if (b >= w / 16) rect(svg, x - w / 2 + b * 8, y, 8, 8, 'rgba(0,0,20,0.22)');   // lado en sombra
        }
        rect(svg, x - w / 2, y, 8, 3, '#e4ecfb');                              // nieve en los bordes del piso
        if (w > 16) rect(svg, x + w / 2 - 8, y, 8, 3, '#c5d3f0');
        if (k === pisos - 1) rect(svg, x - 4, y - 3, 8, 3, '#eef3fd');          // y en la punta
      }
    }
    var lejos = colina(792, 46, 0.7, '#2b2f68');
    for (var i = 0; i < 14; i++) {
      var px = 24 + i * 60 + azar() * 30;
      pino(px, lejos(px) + 4, 36 + azar() * 28, true);
    }
    var cerca = colina(846, 40, 2.4, '#20235a');
    for (i = 0; i < 11; i++) {
      var qx = 14 + i * 80 + azar() * 40;
      pino(qx, cerca(qx) + 4, 52 + azar() * 40, false);
    }
  }

  /* Aurora boreal pixelada: cortinas verticales en franjas escalonadas (turquesa, morado y un toque de rosa).
     Se dibuja en un lienzo de 212 × 300 (cada píxel son 4 × 4 px del cartel) que se amplía SIN suavizado.
     Cada columna es un rayo hecho de 4 franjas de color liso, más intensas abajo y más tenues arriba;
     las alturas van en escalones de píxel. Ondula muy despacio. Al imprimir se queda fija como esté. */
  var cielo = { lienzo: document.getElementById('cielo'), ultimo: -1, fugaz: null, proximaFugaz: 4 };
  var AURORA_W = 212, AURORA_H = 300;
  var FRANJAS = [[0.14, 1], [0.26, 0.6], [0.3, 0.32], [0.3, 0.14]];   // [parte de la altura, intensidad], de abajo arriba
  (function () {
    var c = cielo.lienzo;
    c.width = AURORA_W; c.height = AURORA_H;
    cielo.ctx = c.getContext('2d');
    cielo.cintas = [
      { abajo: '#4fd1c5', arriba: '#7b4fa0', y0: 120, a1: 8, a2: 4, alto: 62, alfa: 0.95, v: 0.05, f: 0.024, fase: 0 },
      { abajo: '#7b4fa0', arriba: '#7b4fa0', y0: 108, a1: 7, a2: 5, alto: 54, alfa: 0.8, v: -0.04, f: 0.019, fase: 2.1 },
      { abajo: '#4fd1c5', arriba: '#4fd1c5', y0: 130, a1: 5, a2: 3, alto: 40, alfa: 0.6, v: 0.03, f: 0.031, fase: 4.0 },
      { abajo: '#f08aa6', arriba: '#7b4fa0', y0: 114, a1: 6, a2: 3, alto: 34, alfa: 0.4, v: -0.025, f: 0.027, fase: 5.3 }
    ];
  })();

  function dibujarCielo(t) {
    var ctx = cielo.ctx;
    ctx.clearRect(0, 0, AURORA_W, AURORA_H);
    ctx.globalCompositeOperation = 'lighter';
    cielo.cintas.forEach(function (c) {
      for (var x = 0; x < AURORA_W; x++) {
        var abajo = Math.round(c.y0 + c.a1 * Math.sin(x * c.f + t * c.v + c.fase) + c.a2 * Math.sin(x * c.f * 2.7 - t * c.v * 1.6 + c.fase));
        // rayos: ondas rápidas en x que se desplazan muy despacio
        var n = 0.5 * Math.sin(x * 0.74 + c.fase * 3 + t * 0.09) + 0.3 * Math.sin(x * 1.66 + c.fase - t * 0.06) + 0.2 * Math.sin(x * 3.1 + c.fase * 5 + t * 0.04);
        var rayo = Math.pow(0.5 + 0.5 * n, 2);
        var pliegue = 0.5 + 0.5 * Math.sin(x * 0.042 + t * c.v * 3 + c.fase * 1.7);
        var alto = c.alto * (0.5 + 0.2 * pliegue + 0.45 * rayo);
        // brillo de la columna en 4 escalones (sin degradados)
        var brillo = Math.round(c.alfa * (0.25 + 0.75 * pliegue) * (0.45 + 0.55 * rayo) * 4) / 4;
        if (brillo <= 0) continue;
        var y = abajo;
        FRANJAS.forEach(function (fr, k) {
          var h = Math.max(1, Math.round(alto * fr[0]));
          ctx.fillStyle = k < 2 ? c.abajo : c.arriba;
          ctx.globalAlpha = Math.min(1, brillo * fr[1]);
          ctx.fillRect(x, y - h, 1, h);
          y -= h;
        });
      }
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Estrella fugaz de vez en cuando: una fila de píxeles que cruza en diagonal y se apaga
    var f = cielo.fugaz;
    if (f) {
      var u = (t - f.desde) / 0.9;
      if (u >= 1) cielo.fugaz = null;
      else {
        var luz = Math.sin(Math.PI * u);
        ctx.fillStyle = '#ffffff';
        for (var k = 0; k < 10; k++) {
          var uu = u - k * 0.025;
          if (uu < 0) break;
          ctx.globalAlpha = luz * (1 - k / 10);
          ctx.fillRect(Math.round((f.x + f.dx * uu) / 2), Math.round((f.y + f.dy * uu) / 2), 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function actualizarCielo(ahora) {
    if (movimientoReducido && cielo.ultimo >= 0) return;            // con movimiento reducido: fija
    if (ahora - cielo.ultimo < 0.05 && !cielo.fugaz) return;      // unas 20 veces por segundo
    if (!movimientoReducido && ahora >= cielo.proximaFugaz) {
      cielo.fugaz = { desde: ahora, x: 120 + Math.random() * 260, y: 20 + Math.random() * 60, dx: 120 + Math.random() * 60, dy: 50 + Math.random() * 30 };
      cielo.proximaFugaz = ahora + 7 + Math.random() * 8;
    }
    cielo.ultimo = ahora;
    dibujarCielo(ahora);
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

  /* --- Carteles de madera pixelada (HTML/CSS): texturas generadas aquí como SVG de píxeles ---
     SVG con shape-rendering crispEdges: se ve y se imprime nítido a cualquier tamaño.
     Cada píxel son 4 px del diseño (0,4 rem). Madera propia: tablas con vetas horizontales. */
  function svgDatos(ancho, alto, rects) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + ancho + ' ' + alto + '" width="' + ancho + '" height="' + alto +
              '" shape-rendering="crispEdges">' + rects.join('') + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  function texturaMadera(vertical, semilla) {
    var az = crearAzar(semilla), largo = 60, filas = 16, rects = [];
    var CLARO = '#a0703a', MEDIO = '#8b5a2b', OSCURO = '#6e4520', BRILLO = '#ad7c45';
    for (var f = 0; f < filas; f++) {
      var tabla = Math.floor(f / 4), junta = f % 4 === 3;
      var base = tabla % 2 === 0 ? CLARO : MEDIO;
      var fila = [];
      for (var x = 0; x < largo;) {
        var color = base, n = 1 + Math.floor(az() * 4);
        if (junta) { color = OSCURO; n = largo; }                       // junta entre tablas
        else {
          var r = az();
          if (r < 0.28) { color = base === CLARO ? MEDIO : OSCURO; n = 3 + Math.floor(az() * 6); }   // veta
          else if (r < 0.34) { color = OSCURO; n = 1 + Math.floor(az() * 2); }                   // nudito
          else if (r < 0.42 && f % 4 === 0) { color = BRILLO; n = 2 + Math.floor(az() * 4); }    // brillo arriba de la tabla
        }
        n = Math.min(n, largo - x);
        fila.push([x, n, color]);
        x += n;
      }
      fila.forEach(function (t) {
        rects.push(vertical ? '<rect x="' + f + '" y="' + t[0] + '" width="1" height="' + t[1] + '" fill="' + t[2] + '"/>'
                            : '<rect x="' + t[0] + '" y="' + f + '" width="' + t[1] + '" height="1" fill="' + t[2] + '"/>');
      });
    }
    return vertical ? { url: svgDatos(filas, largo, rects), w: filas, h: largo } : { url: svgDatos(largo, filas, rects), w: largo, h: filas };
  }
  function texturaNieve(semilla) {                 // tira de nieve en bloques: 2-3 píxeles, con sombra abajo
    var az = crearAzar(semilla), rects = [];
    for (var x = 0; x < 24; x++) {
      var alto = 2 + (az() < 0.45 ? 1 : 0) + (az() < 0.12 ? 1 : 0);
      var arriba = 4 - alto;
      rects.push('<rect x="' + x + '" y="' + arriba + '" width="1" height="' + (alto - 1) + '" fill="#ffffff"/>');
      rects.push('<rect x="' + x + '" y="3" width="1" height="1" fill="' + (az() < 0.5 ? '#dfe8f5' : '#cfdcee') + '"/>');
    }
    return svgDatos(24, 4, rects);
  }
  function texturaCadena() {                       // eslabón de frente (anillo) y de canto (barrita), en grises
    var r = [], CL = '#b4b9c2', OS = '#6b707a';
    r.push('<rect x="1" y="0" width="2" height="1" fill="' + CL + '"/>', '<rect x="0" y="1" width="1" height="2" fill="' + CL + '"/>',
           '<rect x="3" y="1" width="1" height="2" fill="' + OS + '"/>', '<rect x="1" y="3" width="2" height="1" fill="' + OS + '"/>',
           '<rect x="1" y="4" width="1" height="2" fill="' + CL + '"/>', '<rect x="2" y="4" width="1" height="2" fill="' + OS + '"/>');
    return svgDatos(4, 6, r);
  }
  function vestirCarteles() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-madera]'), function (el, k) {
      var t = texturaMadera(el.getAttribute('data-madera') === 'v', 9100 + k * 37);
      el.style.backgroundImage = t.url;
      el.style.backgroundSize = (t.w * 0.4) + 'rem ' + (t.h * 0.4) + 'rem';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-nieve]'), function (el, k) {
      el.style.backgroundImage = texturaNieve(5200 + k * 11);
      el.style.backgroundSize = '9.6rem 1.6rem';
    });
    var cadena = texturaCadena();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cadena]'), function (el) {
      el.style.backgroundImage = cadena;
      el.style.backgroundSize = '1.2rem 1.8rem';
    });
  }

  /* --- Parpadeo común (tejado + carteles): al azar y, a veces, todas a la vez --- */
  var proximoCambio = 0, proximaFiesta = 5, fiestaHasta = -1;
  var colorTemporal = new THREE.Color();
  var BLANCO = new THREE.Color('#ffffff');

  function actualizarBombillas(dt, ahora) {
    if (ahora >= proximoCambio) {
      proximoCambio = ahora + 0.9;                         // ritmo tranquilo
      if (completo) proximoCambio = ahora + 0.1;           // estado final: se aplica enseguida
      if (ahora >= proximaFiesta) {
        fiestaHasta = ahora + 2;
        proximaFiesta = ahora + 9 + Math.random() * 6;
      }
      var fiesta = ahora < fiestaHasta;
      bombillas.forEach(function (b) {
        if (fiesta || completo) b.encendida = true;   // en el estado final, todas encendidas y fijas
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
      colores.setXYZ(b.indice, b.base.r * b.brillo * 0.95, b.base.g * b.brillo * 0.95, b.base.b * b.brillo * 0.95);
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


  /* ---------- 1. NIEVE: partículas cuadradas blancas de 3 a 6 px ----------
     - Cuadraditos lisos, sin giro, con su opacidad fija toda la caída (sin parpadeo); los bordes se
       suavizan un píxel en el shader para que no «tiemblen» al moverse entre píxeles.
     - Todas caen en una sola capa por detrás de la casa (z -20 … -14): nunca pasan por delante de la casa
       ni de los abetos, y como el lienzo 3D va debajo del HTML, tampoco de los textos ni de la cinta.
     - El tamaño se da en px del cartel (no depende de la distancia). Se desvanecen suave al salir por abajo. */
  var NUM_COPOS = 110;
  var copos = [];
  var geoNieve = new THREE.InstancedBufferGeometry();
  var cuadrado = new THREE.PlaneGeometry(1, 1);
  geoNieve.index = cuadrado.index;
  geoNieve.setAttribute('position', cuadrado.attributes.position);
  geoNieve.instanceCount = NUM_COPOS;
  var posCopos = new Float32Array(NUM_COPOS * 3);
  var tamCopos = new Float32Array(NUM_COPOS);
  var alfaCopos = new Float32Array(NUM_COPOS);

  function colocarCopo(c, arriba, i) {
    c.x = azar(-29, 29);
    c.y = arriba ? azar(38, 46) : azar(-40, 42);
    c.z = azar(-20, -14);                  // siempre por detrás de la casa (que llega hasta z -13)
    c.amp = azar(0.3, 1.0);                // vaivén
    c.frec = azar(0.3, 0.8);
    c.fase = azar(0, Math.PI * 2);
    tamCopos[i] = Math.round(azar(3, 6.99) - 0.49);   // 3, 4, 5 o 6 px
    c.vy = 0.8 + tamCopos[i] * 0.22 + azar(0, 0.3);  // los grandes caen algo más deprisa
    alfaCopos[i] = azar(0.55, 0.85);
  }
  for (var nc = 0; nc < NUM_COPOS; nc++) {
    var copo = {};
    colocarCopo(copo, false, nc);
    copos.push(copo);
  }
  geoNieve.setAttribute('centro', new THREE.InstancedBufferAttribute(posCopos, 3));
  geoNieve.setAttribute('tam', new THREE.InstancedBufferAttribute(tamCopos, 1));
  geoNieve.setAttribute('alfa', new THREE.InstancedBufferAttribute(alfaCopos, 1));

  /* Rectángulo de la cinta del eslogan en píxeles del lienzo (ajustarTamano). La cinta va por debajo del
     lienzo 3D para que el gorro pase por delante; la nieve y las chispitas no se dibujan encima de ella. */
  var ZONA_CINTA = { value: new THREE.Vector4(0, 0, 0, 0) };
  var RECORTE_CINTA = 'if (gl_FragCoord.x > zonaCinta.x && gl_FragCoord.x < zonaCinta.z && gl_FragCoord.y > zonaCinta.y && gl_FragCoord.y < zonaCinta.w) discard;';
  function recortarCinta(material) {
    material.onBeforeCompile = function (sh) {
      sh.uniforms.zonaCinta = ZONA_CINTA;
      sh.fragmentShader = 'uniform vec4 zonaCinta;' + String.fromCharCode(10) +
        sh.fragmentShader.replace('void main() {', 'void main() {' + String.fromCharCode(10) + RECORTE_CINTA);
    };
  }

  var materialNieve = new THREE.ShaderMaterial({
    uniforms: {
      pxPorPx: { value: 1 },               // píxeles de pantalla por px del cartel (ajustarTamano)
      zonaCinta: ZONA_CINTA
    },
    vertexShader: [
      'attribute vec3 centro;',
      'attribute float tam;',
      'attribute float alfa;',
      'uniform float pxPorPx;',
      'varying float vAlfa;',
      'varying vec2 vUv;',
      'varying float vLado;',
      'void main() {',
      '  vAlfa = alfa * smoothstep(-42.0, -30.0, centro.y) * (1.0 - smoothstep(34.0, 40.0, centro.y));',
      '  vec4 mv = modelViewMatrix * vec4(centro, 1.0);',
      '  float cuadro = (tam + 2.0) * 2.0 * -mv.z / (projectionMatrix[1][1] * 1200.0);',   // 1 px de margen por lado
      '  mv.xy += position.xy * cuadro;',
      '  vUv = position.xy;',
      '  vLado = tam * pxPorPx;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join(String.fromCharCode(10)),
    fragmentShader: [
      'uniform float pxPorPx;',
      'uniform vec4 zonaCinta;',
      'varying float vAlfa;',
      'varying vec2 vUv;',
      'varying float vLado;',
      'void main() {',
      '  ' + RECORTE_CINTA,
      '  float total = vLado + 2.0 * pxPorPx;',
      '  float m = max(abs(vUv.x), abs(vUv.y)) * total;',       // distancia al centro, en píxeles de pantalla
      '  float cubre = clamp(vLado * 0.5 - m + 0.5, 0.0, 1.0);',
      '  if (cubre <= 0.0) discard;',
      '  gl_FragColor = vec4(1.0, 1.0, 1.0, vAlfa * cubre);',
      '}'
    ].join(String.fromCharCode(10)),
    transparent: true,
    depthWrite: false
  });
  var nieve = new THREE.Mesh(geoNieve, materialNieve);
  nieve.frustumCulled = false;
  escena.add(nieve);

  function actualizarNieve(dt) {
    var paso = movimientoReducido ? dt * 0.3 : dt;
    var nuevos = false;
    for (var i = 0; i < NUM_COPOS; i++) {
      var c = copos[i];
      c.y -= c.vy * paso;
      if (c.y < -44) { colocarCopo(c, true, i); nuevos = true; }   // ya se ha desvanecido (ver el shader)
      posCopos[i * 3] = c.x + Math.sin(reloj * c.frec + c.fase) * c.amp;
      posCopos[i * 3 + 1] = c.y;
      posCopos[i * 3 + 2] = c.z;
    }
    geoNieve.attributes.centro.needsUpdate = true;
    if (nuevos) {
      geoNieve.attributes.tam.needsUpdate = true;
      geoNieve.attributes.alfa.needsUpdate = true;
    }
  }

  /* ---------- 2. LA CASA FLOTA Y GIRA HACIA EL CURSOR (suavizado) ---------- */
  var PIVOTE_Y = pivote.position.y;
  var GIRO_MAX = 0.15;                     // radianes: «un poco» (sin meterse en los abetos)
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


  /* ---------- 3. CURSOR: MANGA PASTELERA EN PIXEL ART 2D (SVG, 64 px) ----------
     Cono alargado inclinado 45°: la boquilla, abajo a la izquierda, es la punta del cursor.
     Se dibuja en una rejilla de 22 × 22 píxeles (2 px del diseño cada uno). */
  var Z_MANGA = 13;                        // plano 3D delante de la casa donde cae el rastro de glaseado
  var PLANO_MANGA = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z_MANGA);
  var manga = document.getElementById('manga');
  var MANGA_REJILLA = 22;
  var MANGA_PUNTA = { x: 1.5, y: 20.5 };   // centro del píxel de la punta, dentro de la rejilla

  function dibujarManga() {
    var BOLSA = '#fff8ef', BORDE = '#d9cfc2', PLIEGUE = '#e9dfd2';
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
            else if (u < 15 + Math.sin(w * 1.6) * 0.7) {                      // glaseado dentro (opaco), en franjas de colores a lo largo
              color = COLORES_GLASEADO[((Math.floor((w + 6) / 1.25) % 5) + 5) % 5];
            }
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


  /* ---------- 4. RASTRO DE GLASEADO: un cordón continuo y ondulado, de colores ----------
     La boquilla deja un cordón de glaseado (bolitas muy juntas, así se ve continuo) que ondula
     un poco a los lados y va pasando poco a poco por los colores de la bolsa.
     Relieve: brillo arriba (material con brillo) y una sombra suave abajo (otra capa, detrás).
     Vive 1 s como mucho: entero 0,45 s; luego se encoge en 0,5 s y suelta unas pocas virutas que caen.
     Si el ratón da un salto largo, el cordón se corta (nunca cruza la casa una raya). */
  var MAX_CORDON = 280;
  var PASO_CORDON = 0.11;                  // separación entre bolitas: se solapan y forman un cordón
  var GROSOR_CORDON = 0.17;                // radio
  var SALTO_MAXIMO = 3;
  var VIDA_CORDON = 0.45, ENCOGE = 0.5;    // 0,95 s en total
  var geoBolita = new THREE.SphereGeometry(1, 10, 7);
  var mallaCordon = crearReserva(MAX_CORDON, new THREE.MeshPhongMaterial({
    color: 0xffffff, emissive: 0x1a1612, specular: 0xbab4ae, shininess: 80
  }), geoBolita);
  var mallaSombraCordon = crearReserva(MAX_CORDON, new THREE.MeshBasicMaterial({
    color: 0x3a0c18, transparent: true, opacity: 0.22, depthWrite: false
  }), geoBolita);
  var mallaVirutas = crearReserva(60, new THREE.MeshLambertMaterial({ color: 0xffffff }));
  var PALETA_CORDON = COLORES_GLASEADO.map(function (c) { return new THREE.Color(c); });
  var cordon = [];                         // { x, y, nace, color, r }
  var virutas = [];
  var recorrido = 0;                       // distancia total del cordón: da la onda y el color
  var trecho = 0;

  function colorDelCordon(d) {             // pasa suavemente de un color de la paleta al siguiente
    var t = d / 2.2, i = Math.floor(t);
    var a = PALETA_CORDON[i % PALETA_CORDON.length], b = PALETA_CORDON[(i + 1) % PALETA_CORDON.length];
    var f = t - i;
    return a.clone().lerp(b, f < 0.55 ? 0 : (f - 0.55) / 0.45);   // tramos de color con transición corta
  }

  function glasear(a, b) {
    var distancia = a.distanceTo(b);
    if (distancia > SALTO_MAXIMO) {        // salto largo: el cordón se corta y empieza aquí
      trecho = 0;
      return;
    }
    var dx = (b.x - a.x) / Math.max(distancia, 1e-4), dy = (b.y - a.y) / Math.max(distancia, 1e-4);
    trecho += distancia;
    while (trecho >= PASO_CORDON) {
      trecho -= PASO_CORDON;
      recorrido += PASO_CORDON;
      var u = 1 - trecho / Math.max(distancia, 1e-4);
      var onda = Math.sin(recorrido * 5.5) * 0.09;                     // ondulado, hacia los lados
      cordon.push({
        x: a.x + (b.x - a.x) * u - dy * onda, y: a.y + (b.y - a.y) * u + dx * onda,
        nace: reloj, color: colorDelCordon(recorrido),
        r: GROSOR_CORDON * (1 + 0.14 * Math.sin(recorrido * 5.5 + 1.6))   // un poco más gordo en cada vuelta: hecho a mano
      });
      if (cordon.length > MAX_CORDON) cordon.shift();
    }
  }

  function soltarViruta(b) {
    if (virutas.length >= 60) return;
    virutas.push({ x: b.x, y: b.y, z: Z_MANGA, vx: azar(-0.8, 0.8), vy: azar(0.2, 1.2), nace: reloj,
                   giro: azar(0, 6.3), vgiro: azar(-8, 8), color: b.color, lado: azar(0.08, 0.13) });
  }

  function actualizarGlaseado(dt) {
    var n = 0, vivos = [];
    cordon.forEach(function (b) {
      var edad = reloj - b.nace;
      var s = edad < VIDA_CORDON ? 1 : 1 - (edad - VIDA_CORDON) / ENCOGE;
      if (s <= 0) return;
      if (edad >= VIDA_CORDON && !b.encoge) {                          // empieza a encogerse: alguna viruta
        b.encoge = true;
        if (Math.random() < 0.06) soltarViruta(b);
      }
      vivos.push(b);
      var e = s * s * (3 - 2 * s);                                     // se encoge suavemente
      ayudante.rotation.set(0, 0, 0);
      ayudante.position.set(b.x, b.y, Z_MANGA);
      ayudante.scale.set(b.r * e, b.r * e, b.r * e * 0.8);
      ayudante.updateMatrix();
      mallaCordon.setMatrixAt(n, ayudante.matrix);
      mallaCordon.setColorAt(n, b.color);
      ayudante.position.set(b.x + 0.04, b.y - 0.07, Z_MANGA - 0.18);    // sombra suave abajo
      ayudante.scale.set(b.r * e * 1.12, b.r * e * 1.12, 0.01);
      ayudante.updateMatrix();
      mallaSombraCordon.setMatrixAt(n, ayudante.matrix);
      n++;
    });
    cordon = vivos;
    mallaCordon.count = mallaSombraCordon.count = n;
    mallaCordon.instanceMatrix.needsUpdate = true;
    mallaCordon.instanceColor.needsUpdate = true;
    mallaSombraCordon.instanceMatrix.needsUpdate = true;

    // Virutas: caen girando y se apagan (0,5 s)
    var m = 0;
    virutas = virutas.filter(function (v) {
      var edad = reloj - v.nace;
      if (edad > 0.5) return false;
      v.vy -= 9 * dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.giro += v.vgiro * dt;
      ayudante.position.set(v.x, v.y, v.z);
      ayudante.rotation.set(v.giro * 0.7, v.giro, v.giro * 0.4);
      ayudante.scale.setScalar(v.lado * (1 - edad / 0.5 * 0.6));
      ayudante.updateMatrix();
      mallaVirutas.setMatrixAt(m, ayudante.matrix);
      mallaVirutas.setColorAt(m, v.color);
      m++;
      return true;
    });
    mallaVirutas.count = m;
    mallaVirutas.instanceMatrix.needsUpdate = true;
    mallaVirutas.instanceColor.needsUpdate = true;
  }


  /* ---------- 4 bis. PERLITAS DE GLASEADO EN LOS MARCOS ----------
     Cada marco tiene sus «huecos» para perlitas: una fila por el centro del marco (22)
     y, bajo el alféizar, un festón ondulado (16) con dos gotitas colgando: 40 por ventana.
     Al pasar la manga por el marco se pegan las perlitas que quedan cerca de la boquilla,
     con un saltito. Al completar un marco, la ventana hace un pequeño brillo.
     Nunca se quitan: siguen en el estado final y al imprimir. Van dentro de la casa (flotan con ella). */
  var Z_MARCO = 7.5;                       // cara delantera de los marcos
  var PERLAS_FILA = 22, FESTONES = 3, PERLAS_FESTON = 5;
  var ALCANCE_MANGA = 0.95;                // distancia a la que la boquilla pega una perlita
  var huecosPerla = [];                    // todos: { v, x, y, z, r, alto, nace }
  var perlasPorVentana = VENTANAS.map(function () { return { total: 0, puestas: 0 }; });

  VENTANAS.forEach(function (v, i) {
    function hueco(x, y, z, r, alto, deColor) {
      huecosPerla.push({ v: i, x: x, y: y, z: z, r: r, alto: alto || 1, nace: -1, deColor: !!deColor });
      perlasPorVentana[i].total++;
    }
    // Fila por el centro del marco, repartida a lo largo de su contorno (los lados, el arco y el alféizar)
    var xa = v.x0 - 1, xb = v.x1 + 1, ya = v.y0 - 1, yt = v.y1 + 0.5, cxv = (v.x0 + v.x1) / 2;
    var am = (ARCO.ai + ARCO.ae) / 2, hm = (ARCO.hi + ARCO.he) / 2;
    var contorno = [[xa, ya], [xa, yt]];
    for (var q = 1; q < 16; q++) {
      var th = Math.PI - q / 16 * Math.PI;
      contorno.push([cxv + am * Math.cos(th), yt + hm * Math.sin(th)]);
    }
    contorno.push([xb, yt], [xb, ya], [xa, ya]);
    var largos = [0];
    for (q = 1; q < contorno.length; q++) largos.push(largos[q - 1] + Math.hypot(contorno[q][0] - contorno[q - 1][0], contorno[q][1] - contorno[q - 1][1]));
    var perimetro = largos[largos.length - 1];
    for (var k = 0; k < PERLAS_FILA; k++) {
      var d = (k + 0.5) / PERLAS_FILA * perimetro, tramo = 1;
      while (largos[tramo] < d) tramo++;
      var f0 = (d - largos[tramo - 1]) / (largos[tramo] - largos[tramo - 1]);
      var x = contorno[tramo - 1][0] + (contorno[tramo][0] - contorno[tramo - 1][0]) * f0;
      var y = contorno[tramo - 1][1] + (contorno[tramo][1] - contorno[tramo - 1][1]) * f0;
      hueco(x, y, Z_MARCO + 0.22, 0.21, 1, true);   // perlitas de colores sobre el marco rojo
    }
    // Festón ondulado bajo el alféizar, con dos gotitas colgando
    var desde = v.x0 - 2.3, hasta = v.x1 + 2.3, paso = (hasta - desde) / FESTONES;
    var techo = v.y0 - 1.5 - 0.1;
    for (var f = 0; f < FESTONES; f++) {
      for (var p = 0; p < PERLAS_FESTON; p++) {
        var t = p / PERLAS_FESTON;
        hueco(desde + (f + t) * paso, techo - 0.5 * Math.sin(Math.PI * t), Z_MARCO + 0.12, 0.13);
      }
      if (f !== 1) hueco(desde + (f + 0.5) * paso, techo - 0.5 - 0.4, Z_MARCO + 0.12, 0.14, 1.8);   // gotita
    }
    hueco(hasta, techo, Z_MARCO + 0.12, 0.13);
  });

  var mallaPerlas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x1c1e22, specular: 0x9a9ea6, shininess: 90 }), huecosPerla.length);   // con un brillito
  mallaPerlas.frustumCulled = false;
  var tonoPerla = new THREE.Color();
  var COLORES_PERLA = COLORES_GLASEADO;
  var azarPerlas = crearAzar(4242), ultimoColorPerla = -1;
  huecosPerla.forEach(function (h, n) {
    if (!h.deColor) {                      // el festón bajo el alféizar, blanco
      mallaPerlas.setColorAt(n, tonoPerla.set(COLOR.glaseado).offsetHSL(0, 0, (n % 3) * 0.01));
      return;
    }
    var k;                                 // colores de las gominolas del tejado, al azar sin repetir el de al lado
    do { k = Math.floor(azarPerlas() * COLORES_PERLA.length); } while (k === ultimoColorPerla);
    ultimoColorPerla = k;
    mallaPerlas.setColorAt(n, tonoPerla.set(COLORES_PERLA[k]));
  });
  casa.add(mallaPerlas);

  var planoMarco = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z_MARCO);
  var rayoCasa = new THREE.Ray();
  var inversaCasa = new THREE.Matrix4();
  var puntoMarco = new THREE.Vector3();
  var puntoMarcoAnterior = null;
  var perlasCambian = true;                // hay que recolocar las perlitas en este fotograma
  var perlaMundo = new THREE.Vector3();

  /* La boquilla pega las perlitas que tiene cerca (también entre dos fotogramas, si se mueve rápido) */
  function pegarPerlas() {
    inversaCasa.copy(casa.matrixWorld).invert();
    rayoCasa.copy(raycaster.ray).applyMatrix4(inversaCasa);
    if (!rayoCasa.intersectPlane(planoMarco, puntoMarco)) { puntoMarcoAnterior = null; return; }
    var a = puntoMarcoAnterior && puntoMarcoAnterior.distanceTo(puntoMarco) < 4 ? puntoMarcoAnterior : puntoMarco;
    var pasos = Math.max(1, Math.ceil(a.distanceTo(puntoMarco) / 0.3));
    for (var s = 1; s <= pasos; s++) {
      var px = a.x + (puntoMarco.x - a.x) * s / pasos, py = a.y + (puntoMarco.y - a.y) * s / pasos;
      huecosPerla.forEach(function (h) {
        if (h.nace >= 0) return;
        var dx = h.x - px, dy = h.y - py;
        if (dx * dx + dy * dy > ALCANCE_MANGA * ALCANCE_MANGA) return;
        h.nace = reloj + s * 0.01;
        perlasCambian = true;
        var cuenta = perlasPorVentana[h.v];
        if (++cuenta.puestas === cuenta.total) completarMarco(h.v);
      });
    }
    puntoMarcoAnterior = (puntoMarcoAnterior || new THREE.Vector3()).copy(puntoMarco);
  }

  /* Marco completo: brillo de la ventana y chispitas alrededor del marco */
  function completarMarco(i) {
    ventanas[i].destello = reloj;
    huecosPerla.forEach(function (h) {
      if (h.v !== i || Math.random() > 0.35) return;
      casa.localToWorld(perlaMundo.set(h.x, h.y, h.z + 0.3));
      nuevaChispa(perlaMundo.x, perlaMundo.y, perlaMundo.z, azar(-0.6, 0.6), azar(0.6, 1.8), azar(0.5, 0.9), azar(0.12, 0.22),
                  elegir([COLOR.luz, '#ffe9a8', '#ffffff']));
    });
  }

  /* Saltito al pegarse (crece un poco más de la cuenta y vuelve) */
  function actualizarPerlas() {
    if (!perlasCambian) return;
    perlasCambian = false;
    huecosPerla.forEach(function (h, n) {
      var e = 0;
      if (h.nace >= 0) {
        var u = Math.max(0, (reloj - h.nace) / 0.25);
        if (u < 1) {
          perlasCambian = true;
          e = 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);   // sale con rebote
        } else e = 1;
      }
      ayudante.position.set(h.x, h.y - (h.alto - 1) * h.r * 0.5, h.z);
      ayudante.rotation.set(0, 0, 0);
      ayudante.scale.set(h.r * e + 1e-4, h.r * h.alto * e + 1e-4, h.r * e * 0.8 + 1e-4);
      ayudante.updateMatrix();
      mallaPerlas.setMatrixAt(n, ayudante.matrix);
    });
    mallaPerlas.instanceMatrix.needsUpdate = true;
  }


  /* ---------- 4 ter. BOLITAS DE NAVIDAD EN LOS ABETOS ----------
     Al pasar la manga por un abeto se cuelgan bolitas vóxel (cubitos con las esquinas recortadas, brillo, tapón gris e hilito)
     de los colores del glaseado, en 12 sitios repartidos por la cara de delante de las ramas.
     Al completar un abeto, su estrella brilla un momento. Nunca se quitan (estado final e impresión). */
  var V = 0.2;                             // cubito de las bolitas (en el abeto, que está a escala 0,85)
  var SITIOS_BOLA = [                      // [piso (y), x] sobre la cara de delante de cada piso
    [3, -3.5], [3, 2], [4, 4.2], [5, -1.2], [6, 2.6], [6, -3.6], [7, 0.3], [8, -2.4], [9, 1.8], [10, -0.8], [11, 1], [12, -0.6]
  ];
  var RADIO_PISO = { 3: 5, 4: 5, 5: 4, 6: 4, 7: 4, 8: 3, 9: 3, 10: 3, 11: 2, 12: 2, 13: 1 };   // como en crearAbeto
  var ALCANCE_BOLA = 1.7;                  // en unidades del abeto
  var azarBolas = crearAzar(5151), ultimoColorBola = -1;

  /* Bolita vóxel: un cubo de 4 × 4 × 4 píxeles con las esquinas y aristas recortadas (se ve redonda),
     de color sólido (sin luces ni transparencia), con la cara de abajo y la derecha algo más oscuras,
     un píxel de brillo blanco arriba a la izquierda, un tapón gris arriba y un hilito que sube al árbol. */
  var PIXEL_BOLA = 0.28;
  var GRIS_TAPON = '#8d929c', GRIS_TAPON_CLARO = '#b9bdc5';
  function crearBola(color) {
    var P = PIXEL_BOLA, lista = [];
    var oscuro = new THREE.Color(color).offsetHSL(0, 0, -0.13);
    function extremo(n) { return n === 0 || n === 3; }
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) for (var k = 0; k < 4; k++) {
      if ((extremo(i) ? 1 : 0) + (extremo(j) ? 1 : 0) + (extremo(k) ? 1 : 0) >= 2) continue;   // esquinas y aristas fuera
      var c = (i === 3 || j === 0) ? oscuro : color;                    // abajo y a la derecha, en sombra
      if (i === 1 && j === 2 && k === 3) c = '#ffffff';                 // brillo arriba a la izquierda (cara de delante)
      if (i === 0 && j === 2 && k === 2) c = '#ffffff';
      lista.push({ x: (i - 1.5) * P, y: (j - 1.5) * P, z: (k - 1.5) * P, color: c });
    }
    // tapón gris de 2 × 2 encima
    for (var a = 1; a <= 2; a++) for (var b = 1; b <= 2; b++) {
      lista.push({ x: (a - 1.5) * P, y: 2.5 * P, z: (b - 1.5) * P, color: a === 1 ? GRIS_TAPON_CLARO : GRIS_TAPON });
    }
    var malla = crearMallaVoxel(lista, P);
    malla.material = new THREE.MeshBasicMaterial();      // colores sólidos, sin sombreado
    var g = new THREE.Group();
    g.add(malla);
    var hilo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), new THREE.MeshBasicMaterial({ color: 0xd9dde4 }));
    hilo.position.y = 3 * P + 0.35;                      // del tapón hacia arriba, hasta la rama
    g.add(hilo);
    return g;
  }

  abetos.forEach(function (a) {
    a.bolas = SITIOS_BOLA.map(function (s) {
      var k;
      do { k = Math.floor(azarBolas() * COLORES_GLASEADO.length); } while (k === ultimoColorBola);
      ultimoColorBola = k;
      var bola = crearBola(COLORES_GLASEADO[k]);
      bola.position.set(s[1], s[0] - 0.45, RADIO_PISO[s[0]] + 0.5 + 0.35);   // colgando del borde del piso
      bola.scale.setScalar(0.001);
      bola.visible = false;
      a.grupo.add(bola);
      return { malla: bola, nace: -1 };
    });
    a.puestas = 0;
    a.destello = -1;
    a.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEXTURA_HALO, color: 0xffe9a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    a.halo.position.set(0, 13.4 + 1.4, 0.6);
    a.halo.scale.set(8, 8, 1);
    a.grupo.add(a.halo);
  });

  var puntoAbeto = new THREE.Vector3();
  var estrellaMundo = new THREE.Vector3();

  function pegarBolas() {
    abetos.forEach(function (a) {
      if (a.puestas >= a.bolas.length) return;
      var choque = raycaster.intersectObject(a.malla, false)[0];
      if (!choque) return;
      a.grupo.worldToLocal(puntoAbeto.copy(choque.point));
      a.bolas.forEach(function (b) {
        if (b.nace >= 0) return;
        var dx = b.malla.position.x - puntoAbeto.x, dy = b.malla.position.y - puntoAbeto.y;
        if (dx * dx + dy * dy > ALCANCE_BOLA * ALCANCE_BOLA) return;
        b.nace = reloj;
        b.malla.visible = true;
        if (++a.puestas === a.bolas.length) completarAbeto(a);
      });
    });
  }

  function completarAbeto(a) {
    a.destello = reloj;
    a.estrella.localToWorld(estrellaMundo.set(0, 4 * 0.32, 0.3));
    for (var i = 0; i < 18; i++) {
      nuevaChispa(estrellaMundo.x + azar(-0.6, 0.6), estrellaMundo.y + azar(-0.6, 0.6), estrellaMundo.z + 0.5,
                  azar(-1.5, 1.5), azar(0.5, 2.5), azar(0.5, 1), azar(0.12, 0.25), elegir([COLOR.luz, '#ffe9a8', '#ffffff']));
    }
  }

  function actualizarBolas() {
    abetos.forEach(function (a) {
      a.bolas.forEach(function (b) {
        if (b.nace < 0 || b.listo) return;
        var u = Math.max(0, Math.min(1, (reloj - b.nace) / 0.28));
        var e = 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);   // saltito con rebote
        b.malla.scale.setScalar(Math.max(0.001, e));
        if (u >= 1) b.listo = true;
      });
      // La estrella brilla un momento al completar el abeto
      var brillo = 0;
      if (a.destello >= 0) {
        var t = (reloj - a.destello) / 1.2;
        if (t < 1) brillo = Math.sin(Math.PI * t);
        else a.destello = -1;
      }
      if (completo) brillo = Math.max(brillo, 0.75);        // estado final: la estrella brilla fija
      a.halo.material.opacity = 0.3 + brillo * 0.65;          // siempre un brillo suave; más al destellar
      a.estrellaMaterial.emissive.setRGB(brillo * 0.9, brillo * 0.7, brillo * 0.2);
    });
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
  var pista = document.getElementById('pista');

  /* mousemove: posición del ratón, giro de la casa y si está sobre los carteles HTML */
  cartel.addEventListener('mousemove', function (e) {
    var r = lienzo.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width * 2 - 1;
    var ny = -((e.clientY - r.top) / r.height * 2 - 1);
    raton.ndc.set(nx, ny);
    raton.dentro = true;
    raton.movido = true;
    if (pista) {                            // la pista se va al primer movimiento
      pista.classList.add('oculta');
      pista = null;
    }
    raton.sobreCartel = !!(e.target && e.target.closest && e.target.closest('.cartelito, .etiqueta'));
    giro.objetivoY = Math.max(-1, Math.min(1, nx)) * GIRO_MAX;
    giro.objetivoX = -ny * 0.05;
    // las campanas de la puerta reciben un empujoncito según lo que se mueve el ratón
    var mx = e.movementX || 0;
    balanceo.empujon += Math.max(-0.35, Math.min(0.35, mx * 0.012)) * (movimientoReducido ? 0.3 : 1);
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
      puntoMarcoAnterior = null;
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
    pivote.updateMatrixWorld(true);
    if (raton.movido && !raton.sobreCartel) { pegarPerlas(); pegarBolas(); }
    else if (raton.sobreCartel) puntoMarcoAnterior = null;
    raton.movido = false;

    // ¿Qué ventana hay bajo el cursor?
    var nueva = -1;
    if (!raton.sobreCartel) {
      var choques = raycaster.intersectObjects(zonasVentana, false);
      if (choques.length) nueva = choques[0].object.userData.ventana;
    }
    elegirVentana(nueva);
  }


  /* ---------- 6. ESTADO FINAL: chispitas, lluvia de regalitos y mensaje ---------- */
  var materialChispas = new THREE.MeshBasicMaterial();
  recortarCinta(materialChispas);
  var mallaChispas = crearReserva(160, materialChispas);
  var chispas = [];
  var COLORES_CHISPA = [COLOR.luz, COLOR.glaseado, '#ffe9a8', COLOR.rojo];
  var bocaMundo = new THREE.Vector3();
  var chispasPendientes = 0;
  var PUNTA_GORRO = new THREE.Vector3(1.6, 1.5, 0);   // las chispitas del final salen de la punta del gorro

  function nuevaChispa(x, y, z, vx, vy, dura, tam, color) {
    if (chispas.length >= 160) return;
    chispas.push({ x: x, y: y, z: z, vx: vx, vy: vy, fase: azar(0, 6.3), vida: 1, dura: dura, tam: tam, color: new THREE.Color(color) });
  }

  function actualizarChispas(dt) {
    if (completo) {
      chispasPendientes += dt * 16;        // unas 16 chispitas por segundo
      while (chispasPendientes >= 1 && chispas.length < 160) {
        chispasPendientes -= 1;
        casa.localToWorld(bocaMundo.copy(BOCA_CHIMENEA).add(PUNTA_GORRO));
        nuevaChispa(bocaMundo.x + azar(-0.6, 0.6), bocaMundo.y, bocaMundo.z + azar(-0.6, 0.6),
                    azar(-0.7, 0.7), azar(3, 5.5), azar(1.1, 1.9), azar(0.2, 0.42), elegir(COLORES_CHISPA));
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
     Los 8 primeros forman dos montoncitos fijos (4 a cada lado: 3 en la nieve y 1 encima) que se quedan
     en el estado final; los demás caen en sitios al azar y se desvanecen poco a poco.
     Van en coordenadas del mundo (no flotan con la casa), igual que la nieve dibujada. */
  var TOTAL_REGALITOS = 14;
  var FIJOS = 8;
  var LADO_REGALITO = 0.25;                // cubito de los regalitos
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
  var SALIDA_GORRO = new THREE.Vector3(0.8, 0.9, 0);   // salen por debajo del gorro levantado

  /* --- Farolillos vóxel, arbustos nevados y bloques de hielo, en la nieve de delante ---
     Se colocan en el plano z = 12 (como los regalitos), en el sitio de la pantalla que les toca. */
  var Z_ADORNOS = 12;
  /* Farola antigua vóxel: base de piedra, poste fino de hierro, caja de cristal con luz cálida
     y marco oscuro, tejadito en punta con nieve y un halo suave. Casi tan alta como la puerta. */
  var HIERRO = '#2b2b33';
  function crearFarolillo() {
    var g = new THREE.Group(), lista = [], cristal = [], x, y, z;
    function c(x, y, z, color) { lista.push({ x: x, y: y, z: z, color: color }); }
    function cuadro(lado, y, color, soloBorde) {             // capa de lado × lado cubitos centrada
      var m = (lado - 1) / 2;
      for (var i = 0; i < lado; i++) for (var k = 0; k < lado; k++) {
        if (soloBorde && i > 0 && i < lado - 1 && k > 0 && k < lado - 1) continue;
        c((i - m) * C, y, (k - m) * C, typeof color === 'function' ? color(i, k) : color);
      }
    }
    // base de piedra: dos capas de 4 × 4 y una de 2 × 2
    cuadro(4, C / 2, function () { return gris(); });
    cuadro(4, 1.5 * C, function (i, k) { return i === 0 || k === 3 ? '#b3b6bd' : gris(); });
    cuadro(2, 2.5 * C, function () { return gris(); });
    // poste fino de hierro, con un anillo
    for (y = 3.5 * C; y < 2.75; y += C) c(0, y, 0, HIERRO);
    cuadro(3, 1.375 + C / 2, HIERRO, true);
    cuadro(3, 2.75 + C / 2, HIERRO);                          // soporte del farol
    // caja de cristal: esquinas de hierro, cristales con luz y luz por dentro
    for (var capa = 0; capa < 4; capa++) {
      y = 3.0 + (capa + 0.5) * C;
      for (var i = 0; i < 4; i++) for (var k = 0; k < 4; k++) {
        x = (i - 1.5) * C; z = (k - 1.5) * C;
        var esquina = (i === 0 || i === 3) && (k === 0 || k === 3);
        if (esquina) c(x, y, z, HIERRO);
        else cristal.push({ x: x, y: y, z: z, color: (i === 0 || i === 3 || k === 0 || k === 3) ? COLOR.luz : '#fff2c8' });
      }
    }
    cuadro(4, 4.0 + C / 2, HIERRO);                           // marco de arriba
    // tejadito en punta, con nieve
    cuadro(6, 4.25 + C / 2, HIERRO);
    cuadro(6, 4.5 + C / 2, COLOR.glaseado, true);
    cuadro(4, 4.5 + C / 2, HIERRO);
    cuadro(4, 4.75 + C / 2, COLOR.glaseado, true);
    cuadro(2, 4.75 + C / 2, HIERRO);
    cuadro(2, 5.0 + C / 2, COLOR.glaseado);
    c(0, 5.25 + C / 2, 0, COLOR.sombraGlaseado);
    g.add(crearMallaVoxel(lista, C));
    var luz = crearMallaVoxel(cristal, C);
    luz.material = new THREE.MeshBasicMaterial({ vertexColors: false });
    luz.material.color.set(0xffffff);
    g.add(luz);
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEXTURA_HALO, color: 0xffc670, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    halo.position.set(0, 3.5, 0.5);
    halo.scale.set(5.2, 5.2, 1);
    g.add(halo);
    g.scale.setScalar(1.05);                                  // casi la altura de la puerta
    return g;
  }
  function crearArbusto(semilla) {
    var az = crearAzar(semilla), lista = [], L = 0.5;
    var verdes = ['#2e6b4a', '#3f8a5f', '#285c40', '#357a52'];
    for (var y = 0; y < 3; y++) {
      var rx = 1.3 - y * 0.35, rz = 0.75 - y * 0.15;
      for (var x = -rx; x <= rx + 0.01; x += L) {
        for (var z = -rz; z <= rz + 0.01; z += L) {
          if ((x / (rx + 0.2)) * (x / (rx + 0.2)) + (z / (rz + 0.2)) * (z / (rz + 0.2)) > 1) continue;
          var arriba = y === 2 || (y === 1 && Math.abs(x) > rx - 0.3);
          lista.push({ x: x, y: L / 2 + y * L, z: z, color: arriba && az() < 0.75 ? (z < 0 ? COLOR.glaseado : '#e3ebf6') : verdes[Math.floor(az() * 4)] });
        }
      }
    }
    var g = new THREE.Group();
    g.add(crearMallaVoxel(lista, L));
    return g;
  }
  function crearHielo(lado) {
    var malla = crearMallaVoxel([{ x: 0, y: lado / 2, z: 0, color: '#bfe6f8' }], lado);
    malla.material.transparent = true;
    malla.material.opacity = 0.88;
    malla.material.emissive = new THREE.Color(0x1d3a52);
    var g = new THREE.Group();
    g.add(malla);
    var brillo = crearMallaVoxel([{ x: -lado * 0.3, y: lado * 0.78, z: lado / 2 + 0.01, color: '#ffffff' }, { x: -lado * 0.18, y: lado * 0.66, z: lado / 2 + 0.01, color: '#ffffff' }], lado * 0.14);
    g.add(brillo);
    return g;
  }
  function ponerAdornosNieve() {
    function en(objeto, sx, sy, giro) {
      objeto.position.copy(puntoDePantalla(sx, sy, Z_ADORNOS));
      objeto.rotation.y = giro || 0;
      escena.add(objeto);
    }
    FAROLILLOS.forEach(function (f) { en(crearFarolillo(), f[0], f[1], 0); });
    en(crearArbusto(31), 262, 993, 0.2);
    en(crearArbusto(57), 586, 994, -0.3);
    en(crearHielo(1), 302, 996, 0.35);
    en(crearHielo(0.7), 322, 992, -0.2);
    en(crearHielo(0.85), 546, 996, -0.4);
  }

  /* Punto 3D, en el plano z dado, que se ve en (sx, sy) px del diseño */
  function puntoDePantalla(sx, sy, z) {
    camara.updateMatrixWorld();            // por si aún no se ha dibujado ningún fotograma
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
      montonIzquierdo: puntoDePantalla(318, 974, Z_REGALITOS),
      montonDerecho: puntoDePantalla(530, 974, Z_REGALITOS),
      tramos: [[270, 352], [500, 580]]                          // [desde, hasta] en x (sin los farolillos)
    };
    // en cada montón: 3 en fila sobre la nieve y 1 encima, algo desplazados y girados
    sitiosRegalitos.huecosMonton = [[-1.35, 0.15, 0.25], [1.35, -0.1, -0.3], [0, 0.25, 0.5], [-0.68, 0.05, -0.2]];
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
    var p = puntoDePantalla(azar(tramo[0], tramo[1]), azar(962, 976), Z_REGALITOS);
    return [p.x, Z_REGALITOS + azar(-0.4, 0.4), p.y, azar(-0.6, 0.6)];
  }

  function soltarRegalito() {
    levantarGorro(0.55, 0.28);             // el gorro se levanta un momento para dejarlo salir
    var k = regalitosSalidos++;
    var destino = destinoRegalito(k);
    var modelo = MODELOS_REGALITO[(k + Math.floor(k / 4)) % MODELOS_REGALITO.length];   // colores variados
    casa.localToWorld(bocaLanzamiento.copy(BOCA_CHIMENEA).add(SALIDA_GORRO));
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
        if (Math.abs(o.x - r.x) < 1.1 && Math.abs(o.z - r.z) < 1.1) apoyo = Math.max(apoyo, o.y + ALTO_CAJA);
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

  /* ---------- 7. TRINEO CON RENOS VÓXEL ----------
     Al encender las 4 ventanas, un trineo tirado por dos renos cruza el cielo por detrás
     de la casa, da la vuelta, baja en picado a la chimenea y desaparece dentro.
     Cada pieza (trineo y renos) sigue el mismo camino, una detrás de otra, como un trenecito.
     Un plano de recorte a la altura de la boca de la chimenea los «mete» dentro. */
  var R = 0.25;                            // cubito del trineo y los renos
  var planoBoca = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1000);   // de momento no recorta nada
  renderizador.localClippingEnabled = true;

  /* Malla de cubitos a partir de cajas [x0, x1, y0, y1, z0, z1, color] (las de después tapan a las de antes) */
  /* Silueta del trineo al irse: todos sus materiales mezclan su color con #140b24 según SILUETA_TRINEO
     (0 = en color … 1 = silueta oscura y sólida, sin brillo ni transparencia) */
  var SILUETA_TRINEO = { value: 0 };
  var COLOR_SILUETA = new THREE.Color(0x140b24);
  function oscurecerHaciaSilueta(material) {
    material.onBeforeCompile = function (sh) {
      sh.uniforms.silueta = SILUETA_TRINEO;
      sh.uniforms.colorSilueta = { value: COLOR_SILUETA };
      sh.fragmentShader = 'uniform float silueta;' + String.fromCharCode(10) + 'uniform vec3 colorSilueta;' + String.fromCharCode(10) +
        sh.fragmentShader.replace('#include <dithering_fragment>',
          '#include <dithering_fragment>' + String.fromCharCode(10) + '  gl_FragColor.rgb = mix(gl_FragColor.rgb, colorSilueta, silueta);');
    };
  }

  function mallaDeCajas(cajas) {
    var celdas = {};
    cajas.forEach(function (c) {
      for (var x = c[0]; x <= c[1]; x++) for (var y = c[2]; y <= c[3]; y++) for (var z = c[4]; z <= c[5]; z++) {
        celdas[x + ',' + y + ',' + z] = { x: x * R, y: y * R, z: z * R, color: typeof c[6] === 'function' ? c[6](x, y, z) : c[6] };
      }
    });
    var lista = Object.keys(celdas).map(function (k) { return celdas[k]; });
    var malla = crearMallaVoxel(lista, R);
    malla.material.clippingPlanes = [planoBoca];
    oscurecerHaciaSilueta(malla.material);
    malla.frustumCulled = false;
    return malla;
  }

  /* Reno mirando hacia +z (las patas, en y = 0) */
  function crearReno(lider) {
    var pelo = '#8a5530', oscuro = '#5e3a1f', claro = '#d9b48a', asta = '#f0dcb4', pezuna = '#3a2414';
    var cajas = [
      [-1, 1, 4, 6, -3, 3, pelo],                       // cuerpo
      [-1, 1, 4, 4, -2, 2, claro],                      // tripa
      [-1, -1, 0, 3, -3, -3, oscuro], [1, 1, 0, 3, -3, -3, oscuro],   // patas de atrás
      [-1, -1, 1, 3, 3, 3, oscuro], [1, 1, 1, 3, 3, 3, oscuro],       // patas de delante, recogidas
      [-1, -1, 1, 1, 4, 4, pezuna], [1, 1, 1, 1, 4, 4, pezuna],
      [-1, -1, 0, 0, -3, -3, pezuna], [1, 1, 0, 0, -3, -3, pezuna],
      [0, 0, 6, 7, -4, -4, COLOR.glaseado],             // colita
      [-1, 1, 6, 8, 3, 4, pelo],                        // cuello
      [-1, 1, 7, 7, 3, 4, COLOR.rojo],                  // collar
      [0, 0, 6, 6, 5, 5, ORO],                          // cascabel
      [-1, 1, 8, 10, 4, 6, pelo],                       // cabeza
      [-1, 1, 8, 9, 7, 7, claro],                       // hocico
      [-1, -1, 10, 10, 6, 6, pezuna], [1, 1, 10, 10, 6, 6, pezuna],   // ojos
      [-2, -2, 10, 10, 4, 4, oscuro], [2, 2, 10, 10, 4, 4, oscuro],   // orejas
      [-1, -1, 11, 12, 4, 4, asta], [1, 1, 11, 12, 4, 4, asta],       // astas
      [-2, -2, 12, 13, 4, 4, asta], [2, 2, 12, 13, 4, 4, asta],
      [-1, -1, 13, 13, 5, 5, asta], [1, 1, 13, 13, 5, 5, asta]
    ];
    cajas.push(lider ? [0, 0, 9, 9, 8, 8, '#ff3b3b'] : [0, 0, 9, 9, 8, 8, pezuna]);   // nariz (roja el primero)
    var g = new THREE.Group();
    var cuerpo = mallaDeCajas(cajas);
    cuerpo.position.y = -6 * R;            // el centro del reno en el origen
    g.add(cuerpo);
    if (lider) {                           // brillito de la nariz roja
      var brillo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: TEXTURA_HALO, color: 0xff5050, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, clippingPlanes: [planoBoca]
      }));
      brillo.scale.set(1.2, 1.2, 1);
      brillo.position.set(0, 3.25 * R, 8 * R);
      g.add(brillo);
      g.userData.brillo = brillo;          // se apaga al volverse silueta
    }
    return g;
  }

  /* Trineo rojo con patines dorados y un saco de regalos (mirando hacia +z) */
  function crearTrineo() {
    var rojo = COLOR.rojo, saco = '#9a5a2c';
    var cajas = [
      [-3, -3, 0, 0, -6, 5, ORO], [3, 3, 0, 0, -6, 5, ORO],           // patines
      [-3, -3, 1, 2, 6, 6, ORO], [3, 3, 1, 2, 6, 6, ORO],             // punta curvada
      [-3, -3, 3, 3, 5, 5, ORO], [3, 3, 3, 3, 5, 5, ORO],
      [-3, -3, 1, 1, -4, -4, ORO], [3, 3, 1, 1, -4, -4, ORO], [-3, -3, 1, 1, 2, 2, ORO], [3, 3, 1, 1, 2, 2, ORO],
      [-3, 3, 2, 2, -5, 4, rojo],                                     // suelo
      [-3, -3, 3, 5, -5, 4, rojo], [3, 3, 3, 5, -5, 4, rojo],         // laterales
      [-3, 3, 3, 4, 4, 4, rojo],                                      // frente
      [-3, 3, 3, 8, -5, -5, rojo],                                    // respaldo alto
      [-3, -3, 6, 6, -5, 3, ORO], [3, 3, 6, 6, -5, 3, ORO],           // ribete dorado
      [-3, 3, 9, 9, -5, -5, ORO], [-3, 3, 5, 5, 4, 4, ORO],
      [-2, 2, 3, 7, -4, -1, saco], [-1, 1, 8, 8, -3, -2, saco],       // saco
      [0, 0, 9, 9, -3, -3, COLOR.rojo],                               // su lazo
      [-2, -1, 3, 5, 1, 2, COLOR.verde], [0, 2, 3, 4, 0, 2, COLOR.luz], [-1, 0, 5, 6, 0, 1, COLOR.rojo]   // regalitos
    ];
    var g = new THREE.Group();
    var cuerpo = mallaDeCajas(cajas);
    cuerpo.position.y = -4 * R;
    g.add(cuerpo);
    return g;
  }

  /* Riendas: una barrita roja que se estira entre dos puntos */
  function crearRienda() {
    var material = new THREE.MeshLambertMaterial({ color: COLOR.rojo, clippingPlanes: [planoBoca] });
    oscurecerHaciaSilueta(material);
    var m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    m.frustumCulled = false;
    return m;
  }
  function estirarRienda(m, a, b) {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.lookAt(b);
    m.scale.set(0.07, 0.07, Math.max(0.01, a.distanceTo(b)));
  }

  var trineo = {
    activo: false, grupo: new THREE.Group(),
    piezas: [],                            // { obj, retraso (en unidades de camino), yaw, pitch, bote }
    riendas: [], camino: null, largo: 0, desde: 0, dura: 6.8,
    bocaInicio: new THREE.Vector3()
  };
  var ESCALA_TRINEO = 0.85;
  (function () {
    var lider = crearReno(true), segundo = crearReno(false), carro = crearTrineo();
    // [pieza, distancia por delante del trineo, fase del galope, tamaño propio]
    // El trineo, 1,6 veces mayor que antes: en proporción con los renos (y con sitio para el saco)
    [[carro, 0, 0, 1.6], [segundo, 5.0, 1.3, 1], [lider, 8.1, 2.6, 1]].forEach(function (p) {
      p[0].scale.setScalar(ESCALA_TRINEO * p[3]);
      trineo.grupo.add(p[0]);
      trineo.piezas.push({ obj: p[0], adelanto: p[1], yaw: 0, pitch: 0, bote: p[2], tam: p[3] });
    });
    for (var i = 0; i < 2; i++) {
      var r = crearRienda();
      trineo.grupo.add(r);
      trineo.riendas.push(r);
    }
    trineo.grupo.visible = false;
    escena.add(trineo.grupo);
  })();

  var bocaAhora = new THREE.Vector3();
  var desvio = new THREE.Vector3();
  var tangente = new THREE.Vector3();
  var puntoA = new THREE.Vector3(), puntoB = new THREE.Vector3();

  var SILUETA = new THREE.Color(0x1a1530);
  var tangenteExtra = new THREE.Vector3();
  var trineoDespedido = false;

  /* Llegada: cruza el cielo por detrás de la casa y se mete por la chimenea */
  function empezarTrineo() {
    casa.localToWorld(trineo.bocaInicio.copy(BOCA_CHIMENEA));
    var b = trineo.bocaInicio;
    trineo.camino = new THREE.CatmullRomCurve3([
      // por detrás de la casa, en la franja de cielo entre el eslogan y el tejado
      new THREE.Vector3(-46, 16, -16),
      new THREE.Vector3(-22, 17.4, -15),
      new THREE.Vector3(0, 16.8, -14),
      new THREE.Vector3(17, 17.4, -12),
      // vuelta por la derecha, acercándose
      new THREE.Vector3(24, 16.6, -7),
      new THREE.Vector3(19, 16.4, -3),
      // planea hasta la chimenea y se mete en ella
      new THREE.Vector3(b.x + 5, b.y + 2.8, b.z),
      new THREE.Vector3(b.x + 1.8, b.y + 2.2, b.z),
      new THREE.Vector3(b.x + 0.2, b.y + 0.8, b.z),
      new THREE.Vector3(b.x, b.y - 4, b.z)
    ], false, 'centripetal');
    trineo.largo = trineo.camino.getLength();
    trineo.modo = 'llegada';
    trineo.dura = 6.8;
    trineo.sDesde = 0;
    trineo.sHasta = trineo.largo + 4.5;    // el trineo entra del todo
    trineo.desde = reloj;
    trineo.activo = true;
    trineo.grupo.visible = true;
  }

  /* Despedida: sale de la chimenea y se aleja hacia la esquina de arriba a la derecha, como silueta
     oscura con estela dorada, haciéndose pequeño. Se queda quieto a lo lejos, en el cielo junto a la
     chimenea (hacia x 700, y 332 px del cartel: bajo la cinta del eslogan, sin tapar nada). */
  var ESCALA_LEJOS = 0.95;                  // tamaño al final, a lo lejos (se ve unas dos veces mayor que antes)
  var ESCALA_LLEGADA = 1.3, ESCALA_CHIMENEA = 0.8, ESCALA_CERCA = 1.4;
  function despedirTrineo() {
    trineoDespedido = true;
    casa.localToWorld(trineo.bocaInicio.copy(BOCA_CHIMENEA));
    var b = trineo.bocaInicio;
    var lejos = puntoDePantalla(802, 404, -30);              // donde se queda el reno de delante (abajo a la derecha de la luna)
    trineo.camino = new THREE.CatmullRomCurve3([
      new THREE.Vector3(b.x, b.y - 4, b.z),
      new THREE.Vector3(b.x, b.y + 2, b.z),
      new THREE.Vector3(b.x + 2.5, b.y + 4.5, b.z + 2),      // sale y se acerca un poco: se ve grande
      new THREE.Vector3(b.x + 8, b.y + 4.5, b.z),
      new THREE.Vector3(lejos.x - 10, lejos.y + 3, lejos.z + 8),   // hacia arriba a la derecha, alejándose
      new THREE.Vector3(lejos.x - 4, lejos.y + 0.4, lejos.z),      // el último tramo, de lado: se ve su silueta
      lejos
    ], false, 'centripetal');
    trineo.largo = trineo.camino.getLength();
    trineo.modo = 'salida';
    trineo.gorroCerrado = false;
    levantarGorro(1, -1);                  // se abre para dejarlo salir
    trineo.dura = 6;
    trineo.sDesde = -11;                   // empieza entero dentro de la chimenea
    trineo.sHasta = trineo.largo - 8.1 * ESCALA_LEJOS;      // el reno de delante, justo al final
    trineo.desde = reloj;
    trineo.activo = true;
    trineo.grupo.visible = true;
  }

  /* Posición en el camino a una distancia s del inicio (antes y después, sigue la dirección del camino) */
  function puntoCamino(s, destino) {
    var L = trineo.largo, u = Math.max(0, Math.min(1, s / L));
    trineo.camino.getPointAt(u, destino);
    if (s > L) destino.addScaledVector(trineo.camino.getTangentAt(1, tangenteExtra), s - L);
    else if (s < 0) destino.addScaledVector(trineo.camino.getTangentAt(0, tangenteExtra), s);
    // la casa se mueve un poco (flota y gira): el tramo de la chimenea se ajusta a la chimenea de ahora
    if (trineo.modo === 'llegada') destino.addScaledVector(desvio, THREE.MathUtils.smoothstep(u, 0.55, 0.85));
    else destino.addScaledVector(desvio, 1 - THREE.MathUtils.smoothstep(u, 0.1, 0.35));
    return u;
  }

  function actualizarTrineo(dt) {
    if (!trineo.activo) return;
    casa.localToWorld(bocaAhora.copy(BOCA_CHIMENEA));
    desvio.subVectors(bocaAhora, trineo.bocaInicio);
    var t = Math.min(1, (reloj - trineo.desde) / trineo.dura);
    // por debajo de la boca de la chimenea no se ve (solo mientras entra o sale de ella)
    var cercaChimenea = trineo.modo === 'llegada' || t < 0.35;
    planoBoca.constant = cercaChimenea ? -(bocaAhora.y - 0.1) : 1000;
    var suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // acelera y frena
    var s = trineo.sDesde + (0.25 * t + 0.75 * suave) * (trineo.sHasta - trineo.sDesde);
    var lejos = trineo.modo !== 'llegada';
    // Tamaño: al llegar, grande y se encoge al acercarse a la chimenea (para caber por ella);
    // al irse, sale pequeño, crece al pasar cerca y se hace pequeño al alejarse
    var uS = Math.max(0, s / trineo.largo), f;
    if (!lejos) f = ESCALA_LLEGADA + (ESCALA_CHIMENEA - ESCALA_LLEGADA) * THREE.MathUtils.smoothstep(uS, 0.55, 0.85);
    else if (uS < 0.3) f = ESCALA_CHIMENEA + (ESCALA_CERCA - ESCALA_CHIMENEA) * THREE.MathUtils.smoothstep(uS, 0.02, 0.3);
    else f = ESCALA_CERCA + (ESCALA_LEJOS - ESCALA_CERCA) * THREE.MathUtils.smoothstep(uS, 0.3, 1);
    // al irse pasa suavemente de color a silueta oscura y sólida, mientras se aleja
    SILUETA_TRINEO.value = lejos ? THREE.MathUtils.smoothstep(uS, 0.12, 0.6) : 0;
    trineo.piezas.forEach(function (p) {
      if (p.obj.userData.brillo) p.obj.userData.brillo.material.opacity = 1 - SILUETA_TRINEO.value;
    });

    trineo.piezas.forEach(function (p, i) {
      var sp = s + p.adelanto * f;
      var u = puntoCamino(sp, p.obj.position);
      p.obj.scale.setScalar(ESCALA_TRINEO * f * p.tam);
      // orientación: mira hacia donde va (si va en vertical, conserva el rumbo)
      trineo.camino.getTangentAt(Math.min(Math.max(u, 0.001), 0.999), tangente);
      var horizontal = Math.sqrt(tangente.x * tangente.x + tangente.z * tangente.z);
      if (horizontal > 0.15) p.yaw = Math.atan2(tangente.x, tangente.z);
      p.pitch = -Math.atan2(tangente.y, horizontal);
      p.obj.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
      if (i > 0 && !movimientoReducido) p.obj.position.y += Math.sin(reloj * 9 + p.bote) * 0.12 * f;   // galopan
      // estela de chispitas doradas detrás del trineo (al final, quieto a lo lejos, más suave)
      var ritmo = t >= 1 && lejos ? 10 : 40;
      if (i === 0 && p.obj.position.y > bocaAhora.y && Math.random() < dt * ritmo) {
        nuevaChispa(p.obj.position.x - tangente.x * 1.2 * f, p.obj.position.y - tangente.y * 1.2 * f, p.obj.position.z - tangente.z * 1.2 * f,
                    azar(-0.3, 0.3), azar(-0.8, -0.2), azar(0.6, 1), azar(0.12, 0.24) * (lejos ? 1.3 : 1), elegir([COLOR.luz, '#ffe9a8', ORO]));
      }
    });

    // riendas: del frente del trineo al pecho de cada reno
    var carro = trineo.piezas[0].obj, segundo = trineo.piezas[1].obj, lider = trineo.piezas[2].obj;
    trineo.grupo.updateMatrixWorld(true);
    estirarRienda(trineo.riendas[0], carro.localToWorld(puntoA.set(0, 0, 5 * R)), segundo.localToWorld(puntoB.set(0, R, 4 * R)));
    estirarRienda(trineo.riendas[1], segundo.localToWorld(puntoA.set(0, R, 4 * R)), lider.localToWorld(puntoB.set(0, R, 4 * R)));
    trineo.riendas.forEach(function (r) { r.scale.x = r.scale.y = 0.07 * f; });

    // el gorro hace de tapa: se abre antes de que llegue el trineo y cae cuando ya ha entrado (o salido)
    if (trineo.modo === 'llegada' && t > 0.45 && t < 1) levantarGorro(1, -1);
    if (trineo.modo === 'salida' && t > 0.3 && !trineo.gorroCerrado) { trineo.gorroCerrado = true; levantarGorro(0, -1); }
    if (t >= 1 && trineo.modo === 'llegada') {   // ya está dentro: desaparece y empiezan los regalos
      levantarGorro(0, -1);
      trineo.activo = false;
      trineo.grupo.visible = false;
      soltarRegalos();
    }
    // en la despedida, al llegar a lo lejos se queda ahí (sigue galopando y soltando chispitas)
  }

  /* Con las 4 ventanas encendidas: llega el trineo (es el estado final: no hay vuelta atrás) */
  function estadoFinal() {
    finalEn = -1;
    empezarTrineo();
  }

  /* Cuando el trineo se mete en la chimenea: bocanada de chispas, regalitos y mensaje */
  function soltarRegalos() {
    completo = true;
    proximoRegalito = reloj + 1.3;         // cuando el gorro ya ha caído
    casa.localToWorld(bocaMundo.copy(BOCA_CHIMENEA));
    for (var i = 0; i < 26; i++) {
      nuevaChispa(bocaMundo.x + azar(-0.8, 0.8), bocaMundo.y, bocaMundo.z + azar(-0.8, 0.8),
                  azar(-2, 2), azar(3, 7), azar(0.8, 1.4), azar(0.2, 0.45), elegir(COLORES_CHISPA));
    }
    cartel.classList.add('completo');      // el CSS muestra el mensaje final y los brillos
    iluminarTodo();
  }

  /* Estado final: todo iluminado y fijo (también en la captura y al imprimir)
     - las 4 ventanas con luz cálida (y su reflejo en la nieve);
     - todas las bombillitas encendidas a la vez: tejado, corona, cartelito y etiqueta (actualizarBombillas);
     - los abetos con todas sus bolitas y la estrella brillando (actualizarBolas);
     - las campanas con brillo dorado. El resplandor de la casa y el brillo del título y la cinta, en el CSS. */
  function iluminarTodo() {
    ventanas.forEach(function (v) {
      v.estado = 'activa';
      v.objetivo = BRILLO_ACTIVO;
    });
    abetos.forEach(function (a) {
      a.bolas.forEach(function (b, k) {
        if (b.nace >= 0) return;
        b.nace = reloj + 0.3 + k * 0.08;
        b.malla.visible = true;
      });
      a.puestas = a.bolas.length;
    });
    campanasHijas.forEach(function (h) {
      h.grupo.children[0].material.emissive.setRGB(0.42, 0.3, 0.06);
    });
    haloCampanas.material.opacity = 0.75;
  }


  /* --- Tamaño del canvas: sigue al cartel, sin deformarse --- */
  function ajustarTamano() {
    var r = cartel.getBoundingClientRect();
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderizador.setSize(r.width, r.height, false);
    materialNieve.uniforms.pxPorPx.value = r.height * renderizador.getPixelRatio() / ALTO;
    // la cinta con sus colas y su canto, en píxeles del lienzo (origen abajo a la izquierda)
    var c = document.querySelector('.cinta').getBoundingClientRect(), pr = renderizador.getPixelRatio(), rem = r.width / 84.8;
    ZONA_CINTA.value.set((c.left - r.left - 4.4 * rem) * pr, (r.bottom - c.bottom - 1.4 * rem) * pr,
                         (c.right - r.left + 4.4 * rem) * pr, (r.bottom - c.top) * pr);
  }


  /* ---------- Bucle de dibujo ---------- */
  var antes = null;
  function fotograma(ms) {
    var ahora = ms / 1000;                 // segundos
    var dt = antes === null ? 0 : Math.min(ahora - antes, 0.1);
    antes = ahora;
    reloj = ahora;

    actualizarCielo(ahora);
    moverCasa(dt);
    actualizarCampanas(dt);
    actualizarGorro(dt);
    actualizarRaton();
    actualizarVentanas(dt, ahora);
    actualizarBombillas(dt, ahora);
    actualizarNieve(dt);
    actualizarGlaseado(dt);
    if (completo && !trineoDespedido && regalitosSalidos >= TOTAL_REGALITOS && reloj >= proximoRegalito + 1.2) despedirTrineo();
    actualizarTrineo(dt);
    actualizarPerlas();
    actualizarBolas();
    actualizarChispas(dt);
    actualizarRegalitos(dt);
    if (finalEn > 0 && !completo && reloj >= finalEn) estadoFinal();

    renderizador.render(escena, camara);
    requestAnimationFrame(fotograma);
  }


  /* ---------- Arranque ---------- */
  construirSuelo();
  construirEstrellas();
  construirColinas();
  ponerAdornosNieve();
  vestirCarteles();
  construirGuirnaldasHTML();
  ajustarTamano();
  window.addEventListener('resize', ajustarTamano);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarTamano);   // la cinta cambia al cargar la letra
  window.addEventListener('beforeprint', function () {   // al imprimir, el gorro en su sitio
    gorro.a = gorro.v = gorro.objetivo = 0;
    gorro.hasta = -1;
    actualizarGorro(0);
    renderizador.render(escena, camara);
  });
  requestAnimationFrame(fotograma);
})();

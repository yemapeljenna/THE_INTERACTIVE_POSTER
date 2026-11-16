/* =========================================================
   CARTEL INTERACTIVO · 21 DE DICIEMBRE
   "AQUÍ DEBERÍA HABER UN REGALO" · estilo papel recortado
   Solo ratón (mouseenter / mousemove / mouseleave). Sin clics ni sonido.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Elementos ---------- */
  var cartel    = document.getElementById('cartel');
  var huecos    = Array.prototype.slice.call(document.querySelectorAll('.hueco'));
  var bombillas = Array.prototype.slice.call(document.querySelectorAll('.bombilla'));

  var COLORES = ['r', 'g', 'o', 'c'];       // rojo, verde, dorado y crema
  var movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Estado ---------- */
  var llenos = 0;
  var completo = false;
  var parallax = { x: 0, y: 0, objetivoX: 0, objetivoY: 0 };

  function alAzar(min, max) {
    return min + Math.random() * (max - min);
  }

  function colorDistinto(actual) {
    var nuevo = actual;
    while (nuevo === actual) {
      nuevo = COLORES[Math.floor(Math.random() * COLORES.length)];
    }
    return nuevo;
  }


  /* =========================================================
     PARTE 2 · ANIMACIÓN SOLA
     (el título, las tiras del árbol, la estrella y los copos van con CSS)
     ========================================================= */

  /* Bombillitas de papel: cambian de color al azar... */
  function cambiarBombillas() {
    if (!completo) {
      var cuantas = Math.random() < 0.5 ? 2 : 3;
      for (var i = 0; i < cuantas; i++) {
        var b = bombillas[Math.floor(Math.random() * bombillas.length)];
        b.setAttribute('data-c', colorDistinto(b.getAttribute('data-c')));
      }
    }
    setTimeout(cambiarBombillas, alAzar(800, 1500));
  }

  /* ...y a veces todas a la vez */
  function todasALaVez() {
    if (!completo) {
      bombillas.forEach(function (b) {
        b.setAttribute('data-c', colorDistinto(b.getAttribute('data-c')));
      });
    }
    setTimeout(todasALaVez, alAzar(10000, 18000));
  }


  /* =========================================================
     PARTE 3 · EVENTOS
     ========================================================= */

  /* mouseenter en un hueco: el regalo sube con rebote y muestra su etiqueta */
  function entrarEnHueco() {
    var hueco = this;
    if (!hueco.classList.contains('lleno')) {
      hueco.classList.add('lleno');
      llenos++;
      // El rebote solo la primera vez, cuando el regalo sale del hueco
      hueco.classList.add('rebote');
    }
    hueco.classList.add('activo');

    if (llenos === huecos.length && !completo) {
      setTimeout(estadoFinal, 800);
    }
  }

  /* mouseleave: baja un poco, pero se queda */
  function salirDeHueco() {
    this.classList.remove('activo');
  }

  huecos.forEach(function (hueco) {
    hueco.addEventListener('mouseenter', entrarEnHueco);
    hueco.addEventListener('mouseleave', salirDeHueco);
    hueco.addEventListener('animationend', function (e) {
      if (e.target.classList.contains('regalo')) {
        hueco.classList.remove('rebote');
      }
    });
  });

  /* mousemove en todo el cartel: parallax por capas (profundidad 3D) */
  function alMover(evento) {
    var r = cartel.getBoundingClientRect();
    parallax.objetivoX = ((evento.clientX - r.left) / r.width) * 2 - 1;
    parallax.objetivoY = ((evento.clientY - r.top) / r.height) * 2 - 1;
  }

  function alSalir() {
    parallax.objetivoX = 0;
    parallax.objetivoY = 0;
  }

  cartel.addEventListener('mousemove', alMover);
  cartel.addEventListener('mouseleave', alSalir);

  /* Movimiento suave: cada fotograma se acerca un poco al objetivo */
  function fotograma() {
    parallax.x += (parallax.objetivoX - parallax.x) * 0.07;
    parallax.y += (parallax.objetivoY - parallax.y) * 0.07;
    cartel.style.setProperty('--px', parallax.x.toFixed(3));
    cartel.style.setProperty('--py', parallax.y.toFixed(3));
    requestAnimationFrame(fotograma);
  }


  /* --- Estado final: los 7 regalos llenos --- */
  function estadoFinal() {
    completo = true;
    // La estrella gira y brilla, las bombillitas se encienden juntas
    // y el mensaje sustituye a "Aquí debería haber un regalo." (todo en CSS)
    cartel.classList.add('completo');
  }


  /* ---------- Arranque ---------- */
  if (!movimientoReducido) {
    requestAnimationFrame(fotograma);
    setTimeout(cambiarBombillas, 1500);
    setTimeout(todasALaVez, 9000);
  }
})();

# 21 de diciembre · Que en cada casa haya un regalo

Cartel interactivo para la campaña de la **Asociación Educativa Ítaca** (L'Hospitalet), con la colaboración de **PlanetaFP**, para que los niños y niñas en riesgo de exclusión tengan un regalo esta Navidad.

![Estado final del cartel](IMG/captura-final.png)

## Concepto

Una casita de jengibre hecha de cubitos (vóxel), con aire de juego de construcción con bloques, bajo un cielo nocturno con aurora boreal. Tiene cuatro ventanas apagadas y en cada una vive un muñequito de jengibre que todavía no tiene regalo. Con el ratón, quien mira el cartel va encendiendo las ventanas y en cada casa aparece un regalo. Así se cuenta la idea de la campaña: *que en cada casa haya un regalo*.

Cuando las cuatro ventanas están encendidas, un trineo tirado por dos renos vóxel cruza el cielo por detrás de la casa y se mete por la chimenea (el gorro de Papá Noel que la tapa se levanta para dejarlo entrar). Después salen chispitas y regalitos que caen delante de la valla y aparece el mensaje final:

> Hay niños que no tienen regalos esta Navidad
> **Con tu ayuda, sí**

El código QR del cartel colgante lleva a la página para colaborar.

## Estructura

```
THE_INTERACTIVE_POSTER/
├── index.html        textos, carteles de madera con los logos y el QR, y los lienzos del cielo y de la escena
├── CSS/style.css     maquetación (848 × 1200 px que se escalan sin deformarse), estilos pixel y modo impresión (A3)
├── JS/main.js        cielo, suelo, escena 3D con Three.js, nieve, eventos del ratón y estado final
└── IMG/              Logo_Aeitaca.webp, Logo_PlanetaFP.webp, qr.svg y captura-final.png
```

## Cómo verlo

Abre `index.html` en el navegador con doble clic (funciona como archivo local, sin servidor). Necesita conexión a internet para cargar Three.js y las tipografías. No hay clics ni sonido: todo funciona solo con el ratón. Para imprimirlo, usa Imprimir del navegador: sale en una hoja A3.

## Cabecera

- «Asociación Educativa Ítaca y PlanetaFP presentan», en Pixelify Sans plata.
- La pista y «Escanéame y ayúdanos a llenarlas», también en Pixelify Sans. «21 de diciembre» sigue en Fraunces.
- «21 de diciembre» con una capa de glaseado blanco y gotitas sobre la parte de arriba de las letras (filtro SVG `#glaseado-titulo`, calculado con la forma de las propias letras: se imprime igual).
- El eslogan, en Pixelify Sans crema sobre una cinta roja de regalo en pixel, fina y cerca del título, con los extremos en cola de golondrina. Va por debajo del lienzo 3D para que el gorro, al levantarse, pase por delante; la nieve y las chispitas se recortan en su zona y quedan detrás.
- La nieve que cae va siempre por detrás de los textos, de la cinta y de la casa.

## Animación que va sola

- **Cielo nocturno en bloques** (aire de juego de cubitos tipo sandbox, sin copiar ninguno): degradado de azul noche (`#0b1230`) a violeta (`#2a1a4a`); aurora boreal pixelada en cortinas verticales de franjas escalonadas (turquesa, morado y un toque de rosa), sin degradados, que ondula muy despacio (lienzo `#cielo`, ampliado sin suavizado); luna cuadrada pixelada de 60 px, blanca con manchitas grises suaves y un halo suave, en el cielo libre a la izquierda de la casa, entre la cinta del eslogan y el tejado; estrellas cuadradas de 2-4 px que titilan; nubes planas de bloques semitransparentes que van y vienen muy despacio; alguna estrella fugaz de píxeles; y colinas en escalones con nieve encima y pinos de bloques de tonos distintos con nieve en los pisos. Al imprimir, todo queda fijo.

- **Casa de jengibre** (inspirada en una construcción de StellaGaming, con su permiso): columnas de bastón de caramelo con rayas en espiral en las esquinas y junto a la puerta; marcos de las ventanas en rojo `#c0283a` con la parte de arriba en arco escalonado y sus perlitas de glaseado; zócalo de piedra gris pixelada con dos escalones hasta la puerta, que siguen en el caminito de piedra.
- **Gorro de Papá Noel** vóxel sobre la chimenea (rojo con borde blanco y pompón, doblado hacia un lado). Hace de tapa: se levanta e inclina cuando llega el trineo, el trineo entra y vuelve a caer con un pequeño rebote; se levanta un momento con cada regalito que sale y cuando el trineo se va. En el estado final y al imprimir está en su sitio.
- **Suelo de nieve en bloques**: escalones con desniveles, caras y laterales en sombra azulada `#9fc3e6` y textura pixelada; losas de piedra en bloques en el caminito; dos farolas antiguas vóxel casi tan altas como la puerta a los lados del caminito (base de piedra, poste fino de hierro `#2b2b33`, caja de cristal con luz cálida `#ffd27a` y marco oscuro, tejadito en punta con nieve y halo que se refleja en la nieve), dos arbustos nevados y tres bloques de hielo azul claro.
- **Carteles de madera pixelada** (HTML/CSS, nítidos al imprimir; la madera es una textura propia generada por código como SVG de píxeles, con vetas horizontales en `#8b5a2b`, `#a0703a` y `#6e4520`):
  - Logos: tablón sobre un poste clavado en la nieve, con nieve encima; los dos logos en contenedores idénticos sobre una hoja blanca clavada con cuatro clavitos; los créditos debajo, en Pixelify Sans.
  - QR: cartel colgante de una viga con dos cadenas grises de píxel, con nieve encima; el QR a 150 px sobre blanco y «Escanéame y ayúdanos a llenarlas» en Pixelify Sans crema sobre la madera.
  - Las luces de Navidad siguen alrededor de los dos carteles.
- **Nieve**: partículas cuadradas blancas de 3 a 6 px con opacidad fija (sin parpadeo), un leve vaivén y un desvanecimiento suave al salir. Caen todas por detrás de la casa y de los textos.
- **Texturas pixeladas**: cada cara de los bloques (galleta, glaseado, nieve, abetos, campanas) lleva un trozo de 8 × 8 de una textura de 16 × 16 píxeles con variaciones de tono, generada por código.
- **Brillo cálido (bloom)**: halos aditivos con perfil de bloom (núcleo intenso y falda ancha) alrededor de las bombillitas, las ventanas, las estrellas de los abetos y las campanas.
- **La casa flota** levemente; su sombra en la nieve se aclara cuando sube.
- **Bombillitas** del tejado y de los carteles que se encienden al azar y, de vez en cuando, todas a la vez.
- **Sombras y reflejos** en la nieve: sombras suaves de la casa y los abetos, el reflejo cálido de las ventanas encendidas y huellas de muñequito junto al caminito.
- **Corona de Navidad** en el centro de la fachada, entre las cuatro ventanas, con lazo rojo y lucecitas que parpadean como las del tejado.
- **Brillitos** que titilan en la nieve.
- **Pista inicial** («Decora las ventanas y los árboles con la manga pastelera») que desaparece con el primer movimiento del ratón.

## Eventos usados

| Evento | Dónde | Para qué |
|---|---|---|
| `mousemove` | el cartel | posición del ratón: giro de la casa, balanceo de las campanas, cursor de manga pastelera, rastro de glaseado, perlitas, bolitas y qué ventana hay debajo |
| `mouseenter` | el cartel y cada ventana | el cartel empieza a seguir el ratón; la ventana se enciende |
| `mouseleave` | el cartel y cada ventana | la casa vuelve al frente y desaparece la manga; la ventana baja a brillo suave |

Las ventanas están dentro de la escena 3D, así que su «entrar» y «salir» se calcula con un **raycaster**. En cada fotograma se lanza un rayo desde la cámara hacia el ratón y se mira qué ventana toca. Cuando cambia la ventana bajo el cursor, la anterior recibe su *mouseleave* y la nueva su *mouseenter*. Así funciona también aunque la casa se mueva bajo un ratón quieto. Sobre los dos carteles de madera se ve el cursor normal.

## Las tres interacciones

### 1. Mover el ratón (`mousemove`)
- La casa **gira un poco** hacia el cursor, con un movimiento suavizado.
- Las **dos campanas doradas** de la puerta, colgadas de un lazo rojo, se balancean un poquito con cada movimiento.
- El cursor es una **manga pastelera** en pixel art (64 px), con glaseado de colores en franjas dentro de la bolsa. La punta de su boquilla es la punta del ratón.
- La boquilla deja un **cordón continuo y ondulado de glaseado** con relieve, que va pasando por los colores de la bolsa (rojo, verde, rosa, menta y plata). Al cabo de un momento se encoge y suelta unas virutas de colores que caen; dura menos de un segundo.
- Si pasa por el **marco de una ventana**, va pegando **perlitas de colores** (rojo, verde, rosa, menta y plata, como las gominolas del tejado) en fila siguiendo el borde del marco, y bajo el alféizar un **festón ondulado** blanco con dos gotitas colgando (40 perlitas por ventana como máximo). Al completar un marco, la ventana hace un pequeño brillo. Las perlitas se quedan en el estado final y al imprimir.
- Si pasa por un **abeto**, se le cuelgan **bolitas de Navidad** vóxel (cubitos con las esquinas recortadas para que parezcan redondas, de color sólido rojo, verde, plata, rosa o menta, con un píxel de brillo blanco arriba a la izquierda, un tapón gris y un hilito hasta la rama), repartidas por las ramas (12 por abeto). Al completarlo, la estrella de la punta brilla un momento. También se quedan en el estado final y al imprimir.

### 2. Entrar en una ventana (*mouseenter*)
- La ventana **se enciende con luz cálida**, ilumina al muñequito y deja un reflejo en la nieve.
- La primera vez **aparece su regalo con un saltito**: un osito, un balón, un coche o una caja con lazo. El muñequito salta de alegría.

### 3. Salir de la ventana (*mouseleave*)
- La luz **baja a un brillo suave** y el regalo se queda.
- Con **las cuatro ventanas encendidas** llega el estado final: el trineo con los renos cruza el cielo, baja a la chimenea y desaparece; luego salen chispitas y regalitos en arco que caen delante de la valla (4 se quedan fijos a cada lado de la puerta) y aparece el mensaje final, en Pixelify Sans (crema `#f7efe4` y «Con tu ayuda, sí» más grande en dorado `#e8b84a`, con sombra en bloque `#4a0d18`), sobre un recuadro de píxel rojo `#c0283a` con borde escalonado `#8a1c2e` y nieve encima, centrado entre los dos carteles. Después el trineo sale de la chimenea y, mientras se aleja hacia la derecha, pasa suavemente de color a una silueta oscura y sólida (`#140b24`) con estela dorada; se queda a lo lejos, delante de la aurora, también en la captura y al imprimir.
- En el estado final **todo queda iluminado y fijo** (también en la captura y al imprimir): todas las bombillitas encendidas, las 4 ventanas con luz cálida y su reflejo, los abetos con sus bolitas y la estrella brillando, las campanas doradas, un resplandor cálido alrededor de la casa y un leve brillo en el título y en la cinta. Es el estado final y no tiene vuelta atrás. Para volver a empezar, recarga la página.

## Paleta

| Uso | Color |
|---|---|
| Cielo | `#0b1230` → `#2a1a4a`, aurora `#4fd1c5` / `#7b4fa0` / `#f08aa6` |
| Galleta / sombras de galleta | `#c9824a` / `#9a5a2c` |
| Nieve del suelo | `#fffaf3` → `#f1f3f8`, sombras de los escalones `#9fc3e6` |
| Rojo, verde, plata | `#c0283a`, `#2e6b4a`, `#c8ccd4` |
| Luz de ventanas y farolas | `#ffd27a`, hierro `#2b2b33` |
| Madera de los carteles | `#8b5a2b`, `#a0703a`, `#6e4520` |
| Silueta del trineo | `#140b24` |
| Textos | `#f7efe4` (título), `#c8ccd4` plata (presentan), `#f7efe4` sobre cinta `#c0283a` / `#8a1c2e` (eslogan), mensaje final `#f7efe4` y `#e8b84a` con sombra `#4a0d18` |
| Glaseado (toda la casa) | `#ffffff` con sombras `#dfe6ef` |

## Créditos técnicos

- [Three.js](https://threejs.org/) r128 (licencia MIT), desde cdnjs.
- Tipografías [Fraunces](https://fonts.google.com/specimen/Fraunces) (solo «21 de diciembre») y [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (el resto de textos) (SIL Open Font License), desde Google Fonts.
- Todas las texturas (bloques, madera, nieve, cielo) están generadas por código.

Casita inspirada en una construcción de StellaGaming, con su permiso.

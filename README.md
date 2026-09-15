# Almacén Seguro — Recorrido continuo

Abre `index.html` en un navegador moderno. No requiere instalación ni servidor. Diseño negro y amarillo inspirado en AB InBev.

## Archivos

- `index.html`: estructura, controles y paneles.
- `styles.css`: diseño adaptable a escritorio y móvil.
- `game.js`: mundo, movimiento, escaleras, colisiones, decisiones y objetivos.
- `scenarios.js`: incidentes por equipo incorrecto y condiciones inseguras.
- `tests/game.test.cjs`: pruebas de lógica; ejecutar con `node tests/game.test.cjs`.

## Pantallas de celular

La interfaz se adapta a orientación vertical y horizontal, con botones táctiles de al menos 44 píxeles, cuadros de preguntas desplazables y espacio para las áreas seguras del dispositivo. Al entrar a jugar en celular, la página se desplaza al juego. Girar la pantalla ajusta la cámara y la resolución sin reiniciar la partida.

Se verificaron en Chrome nueve tamaños: 320×568, 360×640, 390×844, 430×932, 568×320, 667×375, 844×390, 932×430 y 768×1024. La comprobación está en `tests/mobile.html`; para ejecutarla, sirve la carpeta con un servidor local y abre esa página. Comprueba desbordamientos, cuadros, controles y altura del juego.

## Controles

- Flechas izquierda/derecha o A/D: caminar y recorrer los peldaños de las escaleras, tanto de subida como de bajada.
- Espacio, flecha arriba o W: saltar en los espacios libres. No se permite saltar sobre tarimas ni saltarse las escaleras.
- E: interactuar.
- P o Escape: pausar.
- ↻: reiniciar toda la partida.

En dispositivos táctiles aparecen botones. Cambiar de ventana pausa la partida.

## Recorrido sin salida

Al llegar al extremo del sector se genera el siguiente y el personaje continúa con su EPP y sus vidas. No hay puerta final ni pantalla de victoria. La partida termina cuando se agotan las tres vidas.

Los contadores acumulan tarimas de Stella, condiciones reportadas, actos inseguros reportados y escaleras recorridas. Cada sector renueva sus objetos y reportes; las condiciones que se dejaron atrás sin reportar no suman puntos. Los cinco objetivos del panel corresponden al sector actual.

La dificultad aumenta de forma gradual:

- Sector 1: dos cruces y una escalera con subida, pasarela y bajada.
- Desde el sector 2: tres cruces y dos escaleras.
- Desde el sector 4: cuatro cruces.
- Las escaleras aumentan hasta 12 peldaños por tramo y los peldaños se estrechan hasta un mínimo de 19 unidades.
- El tiempo de alto aumenta de 1.2 a un máximo de 2.4 segundos; la zona de detención se estrecha de 115 a un mínimo de 65 unidades.
- Los montacargas en movimiento aceleran su animación progresivamente. Cuando aparece PASA se detienen.

Las escaleras se recorren caminando sobre una superficie escalonada; no son tarimas. No se permite atravesarlas saltando. Una escalera suma al contador después de alcanzar la pasarela y terminar el descenso hacia la derecha.

## Decisiones y condiciones inseguras

Elige el equipo y entra, incluso con una selección incorrecta o incompleta. El personaje muestra lo que elegiste. Casco/gorra y botas/sandalias son opciones excluyentes.

Cada incidente de equipo ocurre una vez por partida y resta una vida:

- Gorra o falta de casco: caída de una caja sobre la cabeza.
- Audífonos de música: atropellamiento por un montacargas fuera del cruce.
- Sandalias o falta de botas: caja que cae junto al pie.
- Falta de chaleco: incidente con montacargas por baja visibilidad, fuera del cruce.

Después aparece una explicación. Si quedan vidas, se puede corregir esa elección y continuar. Si no quedan vidas, primero se muestra la explicación y después el resultado. Las animaciones son caricaturescas y sin sangre.

En cada sector hay cinco condiciones para encontrar: tarima inclinada, banco en la ruta del montacargas, derrame sin señalizar, flejes/plástico sueltos y extintor bloqueado. Al interactuar se debe identificar la condición entre tres opciones. Una respuesta equivocada no resta vidas. Reportar suma una sola vez por objeto y no elimina visualmente el peligro.

## Actos inseguros de las personas

Cada sector incorpora dos personas animadas:

- Una persona camina sin casco por el almacén.
- Otra sube y baja por la escalera con las manos junto al cuerpo, sin sujetarse del pasamanos.

El jugador puede acercarse e interactuar con E para identificar la conducta entre tres opciones. La interacción toma en cuenta la posición y la altura de la persona. Las escenas se detienen mientras se responde. Una respuesta incorrecta permite reintentar sin perder vidas; la correcta suma una sola vez al contador ACTOS y muestra una explicación.

Los actos se contabilizan por separado de las condiciones del entorno. Cada sector genera personas nuevas para observar y conserva los totales de la partida. Antes de reportar no hay marcadores ni avisos encima de las personas. El personaje del jugador extiende una mano hacia el pasamanos al recorrer las escaleras.

## Ubicaciones variables

Cada partida y cada sector redistribuyen las cinco condiciones y la persona sin casco entre zonas de observación distintas. Ninguna de esas escenas repite la misma zona que ocupó en la distribución anterior. Se conserva separación entre escenas y se evitan cruces, zonas de alto y escaleras.

La persona que no usa el pasamanos cambia de tramo de escalera y, cuando hay varias escaleras, también puede cambiar de escalera. Su posición inicial y dirección de marcha varían. Las posiciones se mantienen durante el sector; pausar o abrir una inspección no cambia la distribución.

## Exploración sin pistas

Los objetos no muestran signos de admiración, avisos de proximidad ni indicaciones de dónde interactuar. El jugador descubre las condiciones observando el almacén. Los controles generales siguen disponibles y las explicaciones aparecen después de actuar o sufrir un incidente. Solo las condiciones ya reportadas y las tarimas registradas reciben una confirmación visual.

## Recursos

El juego y las ilustraciones funcionan sin conexión. Las fuentes de Google son opcionales y tienen alternativas locales. No hay bibliotecas ni recursos gráficos externos obligatorios.

Simulación educativa: la selección de EPP corresponde a este escenario ficticio. El equipo real depende de los riesgos, las tareas y las reglas del centro. El EPP no sustituye las rutas seguras ni el control de cargas y vehículos.

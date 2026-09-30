# Almacén Seguro — Recorrido continuo

Abre `index.html` en un navegador moderno. No requiere instalación ni servidor. Diseño negro y amarillo inspirado en AB InBev.

## Archivos

- `index.html`: estructura, controles y paneles.
- `styles.css`: diseño adaptable a escritorio y móvil.
- `game.js`: mundo, movimiento, escaleras, colisiones, decisiones y objetivos.
- `scenarios.js`: incidentes por equipo incorrecto y condiciones inseguras.
- `tests/game.test.cjs`: pruebas de lógica; ejecutar con `node tests/game.test.cjs`.

## Pantallas de celular

La interfaz se adapta a orientación vertical y horizontal, con botones táctiles de al menos 44 píxeles, cuadros de preguntas desplazables y espacio para las áreas seguras del dispositivo. El instructivo y la guía de controles aparecen juntos antes del escenario. La bienvenida y el botón de inicio aparecen dentro del escenario; al pulsarlo se abre allí la selección de EPP. Al confirmar el equipo hay 2.5 segundos para observar el escenario antes de que empiece el avance automático. Girar la pantalla ajusta la cámara y la resolución sin reiniciar la partida.

Se verificaron en Chrome nueve tamaños: 320×568, 360×640, 390×844, 430×932, 568×320, 667×375, 844×390, 932×430 y 768×1024. La comprobación está en `tests/mobile.html`; para ejecutarla, sirve la carpeta con un servidor local y abre esa página. Comprueba desbordamientos, cuadros, controles y altura del juego.

## Controles

- El personaje avanza automáticamente. Flecha izquierda o A: frenar para observar y detenerse en cruces. Flecha derecha o D: acelerar. Recorre los peldaños de las escaleras al avanzar.
- Espacio, flecha arriba o W: saltar en los espacios libres. No se permite saltar sobre tarimas ni saltarse las escaleras.
- E: interactuar.
- E o Interactuar cerca de una escalera: sujetarse o soltar el pasamanos. Un cartel con pictograma indica su uso obligatorio. Avanzar sin sujetarse resta una vida y explica el riesgo de caída, una sola vez por escalera. Al salir se suelta y debe elegir de nuevo en la siguiente.
- P o Escape: pausar.
- ↻: reiniciar toda la partida.

En dispositivos táctiles, desliza la palanca hacia la izquierda para frenar o hacia la derecha para acelerar. Al soltarla vuelve al centro y el avance automático continúa. Los botones «Usar» y «Saltar» quedan a su lado. Cambiar de ventana pausa la partida.

## Recorrido sin salida

Al llegar al extremo del sector se genera el siguiente y el personaje continúa con su EPP y sus vidas. No hay puerta final ni pantalla de victoria. La partida comienza con tres vidas y termina al llegar a cero. Se pueden recuperar vidas con monedas seguras, hasta un máximo de cinco.

El personaje avanza a 300 unidades por segundo en el sector 1; cada sector suma 20 unidades. La dificultad de detección aumenta al incorporar más tipos de riesgo y acto entre los sectores 1 y 8. Una racha aumenta al cruzar con seguridad, registrar Stella o Flying Fish, reportar observaciones y completar escaleras. También hay puntos de atención opcionales para recoger saltando en espacios libres. Al terminar, se puede reintentar de inmediato con el mismo EPP o cambiarlo. Si deja atrás una condición o una conducta sin reportarla, pierde una vida y recibe una explicación; cada omisión se penaliza una sola vez y puede volver a reportarse si quedan vidas.

Los contadores acumulan tarimas de Stella y Flying Fish, monedas, condiciones reportadas, actos inseguros reportados y escaleras recorridas. Quince monedas recogidas de forma segura dan una vida adicional. Aparecen como máximo cuatro monedas normales por sector, separadas por al menos 1200 unidades; el progreso para ganar una vida se conserva entre sectores. Las monedas tentadoras aparecen en el centro de dos cruces al acercarse y desaparecen después de un segundo. El tiempo restante se muestra con números negros sobre un recuadro amarillo. Solo se pueden recoger tras esperar la señal; entrar por ella antes de tiempo cuesta una vida y muestra una explicación. Cada sector renueva sus objetos y reportes; las condiciones que se dejaron atrás sin reportar no suman puntos. Los seis objetivos de seguridad se mantienen en cada sector sin un panel de tarjetas.

La dificultad aumenta de forma gradual:

- Sector 1: dos cruces y una escalera con subida, pasarela y bajada.
- Desde el sector 2: tres cruces y dos escaleras.
- Desde el sector 4: cuatro cruces.
- Las escaleras aumentan hasta 12 peldaños por tramo y los peldaños se estrechan hasta un mínimo de 19 unidades.
- El tiempo de alto aumenta de 0.8 a un máximo de 1.6 segundos; la zona de detención se estrecha de 115 a un mínimo de 65 unidades.
- Desde el sector 5 aumenta la velocidad de los montacargas. Los cruces regulados mantienen la señal PASA; el montacargas que ignora el alto aparece como un acto independiente para reportar.

Las escaleras se recorren caminando sobre una superficie escalonada; no son tarimas. No se permite atravesarlas saltando. Una escalera suma al contador después de alcanzar la pasarela y terminar el descenso hacia la derecha.

## Decisiones y condiciones inseguras

Elige el equipo y entra, incluso con una selección incorrecta o incompleta. El personaje muestra lo que elegiste. Casco/gorra y botas/sandalias son opciones excluyentes.

Cada incidente de equipo ocurre una vez por partida y resta una vida:

- Gorra o falta de casco: caída de una caja sobre la cabeza.
- Audífonos de música: atropellamiento por un montacargas fuera del cruce.
- Sandalias o falta de botas: caja que cae junto al pie.
- Falta de chaleco: incidente con montacargas por baja visibilidad, fuera del cruce.

Después aparece una explicación. Si quedan vidas, se puede corregir esa elección y continuar. Si no quedan vidas, primero se muestra la explicación y después el resultado. Las animaciones son caricaturescas y sin sangre.

Las condiciones se incorporan según la progresión indicada abajo: tarima inclinada, gotera sobre la ruta peatonal, derrame sin señalizar, flejes/plástico sueltos y extintor bloqueado. Al interactuar se debe identificar la condición entre tres opciones. Cada respuesta equivocada resta una vida y muestra la explicación. Reportar suma una sola vez por objeto y no elimina visualmente el peligro.

## Actos inseguros de las personas

Las personas incluyen estas conductas, además de correr y operar montacargas de forma insegura:

- Una persona camina sin casco por el almacén.
- Otra trabaja sin el chaleco de alta visibilidad requerido.
- Otra se acerca demasiado a un montacargas en movimiento.
- Otra camina hablando por teléfono y deja de prestar atención a la ruta.
- Otra sube y baja por la escalera con las manos junto al cuerpo, sin sujetarse del pasamanos.

El jugador puede acercarse e interactuar con E para identificar la conducta entre tres opciones. La interacción toma en cuenta la posición y la altura de la persona. Las escenas se detienen mientras se responde. Una respuesta incorrecta resta una vida y permite reintentar si quedan vidas; la correcta suma una sola vez al contador ACTOS y confirma el reporte sin interrumpir el recorrido.

Los actos se contabilizan por separado de las condiciones del entorno. Cada sector genera personas nuevas para observar y conserva los totales de la partida. Antes de reportar no hay marcadores ni avisos encima de las personas. El personaje del jugador extiende una mano hacia el pasamanos solo cuando el jugador decide sujetarse con E o el botón «Interactuar».

## Ubicaciones variables

Cada partida y cada sector redistribuyen los cruces de montacargas, las escaleras, las cinco condiciones y las cuatro personas que caminan por el piso. Los cruces y las escaleras cambian de posición entre sectores; las zonas de observación se eligen después para que no queden dentro de ellos. Ninguna condición o persona del piso repite la misma zona que ocupó en la distribución anterior.

La persona que no usa el pasamanos cambia de tramo de escalera y, cuando hay varias escaleras, también puede cambiar de escalera. Su posición inicial y dirección de marcha varían. Las posiciones se mantienen durante el sector; pausar o abrir una inspección no cambia la distribución.

## Exploración sin pistas

Los objetos no muestran signos de admiración, avisos de proximidad ni indicaciones de dónde interactuar. El jugador descubre las condiciones observando el almacén. Los controles generales siguen disponibles y las explicaciones aparecen después de actuar o sufrir un incidente. Solo las condiciones ya reportadas y las tarimas registradas reciben una confirmación visual.

## Recursos

El juego y las ilustraciones funcionan sin conexión. Las fuentes de Google son opcionales y tienen alternativas locales. No hay bibliotecas ni recursos gráficos externos obligatorios.

Simulación educativa: la selección de EPP corresponde a este escenario ficticio. El equipo real depende de los riesgos, las tareas y las reglas del centro. El EPP no sustituye las rutas seguras ni el control de cargas y vehículos.

## Inventario progresivo y reportes aprendidos

Desde el sector 2, las tarimas se mezclan en dos grupos con cajas azules de Corona y rojas de Victoria. Cada sector desde el 2 tiene tantas tarimas objetivo como su número de sector y la misma cantidad de distractores (4, 6, 8, 10… tarimas en total); la distancia de interacción se reduce progresivamente hasta 36 unidades. Se registra la tarima más cercana: las otras marcas no suman al inventario y cada intento de registrarlas resta 50 puntos. El descuento aparece al interactuar y en los resultados; la puntuación puede ser negativa. El recorrido se amplía para acomodar el inventario adicional sin invadir cruces, escaleras ni los tramos exclusivos de montacargas. Los resultados cuentan las tarimas objetivo reales de todos los sectores iniciados.

Cada interacción con una situación abre las opciones de reporte, aunque ya haya sido identificada o reportada. Volver a acertar sobre el mismo objeto no añade puntos; cada aparición nueva cuenta una vez.

## Progresión de riesgos

Velocidad automática del jugador: 300 unidades por segundo en el sector 1, con un aumento de 20 por sector. La aceleración manual sigue disponible. Cada sector conserva las situaciones anteriores:

- Sector 1: personal sin chaleco, sin casco, hablando por teléfono y corriendo.
- Sector 2: goteras y tarimas ladeadas.
- Sector 3: objetos/flejes en el suelo y personas sin usar el pasamanos.
- Sector 4: extintores bloqueados, personas cerca del montacargas, montacargas que ignora el alto y vidrio en el paso peatonal.
- Sector 5: montacargas a exceso de velocidad; aumenta gradualmente hasta el sector 8.
- Sector 6: piso resbaloso y derrames.
- Sector 7: fragmentos de vidrio más pequeños, todavía visibles.
- Sector 8: película resbalosa de menor contraste, con reflejos visibles.

Después del sector 8 se conserva la dificultad máxima. Las reglas de EPP, cruces, pasamanos e inventario se mantienen. Los montacargas inseguros tienen una zona de observación separada de los cruces regulados.

Los montacargas que ignoran el alto y los que van a exceso de velocidad hacen una sola pasada hacia adelante por el carril contiguo, desde atrás del jugador. Mientras cualquier parte del vehículo esté en pantalla, E/Interactuar permite reportarlo sin exigir proximidad. Abrir una pregunta pausa la pasada. Al salir por la derecha sin reporte correcto, se pierde una vida y se explica el riesgo; el vehículo no regresa y la omisión no se penaliza de nuevo. Un sector espera a que termine una pasada activa antes de cambiar.

## Tramos exclusivos y resultado tras el sector 4

Desde el sector 4, el almacén se amplía de 8000 a 12000 unidades. Los riesgos normales se quedan antes de la zona final; las pasadas de montacargas tienen tramos exclusivos desde las posiciones 9000 y 10600, separados de cruces, escaleras, inventario y otros riesgos. No empieza otra pasada mientras una siga activa, ni se inicia una si hay una omisión anterior pendiente de explicar.

Al perder desde el sector 5, el resultado del juego muestra «Apto para entrar al almacén», porque se completaron los primeros cuatro sectores. Perder durante el sector 4 todavía no activa ese mensaje; reiniciar borra el progreso.

La persona corriendo hace una única pasada desde atrás hacia adelante, con una zancada más amplia y animación rápida. Se puede reportar mientras esté visible con E/Interactuar; al salir sin reporte correcto resta una vida y explica el riesgo. No vuelve ni repite la penalización. Sus pasadas no coinciden con las de los montacargas.

Desde el sector 5 se agregan dos tarimas por sector sin el límite anterior de ocho. El área de inventario y las ubicaciones de los tramos exclusivos de montacargas se desplazan para conservar la separación.

Desde el sector 7 hay una segunda persona en una escalera que lleva una caja tapando los peldaños, sin sujetarse del pasamanos. Al reportarla aparece un checklist de seis opciones. Deben seleccionarse las cuatro acciones seguras y dejar sin marcar las dos inseguras. Cada validación incorrecta resta una vida y explica qué corregir. Al agotar las vidas se muestra la explicación antes del resultado. La correcta registra el acto una sola vez. El checklist incluye casco, chaleco de alta visibilidad y botas de seguridad como EPP de esta misión. El checklist se mantiene en sectores posteriores.

Desde el sector 3 aparece una persona parada directamente sobre una tarima sin cajas. Se reporta desde el piso con E/Interactuar, identificando que la tarima no es una plataforma para personas. La tarima no puede usarse para saltar o subir. El acto continúa en los sectores posteriores y su omisión sigue la regla de pérdida de una vida.

La persona corriendo tiene su propio tramo exclusivo, después de todos los riesgos e inventario y antes de los montacargas. Sus posiciones base son 9000 (persona), 11000 (montacargas sin alto) y 13000 (montacargas rápido), desplazadas por la ampliación del inventario. El recorrido mide 10500 unidades antes del sector 4 y 14500 desde el sector 4, más dicha ampliación. Las pasadas siguen siendo de una en una.

## Rendimiento

El render dibuja únicamente estanterías, señalización y objetos dentro de la vista o de su margen; los objetos fuera de pantalla conservan su lógica. En menús, pausas, preguntas y resultados solo se redibuja cuando cambia la escena o su tamaño. Las pestañas ocultas no dibujan y las pantallas de alta frecuencia se limitan a aproximadamente 60 cuadros por segundo. La asignación de posiciones usa emparejamiento de zonas en vez de buscar permutaciones completas.

`node tests/performance.cjs` comprueba que las llamadas de dibujo se mantienen acotadas al avanzar de sector. Es una medición de operaciones de canvas con un contexto simulado, no de FPS ni del consumo real de CPU/GPU. `node tests/game.test.cjs` incluye pruebas de pausa, pestaña oculta y límite de refresco.

Las posiciones de inicio de la persona corriendo y de los montacargas también varían aleatoriamente dentro de sus tramos exclusivos y no repiten la posición de la aparición anterior. Se mantiene la separación respecto a los demás riesgos. Cada respuesta incorrecta al identificar un riesgo o acto resta una vida; al llegar a cero se muestra la explicación y el botón para ir a resultados.

Desde el nivel 3 se garantiza más inventario: 12 tarimas en el 3, 16 en el 4, 20 en el 5 y cuatro más por nivel. La mitad son objetivos (Stella/Flying Fish) y la mitad distractores (Corona/Victoria). Se mezclan las marcas, se varían los tamaños de los grupos iniciales y se aleatorizan las posiciones del inventario adicional. Los corredores y montacargas conservan tramos separados.

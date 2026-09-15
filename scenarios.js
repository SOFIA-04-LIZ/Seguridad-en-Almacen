'use strict';
// Escenarios ficticios de aprendizaje. Las animaciones no representan una lesión real.
window.WAREHOUSE_SCENARIOS = {
  equipment: [
    {id:'head', x:300, kind:'box', title:'Una gorra no sustituye al casco.',
      explanation:'La gorra cubre del sol, pero no está diseñada para proteger de impactos de objetos. En esta escena cae una caja: necesitas casco y mantenerte fuera de cargas inestables. El casco tampoco hace seguro colocarse debajo de una carga.',
      missingTitle:'Entraste sin protección en la cabeza.', fix:'Colocar casco de seguridad', add:'helmet', remove:'cap'},
    {id:'audio', x:650, kind:'forklift', title:'La música te aisló de las advertencias.',
      explanation:'Los audífonos de música pueden dificultar oír alarmas y vehículos. Aquí el montacargas aparece en un pasillo, fuera del cruce. Retíralos y mantén atención visual y auditiva. No son protección auditiva industrial.',
      fix:'Retirar audífonos de música', remove:'headphones'},
    {id:'feet', x:1120, kind:'foot', title:'Las sandalias dejan tus pies expuestos.',
      explanation:'Una caja cae cerca del pie. Las sandalias no tienen la protección del calzado de seguridad frente a impactos y objetos del piso. Usa las botas de esta misión y aléjate de materiales que puedan caer.',
      missingTitle:'Entraste sin calzado de seguridad.', fix:'Colocar botas de seguridad', add:'boots', remove:'sandals'},
    {id:'visibility', x:1650, kind:'forklift', title:'Sin chaleco eres menos visible.',
      explanation:'El operador tarda en distinguirte en este pasillo. El chaleco de alta visibilidad ayuda a que te vean; no te da prioridad ni evita por sí solo un atropellamiento. Mantén la separación y confirma que el vehículo se detuvo.',
      fix:'Colocar chaleco de alta visibilidad', add:'vest'}
  ],
  acts: [
    {id:'noHelmet',title:'Persona caminando sin casco',choices:['Caminar sin el casco requerido','Usar el chaleco de alta visibilidad','Caminar con el equipo completo'],answer:0,
      explanation:'La persona camina por el almacén sin el casco requerido en esta misión. Es un acto inseguro: corresponde a una conducta, no al estado de un objeto. Reporta lo observado para que se corrija el uso de EPP antes de continuar la tarea.'},
    {id:'noHandrail',title:'Subir o bajar sin sujetarse del pasamanos',choices:['Usar el pasamanos al subir','Subir y bajar sin sujetarse del pasamanos','Transitar por una escalera dañada'],answer:1,
      explanation:'La escalera tiene pasamanos, pero la persona mantiene las manos junto al cuerpo y no se sujeta al subir o bajar. El acto inseguro es cómo usa la escalera. Reporta la conducta; sujetarse del pasamanos ayuda a mantener el equilibrio.'}
  ],
  hazards: [
    {id:'leaning',x:500,title:'Tarima inclinada con carga inestable',choices:['Tarima inclinada con riesgo de caída','Tarima estable y correctamente colocada','Falta de iluminación'],answer:0,
      explanation:'La carga puede caer hacia el pasillo. Conserva distancia, reporta y solicita que personal autorizado delimite y asegure el área. No intentes enderezarla ni sujetar las cajas.'},
    {id:'bench',x:1430,title:'Banco en la ruta del montacargas',choices:['Cruce peatonal autorizado','Ruta del montacargas obstruida por un banco','Carga correctamente asegurada'],answer:1,
      explanation:'El banco obstruye la circulación y puede provocar una colisión o una maniobra peligrosa. Reporta la obstrucción para que se controle el tránsito antes de retirarla; no entres a la ruta de un vehículo en movimiento.'},
    {id:'spill',x:2100,title:'Derrame sin señalizar',choices:['Piso seco y despejado','Zona de almacenamiento delimitada','Líquido derramado sin señalización'],answer:2,
      explanation:'El líquido genera riesgo de resbalón. Evita el derrame y reporta para que se señalice y atienda con el procedimiento correspondiente. No pases sobre él ni lo limpies sin saber qué sustancia es.'},
    {id:'wrap',x:2730,title:'Flejes y plástico sueltos',choices:['Material suelto con riesgo de tropiezo','Material asegurado dentro de una tarima','Señal de salida'],answer:0,
      explanation:'Los flejes y el plástico sueltos pueden enredarse en los pies o causar tropiezos. Repórtalos y solicita su retiro seguro para recuperar una ruta despejada.'},
    {id:'extinguisher',x:3010,title:'Extintor bloqueado por cajas',choices:['Extintor con acceso libre','Acceso al extintor obstruido','Zona peatonal correctamente señalizada'],answer:1,
      explanation:'Las cajas impiden llegar al extintor con rapidez. Reporta y solicita liberar el acceso. El equipo de emergencia debe permanecer visible y accesible.'}
  ]
};

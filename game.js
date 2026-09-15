'use strict';
(() => {
  const $ = s => document.querySelector(s), canvas = $('#game'), ctx = canvas.getContext('2d');
  const H=540,FLOOR=446,WORLD=5000, keys={left:false,right:false,jump:false};
  let W=1200,viewHeight=H;
  const baseStorage=[{x:410,y:391,w:105,h:55},{x:565,y:350,w:110,h:96},{x:1360,y:392,w:105,h:54},{x:1510,y:345,w:110,h:101},{x:2200,y:390,w:110,h:56}];
  const baseCrossings=[{x:880,w:170,cleared:false,hold:0},{x:1830,w:170,cleared:false,hold:0}];
  const basePallets=[{x:1230,brand:'CORONA',color:'#d8b85d'},{x:2500,brand:'STELLA',color:'#aa4237'},{x:2840,brand:'MODELO',color:'#405e6b'}];
  const equipment=[['helmet','⛑️','Casco de seguridad',true],['vest','🦺','Chaleco de alta visibilidad',true],['boots','🥾','Botas de seguridad',true],['sandals','🩴','Sandalias',false],['cap','🧢','Gorra',false],['headphones','🎧','Audífonos de música',false]];
  const incidentScenarios=window.WAREHOUSE_SCENARIOS.equipment;
  const storage=[],crossings=[],pallets=[],hazards=[],workers=[],stairs=[],noJumpZones=[];
  let sector=1,totalReports=0,totalPallets=0,completedStairs=0,totalActs=0;
  const previousLocations=new Map();
  let previousStairRoute='';
  function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  function randomLocations(){
    // Ground bays have space for an object or a short patrol, away from crossings and stairs.
    const bays=[250,460,1500,2120,3090,4880];
    const ids=[...window.WAREHOUSE_SCENARIOS.hazards.map(h=>h.id),'noHelmet'];
    function assign(index,available,result){
      if(index===ids.length)return result;
      for(const bay of shuffle(available)){
        if(previousLocations.get(ids[index])===bay)continue;
        const next=assign(index+1,available.filter(x=>x!==bay),[...result,bay]);
        if(next)return next;
      }
      return null;
    }
    const chosen=assign(0,bays,[]),locations=new Map();
    ids.forEach((id,i)=>{previousLocations.set(id,chosen[i]);locations.set(id,chosen[i]+Math.floor(Math.random()*17)-8);});
    return locations;
  }
  function buildSector(){
    storage.splice(0,storage.length,...baseStorage.map(p=>({...p})));
    crossings.splice(0,crossings.length,...baseCrossings.map(c=>({...c,hold:0,cleared:false})));
    if(sector>=2)crossings.push({x:700,w:130,hold:0,cleared:false});
    if(sector>=4)crossings.push({x:2350,w:140,hold:0,cleared:false});
    pallets.splice(0,pallets.length,...basePallets.map(p=>({...p,registered:false})));
    const locations=randomLocations();
    hazards.splice(0,hazards.length,...window.WAREHOUSE_SCENARIOS.hazards.map(h=>({...h,x:locations.get(h.id),reported:false})));
    // Move decorative stock out of the observation bays so people and conditions remain visible.
    for(let i=storage.length-1;i>=0;i--)if([...locations.values()].some(x=>x+85>storage[i].x&&x-85<storage[i].x+storage[i].w))storage.splice(i,1);
    stairs.length=0;
    const count=sector===1?1:2,steps=Math.min(12,8+sector),tread=Math.max(19,27-sector);
    for(let i=0;i<count;i++)stairs.push({x:3230+i*750,steps,tread,rise:15,deck:200,completed:false,visitedTop:false});
    const routes=stairs.flatMap((s,i)=>['up','down'].map(side=>({s,key:i+':'+side,side})));
    const route=shuffle(routes.filter(r=>r.key!==previousStairRoute))[0];previousStairRoute=route.key;
    const run=route.s.steps*route.s.tread;
    workers.splice(0,workers.length,...window.WAREHOUSE_SCENARIOS.acts.map(a=>{
      const min=a.id==='noHelmet'?locations.get(a.id)-25:route.side==='up'?route.s.x+25:route.s.x+run+route.s.deck+15;
      const max=a.id==='noHelmet'?locations.get(a.id)+25:route.side==='up'?route.s.x+run-15:route.s.x+stairWidth(route.s)-25;
      const x=min+Math.random()*(max-min);
      return {...a,type:'act',reported:false,min,max,x,feet:a.id==='noHelmet'?FLOOR:floorAt(x),direction:Math.random()<.5?-1:1,phase:Math.random()*Math.PI*2};
    }));
    noJumpZones.splice(0,noJumpZones.length,...storage.map(p=>({x:p.x-8,w:p.w+16})),...pallets.map(p=>({x:p.x-10,w:124})),...hazards.map(h=>({x:h.x-48,w:96})));
  }
  function stairWidth(s){return s.steps*s.tread*2+s.deck;}
  function stairAt(x){return stairs.find(s=>x>=s.x&&x<=s.x+stairWidth(s));}
  function floorAt(x){const s=stairAt(x);if(!s)return FLOOR;const offset=x-s.x,run=s.steps*s.tread;const n=offset<run?Math.floor(offset/s.tread)+1:offset<run+s.deck?s.steps:Math.max(0,Math.ceil((stairWidth(s)-offset)/s.tread));return FLOOR-n*s.rise;}
  function advanceSector(){sector++;found=false;buildSector();player.x=30;player.y=FLOOR-player.h;player.vx=player.vy=0;player.ground=true;camera=0;hud();}

  let worn=new Set(), incident=null, triggered=new Set();

  let state='equipment',player,lives=3,found=false,epp=false,camera=0,time=0,last=0,toastTime=0,deathTime=0,crash=null;
  function clearKeys(){keys.left=keys.right=keys.jump=false;}
  function toast(message,seconds=4){$('#toast').textContent=message;$('#toast').classList.add('visible');toastTime=seconds;}
  function hud(){
    $('#lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(3-lives);$('#lives').setAttribute('aria-label',lives+' vidas');$('#count').textContent=totalPallets;$('#sector').textContent=sector;$('#stair-count').textContent=completedStairs;
    epp=worn.has('helmet')&&worn.has('vest')&&worn.has('boots')&&!worn.has('headphones')&&!worn.has('cap')&&!worn.has('sandals');
    const reports=hazards.filter(h=>h.reported).length;
    $('#hazard-count').textContent=totalReports;$('#act-count').textContent=totalActs;
    $('#hazard-list').innerHTML=hazards.map((h,i)=>'<li class="'+(h.reported?'reported':'')+'">'+(h.reported?'✓ '+h.title:'○ Condición '+(i+1)+' por encontrar')+'</li>').join('');
    $('#act-list').innerHTML=workers.map((a,i)=>'<li class="'+(a.reported?'reported':'')+'">'+(a.reported?'✓ '+a.title:'○ Acto '+(i+1)+' por encontrar')+'</li>').join('');
    const done=[epp,crossings.every(c=>c.cleared),found,reports===hazards.length,workers.every(a=>a.reported)];['epp','cross','stella','hazards','acts'].forEach((id,i)=>{const el=$('#obj-'+id);el.classList.toggle('done',done[i]);el.querySelector('span').textContent=done[i]?'✓':'↗';});$('#progress').textContent=done.filter(Boolean).length+' DE 5 COMPLETADOS';
  }
  function reset(){sector=1;totalReports=totalPallets=completedStairs=totalActs=0;buildSector();worn=new Set();triggered=new Set();incident=null;hazards.forEach(h=>h.reported=false);lives=3;found=epp=false;camera=0;crash=null;deathTime=0;player={x:110,y:FLOOR-66,w:32,h:66,vx:0,vy:0,ground:true,face:1};crossings.forEach(c=>{c.cleared=false;c.hold=0;});clearKeys();$('#toast').classList.remove('visible');$('#zone').textContent='● ACCESO AL ALMACÉN';hud();showEquipment();}
  function showEquipment(){
    state='equipment';$('#pause').disabled=true;$('#overlay').classList.remove('hidden');
    $('#modal').innerHTML='<p class="eyebrow">ANTES DE ENTRAR / 01</p><h2>La seguridad empieza contigo.</h2><p>Elige cómo entrar al almacén. <b>Jugarás con lo que selecciones</b>, aunque sea incorrecto. Las decisiones inseguras activan incidentes, restan una vida y explican qué debes corregir.</p><div class="equipment"></div><p class="feedback" role="status"></p><button class="primary" id="enter">Entrar con mi elección →</button><p class="tiny">Usa las flechas y espacio. Camina por la ruta peatonal. Puedes saltar en los espacios libres, pero no sobre las tarimas.</p>';
    const selected=new Set();equipment.forEach(([id,icon,name])=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed','false');b.innerHTML='<span>'+icon+'</span>'+name;b.dataset.equipment=id;b.onclick=()=>{if(selected.has(id))selected.delete(id);else{const opposite={helmet:'cap',cap:'helmet',boots:'sandals',sandals:'boots'}[id];if(opposite)selected.delete(opposite);selected.add(id);}document.querySelectorAll('[data-equipment]').forEach(button=>button.setAttribute('aria-pressed',String(selected.has(button.dataset.equipment))));};$('.equipment').append(b);});
    $('#enter').onclick=()=>{worn=new Set(selected);state='playing';clearKeys();$('#overlay').classList.add('hidden');$('#pause').disabled=false;hud();if(window.matchMedia?.('(max-width:800px), (pointer:coarse)').matches)document.querySelector('.game-shell').scrollIntoView({block:'start',behavior:'instant'});};
  }
  function needsIncident(s){return s.id==='head'?!worn.has('helmet'):s.id==='audio'?worn.has('headphones'):s.id==='feet'?!worn.has('boots'):!worn.has('vest');}
  function startIncident(s){incident=s;triggered.add(s.id);lives--;state='incident';deathTime=1.8;player.y=FLOOR-player.h;player.vx=player.vy=0;player.ground=true;clearKeys();$('#pause').disabled=true;hud();toast('Incidente por tu elección de equipo · −1 vida',2);}
  function showLesson(){
    state='lesson';$('#overlay').classList.remove('hidden');
    const title=incident.missingTitle&&!worn.has(incident.remove)?incident.missingTitle:incident.title;
    $('#modal').innerHTML='<p class="eyebrow">APRENDE DE TU DECISIÓN · −1 VIDA</p><h2>'+title+'</h2><p>'+incident.explanation+'</p><p class="tiny">Escena ficticia: el EPP reduce riesgos, pero no sustituye las rutas seguras ni el control de las cargas y los vehículos.</p><button class="primary" id="correct">'+(lives?incident.fix+' y continuar →':'Ver resultado del turno →')+'</button>';
    $('#correct').onclick=()=>{if(!lives){finish(false);return;}if(incident.remove)worn.delete(incident.remove);if(incident.add)worn.add(incident.add);incident=null;state='playing';clearKeys();$('#overlay').classList.add('hidden');$('#pause').disabled=false;hud();toast('Equipo corregido.',4);};
  }
  function inspectHazard(h){
    const isAct=h.type==='act';
    state='inspection';clearKeys();$('#pause').disabled=true;$('#overlay').classList.remove('hidden');
    $('#modal').innerHTML='<p class="eyebrow">OBSERVA · IDENTIFICA · REPORTA</p><h2>¿Qué '+(isAct?'acto':'condición')+' encontraste?</h2><p>Identifica lo que viste cerca de ti. Reporta desde una distancia segura.</p><div class="hazard-options"></div><p class="feedback" role="status"></p><button class="secondary" id="back">Volver a observar</button>';
    h.choices.forEach((choice,i)=>{const b=document.createElement('button');b.textContent=choice;b.onclick=()=>{if(i!==h.answer){$('.feedback').textContent='Esa opción no corresponde a lo que estás observando. Revisa la escena y la acción de las personas.';return;}if(h.reported)return;h.reported=true;if(isAct)totalActs++;else totalReports++;hud();$('#modal').innerHTML='<p class="eyebrow">✓ '+(isAct?'ACTO REPORTADO':'CONDICIÓN REPORTADA')+'</p><h2>'+h.title+'</h2><p>'+h.explanation+'</p><p class="tiny">'+(isAct?'El reporte registra la conducta observada; no significa que ya se haya corregido.':'Reportar no elimina el peligro. Conserva distancia; su corrección corresponde al personal autorizado.')+'</p><button class="primary" id="continue">Continuar recorrido →</button>';$('#continue').onclick=closeInspection;};$('.hazard-options').append(b);});
    $('#back').onclick=closeInspection;
  }
  function closeInspection(){state='playing';clearKeys();$('#overlay').classList.add('hidden');$('#pause').disabled=false;}

  function pause(){if(state==='playing'){state='paused';clearKeys();$('#overlay').classList.remove('hidden');$('#modal').innerHTML='<p class="eyebrow">TOMA UN RESPIRO</p><h2>Turno en pausa.</h2><p>Sector '+sector+' · Recorrido continuo. La partida se conserva mientras está en pausa.</p><button class="primary" id="resume">Continuar misión →</button>';$('#resume').onclick=pause;}else if(state==='paused'){state='playing';$('#overlay').classList.add('hidden');}}
  function finish(){state='lost';clearKeys();$('#pause').disabled=true;$('#overlay').classList.remove('hidden');$('#modal').innerHTML='<p class="eyebrow">FIN DEL TURNO</p><h2>La próxima decisión cuenta.</h2><p>Te quedaste sin vidas. Cada recorrido es una nueva oportunidad para reconocer los riesgos.</p><div class="result"><span>Sector: '+sector+'</span><span>Stella: '+totalPallets+'</span><span>Reportes: '+totalReports+'</span><span>Actos: '+totalActs+'</span><span>Escaleras: '+completedStairs+'</span></div><button class="primary" id="again">Volver a jugar ↻</button>';$('#again').onclick=reset;}
  function interact(){if(state!=='playing')return;const h=[...hazards,...workers].filter(h=>!h.reported&&Math.abs(player.x+16-h.x)<90&&player.ground&&Math.abs(player.y+player.h-(h.feet??FLOOR))<85).sort((a,b)=>Math.abs(player.x+16-a.x)-Math.abs(player.x+16-b.x))[0];if(h){inspectHazard(h);return;}const p=pallets.find(p=>Math.abs(player.x+16-(p.x+53))<115&&player.ground&&player.y>300);if(p){if(p.brand==='STELLA'){if(found){toast('Tarima ya registrada.');return;}found=true;p.registered=true;totalPallets++;hud();toast('¡Tarima de Stella registrada!',5);}else toast('Esta tarima es de '+p.brand+'.');}else toast('No se registró ninguna interacción.');}
  $('#pause').onclick=pause;$('#restart').onclick=reset;
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code)&&!['BUTTON','INPUT'].includes(e.target.tagName))e.preventDefault();if(e.repeat&&['KeyE','KeyP','Escape','Space','ArrowUp','KeyW'].includes(e.code))return;if(['KeyP','Escape'].includes(e.code)){pause();return;}if(state!=='playing')return;if(['ArrowLeft','KeyA'].includes(e.code))keys.left=true;if(['ArrowRight','KeyD'].includes(e.code))keys.right=true;if(['Space','ArrowUp','KeyW'].includes(e.code))keys.jump=true;if(e.code==='KeyE')interact();});
  window.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA'].includes(e.code))keys.left=false;if(['ArrowRight','KeyD'].includes(e.code))keys.right=false;if(['Space','ArrowUp','KeyW'].includes(e.code))keys.jump=false;});
  window.addEventListener('blur',()=>{clearKeys();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  document.querySelectorAll('[data-key]').forEach(b=>{const key=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(state!=='playing')return;if(key==='interact')interact();else keys[key]=true;});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>{if(key!=='interact')keys[key]=false;}));});
  function hit(c){lives--;state='dying';deathTime=1.6;crash=c;clearKeys();hud();toast('¡Alto! Cruzaste sin detenerte. −1 vida. Espera el verde antes de pasar.',5);}
  function update(dt){
    if(['paused','lesson','inspection'].includes(state)||document.hidden)return;time+=dt;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').classList.remove('visible');}
    if(state==='incident'){deathTime-=dt;if(deathTime<=0)showLesson();return;}
    if(state==='dying'){deathTime-=dt;if(deathTime<=0){if(lives===0){finish(false);return;}player.x=crash.x-140;player.y=FLOOR-player.h;player.vx=player.vy=0;player.ground=true;crash.hold=0;crash=null;state='playing';}return;}
    if(state!=='playing')return;
    updateWorkers(dt);
    player.vx=(Number(keys.right)-Number(keys.left))*235;if(player.vx)player.face=Math.sign(player.vx);
    const onStairs=stairAt(player.x+player.w/2);
    const besideStorage=!!onStairs||noJumpZones.some(p=>player.x+player.w>p.x&&player.x<p.x+p.w);
    if(keys.jump&&player.ground){
      if(!besideStorage){player.vy=-530;player.ground=false;}
    }
    keys.jump=false;
    const oldX=player.x,wasGround=player.ground;
    player.x=Math.max(20,Math.min(WORLD-player.w-20,player.x+player.vx*dt));
    // Storage is behind the pedestrian lane. Walking past it is safe;
    // jumping into its horizontal span is blocked from either direction.
    if(!player.ground){
      for(const p of noJumpZones){
        if(player.x+player.w>p.x&&player.x<p.x+p.w){
          player.x=oldX+player.w<=p.x?p.x-player.w:oldX>=p.x+p.w?p.x+p.w:oldX;
          player.vx=0;
        }
      }
    }
    const nextStair=stairAt(player.x+player.w/2);
    if(!wasGround&&nextStair){player.x=oldX;player.vx=0;}
    const surface=floorAt(player.x+player.w/2);
    if(wasGround&&(onStairs||nextStair)){
      player.y=surface-player.h;player.vy=0;player.ground=true;
      const active=onStairs||nextStair;
      if(surface===FLOOR-active.steps*active.rise)active.visitedTop=true;
      if(active.visitedTop&&!active.completed&&player.x+player.w/2>=active.x+stairWidth(active)){
        active.completed=true;completedStairs++;hud();
      }
    }else{
      player.vy+=1450*dt;player.y+=player.vy*dt;player.ground=false;
      if(player.y+player.h>=surface){player.y=surface-player.h;player.vy=0;player.ground=true;}
    }
    for(const c of crossings){if(c.cleared)continue;const inStop=player.x+player.w>c.x-stopWidth()&&player.x+player.w<=c.x&&player.ground&&player.y+player.h>=FLOOR-1;
      if(inStop&&player.vx===0){c.hold+=dt;if(c.hold>=stopTime()){c.cleared=true;hud();}}else c.hold=0;
      if(!c.cleared&&player.x+player.w>c.x&&player.x<c.x+c.w){hit(c);break;}
    }
    if(state==='playing'&&sector===1){const next=incidentScenarios.find(s=>!triggered.has(s.id)&&player.x>=s.x&&needsIncident(s));if(next)startIncident(next);}
    if(state==='playing'&&player.x>=WORLD-player.w-22)advanceSector();
    camera=Math.max(0,Math.min(WORLD-W,player.x-W*.3));$('#zone').textContent='● SECTOR '+String(sector).padStart(2,'0')+' · NIVEL '+sector;
  }
  function stopTime(){return Math.min(2.4,1.2+(sector-1)*.2);}
  function stopWidth(){return Math.max(65,115-(sector-1)*8);}
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  function text(s,x,y,size=12,color='#25453b',align='left'){ctx.fillStyle=color;ctx.font='bold '+size+'px Arial';ctx.textAlign=align;ctx.fillText(s,x,y);}
  function line(x,y,x2,y2,c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
  function box(x,y,w=46,h=36,brand='CERVEZA',color='#bfac79'){rect(x,y,w,h,color);rect(x+3,y+3,w-6,h-6,'#ffffff0d');line(x+w/2,y,x+w/2,y+8,'#84754c',2);text(brand,x+w/2,y+h*.62,brand==='STELLA'?7:6,brand==='STELLA'?'#fff6df':'#504c35','center');if(brand==='STELLA')line(x+8,y+h*.74,x+w-8,y+h*.74,'#e5d4a0');}
  function pallet(p){ctx.save();ctx.translate(0,-78);for(let row=0;row<2;row++)for(let col=0;col<2;col++)box(p.x+col*52,FLOOR-88+row*37,50,36,p.brand,p.color);rect(p.x-5,FLOOR-12,114,7,'#96764e');for(let i=0;i<3;i++)rect(p.x+i*47,FLOOR-5,13,5,'#665237');if(p.brand==='STELLA'&&found)text('✓ REGISTRADA',p.x+51,FLOOR-103,11,'#ffe079','center');ctx.restore();}
  function forklift(x,y,dir=1){ctx.save();ctx.translate(x,y);ctx.scale(dir,1);rect(-53,-51,70,37,'#ffc600');rect(-56,-26,78,13,'#bc8730');rect(-12,-91,6,43,'#263d36');rect(31,-93,7,82,'#263d36');rect(-16,-96,57,6,'#263d36');rect(-6,-87,33,31,'#a4bbb18a');rect(42,-80,7,73,'#45534c');rect(44,-9,43,5,'#45534c');rect(8,-51,17,6,'#374a40');rect(12,-69,6,20,'#374a40');for(const xx of [-32,23]){ctx.fillStyle='#283c35';ctx.beginPath();ctx.arc(xx,-10,13,0,7);ctx.fill();ctx.fillStyle='#899483';ctx.beginPath();ctx.arc(xx,-10,6,0,7);ctx.fill();}rect(-5,-102,10,6,Math.sin(time*7)>0?'#ffce58':'#bc8730');ctx.restore();}
  function character(){
    ctx.save();ctx.translate(player.x+16,player.y+66);
    const impact=state==='incident'&&deathTime<.8;
    const crushed=state==='dying'||(impact&&incident.kind!=='foot');
    if(crushed){ctx.scale(1.8,.22);ctx.rotate(-.12);}
    if(impact&&incident.kind==='foot')ctx.rotate(Math.sin(time*22)*.16);
    const walk=player.ground&&player.vx&&state==='playing'?Math.sin(time*15)*7:0;
    ctx.scale(player.face,1);
    rect(-13,-24,10,21+walk,'#28475a');rect(3,-24,10,21-walk,'#28475a');
    const boots=worn.has('boots');
    rect(-15,-6+walk,14,boots?7:4,boots?'#171717':'#ca986b');rect(3,-6-walk,15,boots?7:4,boots?'#171717':'#ca986b');
    if(worn.has('sandals')){rect(-15,-3+walk,14,3,'#b84d35');rect(3,-3-walk,15,3,'#b84d35');}
    rect(-15,-46,30,24,worn.has('vest')?'#ffc600':'#454a51');
    if(worn.has('vest')){rect(-9,-46,4,24,'#fff3b0');rect(6,-46,4,24,'#fff3b0');rect(-15,-30,30,4,'#fff3b0');}
    rect(-21,-44,6,22,'#323232');rect(-21,-24,6,7,'#b7845c');
    if(stairAt(player.x+16)&&player.ground){
      line(15,-43,25,-53,'#323232',6);rect(22,-56,7,6,'#b7845c');
    }else{
      rect(15,-44,6,22,'#323232');rect(15,-24,6,7,'#b7845c');
    }
    rect(-9,-62,21,17,'#ca986b');
    rect(-10,-64,22,5,'#493527');
    if(worn.has('helmet')){rect(-12,-65,26,9,'#ffc600');rect(-7,-71,17,9,'#ffc600');rect(-15,-58,33,4,'#ffe079');}
    else if(worn.has('cap')){rect(-11,-65,23,9,'#3386c7');rect(9,-59,13,4,'#226298');}
    if(worn.has('headphones')){line(-12,-52,-12,-69,'#c28cff',4);line(-12,-69,14,-69,'#c28cff',4);rect(-15,-57,7,13,'#8d4fbb');rect(11,-57,7,13,'#8d4fbb');}
    rect(7,-53,3,3,'#283c35');ctx.restore();
    if(crushed||impact){text('¡PLOF!',player.x+10,player.y-20,24,'#ffbe65','center');for(let i=0;i<5;i++)text('✦',player.x+Math.cos(time*4+i*1.25)*42,player.y+15+Math.sin(time*4+i*1.25)*16,14,'#f3cb53','center');}
  }
  function drawIncident(){
    if(state!=='incident'||!incident)return;
    const progress=Math.min(1,(1.8-deathTime)/1.1);
    if(incident.kind==='forklift'){
      forklift(player.x-190+progress*230,FLOOR,1);
      text(incident.id==='audio'?'♪  ♪   ¡BIP, BIP!':'¡NO TE VI!',player.x+30,player.y-47,15,'#ffe079','center');
    }else{
      const target=incident.kind==='foot'?FLOOR-27:player.y-22;
      box(player.x+(incident.kind==='foot'?16:-5),target-190+progress*190,42,30,'CERVEZA','#d4a85f');
      for(let i=0;i<3;i++)line(player.x+i*14,target-204+progress*190,player.x+i*14,target-194+progress*190,'#ffe079',2);
    }
  }
  function drawHazard(h){
    ctx.save();ctx.translate(h.x,0);
    if(h.id==='leaning'){
      ctx.save();ctx.translate(0,365);ctx.rotate(-.22+Math.sin(time*2)*.018);
      rect(-48,-8,96,8,'#a17d49');for(let r=0;r<3;r++)for(let c=0;c<2;c++)box(-43+c*43,-43-r*33,41,31,'CERVEZA','#b99b61');ctx.restore();
    }else if(h.id==='bench'){
      rect(-70,358,140,62,'#232323');line(-68,358,68,358,'#ffc600',3);text('RUTA MONTACARGAS →',0,411,9,'#ffc600','center');
      rect(-33,374,66,10,'#bd824c');rect(-28,384,7,18,'#251c18');rect(21,384,7,18,'#251c18');rect(-30,351,60,9,'#bd824c');line(-25,351,-25,375,'#61452d',5);line(25,351,25,375,'#61452d',5);
    }else if(h.id==='spill'){
      ctx.fillStyle='#62baca';ctx.beginPath();ctx.ellipse(0,420,49,12,-.08,0,Math.PI*2);ctx.fill();line(-28,417,8,417,'#c1edf0',2);ctx.save();ctx.translate(28,390);ctx.rotate(1.1);rect(-9,-17,18,30,'#a96537');rect(-8,-19,16,4,'#ddd4a0');ctx.restore();
    }else if(h.id==='wrap'){
      line(-42,406,-19,416,'#dddde0',5);line(-19,416,13,403,'#dddde0',5);line(13,403,39,418,'#dddde0',5);ctx.strokeStyle='#76a5df';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,416,26,10,.4,0,Math.PI*2);ctx.stroke();
    }else{
      rect(-23,275,46,42,'#ad3535');text('EXTINTOR',0,301,8,'#fff','center');rect(-10,330,20,42,'#d2443c');rect(-5,324,13,6,'#ddd');line(10,329,17,352,'#171717',4);
      for(let i=0;i<2;i++)box(-43+i*43,374,41,36,'CERVEZA','#bd9c62');box(-21,341,42,32,'CERVEZA','#bd9c62');
    }
    if(h.reported){rect(-53,237,106,21,'#1c2920');text('✓ REPORTADO',0,251,10,'#b7ea91','center');}
    ctx.restore();
  }
  function updateWorkers(dt){
    for(const worker of workers){
      const {min,max}=worker;
      worker.x+=worker.direction*48*dt;
      if(worker.x>=max){worker.x=max;worker.direction=-1;}else if(worker.x<=min){worker.x=min;worker.direction=1;}
      worker.feet=worker.id==='noHelmet'?FLOOR:floorAt(worker.x);
      worker.phase+=dt*8;
    }
  }
  function drawWorker(worker){
    ctx.save();ctx.translate(worker.x,worker.feet);ctx.scale(worker.direction,1);
    const stride=Math.sin(worker.phase)*5;
    rect(-12,-26,9,23+stride,'#435166');rect(3,-26,9,23-stride,'#435166');
    rect(-14,-5+stride,14,6,'#171717');rect(3,-5-stride,14,6,'#171717');
    rect(-15,-48,30,25,'#f38b30');rect(-10,-46,4,23,'#fff1c1');rect(7,-46,4,23,'#fff1c1');rect(-15,-31,30,4,'#fff1c1');
    // Both hands remain at the hips, visibly below and away from the handrail.
    rect(-22,-45,7,20,'#495361');rect(15,-45,7,20,'#495361');rect(-22,-25,7,6,'#d6a074');rect(15,-25,7,6,'#d6a074');
    rect(-9,-64,21,17,'#d6a074');rect(-11,-67,23,7,'#38281e');rect(-11,-63,5,10,'#38281e');
    if(worker.id==='noHandrail'){rect(-12,-68,27,9,'#ebebe6');rect(-7,-74,17,9,'#ebebe6');rect(-15,-60,33,4,'#fffdf4');}
    rect(7,-56,3,3,'#222');ctx.restore();
    if(worker.reported){rect(worker.x-54,worker.feet-106,108,20,'#1c2920');text('✓ REPORTADO',worker.x,worker.feet-92,10,'#b7ea91','center');}
  }
  function drawStairs(s){
    const run=s.steps*s.tread,top=FLOOR-s.steps*s.rise,end=s.x+stairWidth(s);
    // Fixed metal steps and handrails: the walking surface follows every step.
    for(let i=0;i<s.steps;i++){
      const y=FLOOR-(i+1)*s.rise;
      for(const x of [s.x+i*s.tread,end-(i+1)*s.tread]){
        rect(x,y,s.tread,FLOOR-y,'#353a3d');rect(x,y,s.tread,4,'#ffc600');line(x,y+6,x,FLOOR,'#737879',1);
      }
    }
    rect(s.x+run,top,s.deck,FLOOR-top,'#292e31');rect(s.x+run,top,s.deck,6,'#ffc600');
    for(let x=s.x+run+22;x<s.x+run+s.deck;x+=50)line(x,top+15,x+24,FLOOR-12,'#454d50',3);
    const rail='#e7bb36';
    line(s.x,FLOOR-53,s.x+run,top-53,rail,5);line(s.x+run,top-53,s.x+run+s.deck,top-53,rail,5);line(s.x+run+s.deck,top-53,end,FLOOR-53,rail,5);
    for(let i=0;i<=s.steps;i+=2){line(s.x+i*s.tread,FLOOR-i*s.rise-53,s.x+i*s.tread,FLOOR-i*s.rise,rail,3);line(end-i*s.tread,FLOOR-i*s.rise-53,end-i*s.tread,FLOOR-i*s.rise,rail,3);}
  }
  function render(){
    ctx.clearRect(0,0,W,viewHeight);ctx.save();ctx.translate(0,viewHeight-H);rect(0,0,W,H,'#525252');const bg=camera*.35;
    for(let i=-1;i<9;i++){const x=i*180-bg%180;rect(x,0,4,335,'#3a3a3a');rect(x+25,25,120,54,'#93938c');rect(x+28,29,114,45,'#b7b7a5');line(x+85,28,x+85,74,'#68685f',3);line(x+26,52,x+144,52,'#68685f',2);rect(x+42,96,89,5,'#242424');rect(x+57,101,59,4,'#f3efcf');}
    rect(0,303,W,143,'#66665e');rect(0,446,W,94,'#303030');ctx.save();ctx.translate(-camera,0);
    for(let r=0;r<Math.ceil(WORLD/292);r++){const x=80+r*292;rect(x,145,240,211,'#41413d');for(let level=0;level<3;level++){const y=177+level*61;for(let col=0;col<4;col++)box(x+13+col*55,y,48,40,level===1?'CERVEZA':'PREMIUM',r%2?'#b4a779':'#bab28a');rect(x,y+42,240,7,'#8b6949');}rect(x,142,9,218,'#242424');rect(x+231,142,9,218,'#242424');rect(x,140,240,10,'#242424');rect(x+92,143,56,18,'#ffc600');text('A – '+String(r+1).padStart(2,'0'),x+120,156,9,'#171717','center');}
    rect(0,361,WORLD,4,'#222222');rect(0,451,WORLD,5,'#ffc600');rect(0,508,WORLD,5,'#ffc600');for(let x=80;x<WORLD;x+=250){text('→',x,493,39,'#ffc600');line(x+90,480,x+145,480,'#72726a',2);}
    for(const p of storage){ctx.save();ctx.translate(0,-78);rect(p.x,p.y,p.w,p.h,'#a59363');for(let y=p.y;y<FLOOR-5;y+=29)for(let x=p.x;x<p.x+p.w-5;x+=36)box(x+2,y+2,32,25,'','#b8a577');rect(p.x-3,p.y,p.w+6,5,'#d2bf89');rect(p.x-3,FLOOR-7,p.w+6,7,'#756343');ctx.restore();}
    for(const c of crossings){rect(c.x-stopWidth(),FLOOR,stopWidth()-5,62,'#ffc600');text('ALTO',c.x-stopWidth()/2,482,15,'#181818','center');rect(c.x,353,c.w,166,'#242424');for(let y=367;y<511;y+=24)rect(c.x+8,y,c.w-16,12,'#eeeee5');line(c.x-3,351,c.x-3,519,'#ffc600',4);line(c.x+c.w+3,351,c.x+c.w+3,519,'#ffc600',4);rect(c.x-25,278,5,110,'#292929');rect(c.x-47,250,50,40,'#171717');text(c.cleared?'PASA':'ALTO',c.x-22,275,12,c.cleared?'#d7f365':'#ffc600','center');
      if(c.hold>0&&!c.cleared){rect(c.x-113,426,103,7,'#292929');rect(c.x-113,426,103*Math.min(1,c.hold/stopTime()),7,'#ffc600');}
      if(c.cleared){forklift(c.x+c.w-5,349,-1);text('DETENIDO',c.x+c.w-5,237,9,'#b7ea91','center');}else if(crash!==c)forklift(c.x+c.w/2+Math.sin(time*(1.5+Math.min(sector-1,10)*.3))*35,352,1);
    }
    pallets.forEach(pallet);hazards.forEach(drawHazard);stairs.forEach(drawStairs);workers.forEach(drawWorker);character();drawIncident();if(state==='dying'&&crash)forklift(player.x-100+(1.6-deathTime)*165,FLOOR,1);
    ctx.restore();
    ctx.restore();
    if(W>=440){rect(20,19,187,35,'#181818ec');text('RUTA PEATONAL',30,34,10,'#ffc600');text('ALMACÉN 07 / DISTRIBUCIÓN',30,47,8,'#e6e6dc');}rect(W-205,22,177,33,'#181818ec');text('DISTANCIA '+Math.floor(((sector-1)*WORLD+player.x)/50)+' m',W-194,35,8,'#ffc600');rect(W-194,43,154,3,'#5e5e56');rect(W-194,43,154*Math.min(1,player.x/(WORLD-70)),3,'#ffc600');
  }
  function resize(){
    const bounds=canvas.getBoundingClientRect();if(!bounds.height||!bounds.width)return;
    viewHeight=bounds.height<300&&bounds.width>bounds.height?360:H;
    W=viewHeight*bounds.width/bounds.height;
    const density=Math.min(window.devicePixelRatio||1,2);
    const width=Math.round(bounds.width*density),height=Math.round(bounds.height*density);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.setTransform(width/W,0,0,height/viewHeight,0,0);
    camera=Math.max(0,Math.min(WORLD-W,player.x-W*.3));
  }
  window.addEventListener('resize',()=>{clearKeys();resize();});
  window.visualViewport?.addEventListener('resize',resize);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(document.querySelector('.stage'));
  function frame(now){const dt=Math.min((now-last)/1000||0,.035);last=now;update(dt);render();requestAnimationFrame(frame);}
  reset();requestAnimationFrame(frame);
  resize();
})();

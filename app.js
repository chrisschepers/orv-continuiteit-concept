'use strict';
// Names are approved placeholders. Every case fact below is fabricated.
const referenceDate = '2026-09-28';
const cases = [
  {name:'Thomas Hoogenboom', last:'2026-09-21', submitted:null, state:'missing'},
  {name:'Jeffrey Jore', last:'2026-09-22', submitted:'2026-09-22', state:'mismatch'},
  {name:'Stephanie Karssing', last:'2026-09-15', submitted:null, state:'exception', reason:'In afwachting van arbeidsdeskundig onderzoek', review:'2026-09-25'},
  {name:'Maureen Leenstra', last:'2026-09-23', submitted:'2026-09-23', state:'waiting'},
  {name:'Bathséba Marijnissen', last:'2026-09-18', submitted:'2026-09-18', state:'scheduled', next:'2026-10-16'},
  {name:'André Schaap', last:'2026-09-24', submitted:'2026-09-24', state:'waiting'},
  {name:'Chris Schepers', last:'2026-09-17', submitted:'2026-09-17', state:'scheduled', next:'2026-10-15'},
  {name:'Veerle Simhoffer', last:'2026-09-25', submitted:null, state:'exception', reason:'Beoogd herstel; vervolgspreekuur niet nodig', review:'2026-10-09'},
  {name:'Thirza Steinhart', last:'2026-09-16', submitted:'2026-09-16', state:'scheduled', next:'2026-10-14'},
  {name:'Imme van de Kemp', last:'2026-09-21', submitted:null, state:'exception', reason:'In afwachting van arbeidsdeskundig onderzoek', review:'2026-10-05'},
  {name:'Samira Ben Amar', last:'2026-09-24', submitted:'2026-09-24', state:'waiting'},
  {name:'Deborah Blackman', last:'2026-09-23', submitted:'2026-09-23', state:'scheduled', next:'2026-10-21'}
].map((item,index)=>({...item,id:`DEMO-${String(index+1).padStart(3,'0')}`,firstSickDay:['2026-06-08','2026-07-13','2026-01-19','2026-08-03','2026-05-11','2026-07-27','2026-04-20','2026-08-24','2026-03-09','2025-12-01','2026-08-10','2026-06-22'][index]}));
let view='all', ascending=false, selected=null, lastFocus=null, toastTimer;
const $=id=>document.getElementById(id);
const date=value=>new Intl.DateTimeFormat('nl-NL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value+'T12:00:00'));
// Calendar days, including the first sick day; UTC avoids daylight-saving differences.
function duration(firstDay){
 const days=Math.floor((Date.parse(referenceDate+'T00:00:00Z')-Date.parse(firstDay+'T00:00:00Z'))/86400000)+1;
 return `${Math.floor(days/7)} wk ${days%7} dgn`;
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attention=item=>['missing','mismatch'].includes(item.state)||(item.state==='exception'&&item.review<=referenceDate);
const matches=(item,tab)=>tab==='all'||(tab==='attention'&&attention(item))||(tab==='exception'&&item.state==='exception')||(tab==='progress'&&['waiting','scheduled'].includes(item.state));
function signal(item){
 if(item.state==='missing')return ['ORV ontbreekt','warn'];
 if(item.state==='mismatch')return ['Verzoek niet zichtbaar','danger'];
 if(item.state==='exception')return item.review<=referenceDate?['Herbeoordeling nodig','warn']:['Uitzondering vastgelegd','neutral'];
 return item.state==='waiting'?['Bij planning','info']:['Vervolg geborgd',''];
}
function followup(item){
 if(item.state==='scheduled')return `Spreekuur ${date(item.next)}`;
 if(item.state==='waiting')return 'Wacht op inplannen';
 if(item.state==='mismatch')return 'Niet in ORV-overzicht';
 if(item.state==='exception')return item.reason.includes('herstel')?'Beoogd herstel':'Wacht op AD-onderzoek';
 return 'Nog geen vervolg';
}
function render(){
 for(const type of ['all','attention','progress','exception'])$('count-'+type).textContent=cases.filter(item=>matches(item,type)).length;
 document.querySelectorAll('[role=tab]').forEach(tab=>{const active=tab.dataset.view===view;tab.setAttribute('aria-selected',active);tab.tabIndex=active?0:-1;});
 const query=$('search').value.toLocaleLowerCase('nl').trim();
 const filtered=cases.filter(item=>matches(item,view)&&($('status').value==='all'||item.state===$('status').value)&&`${item.name} ${item.id}`.toLocaleLowerCase('nl').includes(query));
 filtered.sort((a,b)=>ascending?a.last.localeCompare(b.last):b.last.localeCompare(a.last));
 $('rows').innerHTML=filtered.map(item=>`<tr><td><span class="person">${escape(item.name)}</span><span class="secondary">${item.id}</span></td><td class="date">${date(item.last)}</td><td>${item.submitted?`<span class="orv-yes">Ja</span><span class="secondary date">${date(item.submitted)}</span>`:'<span class="orv-no">Nee</span>'}</td><td><button class="row-action" data-id="${item.id}" aria-label="Open demodossier van ${escape(item.name)}">&#8250;</button></td></tr>`).join('');
 document.querySelectorAll('#rows tr').forEach((row,index)=>{
  const item=filtered[index];
  const firstDayCell=row.insertCell(1);firstDayCell.className='date';firstDayCell.textContent=date(item.firstSickDay);
  const durationCell=row.insertCell(2);durationCell.className='date';durationCell.textContent=duration(item.firstSickDay);durationCell.title='Tot en met '+date(referenceDate)+', inclusief de eerste ziektedag';
 });
 $('empty').hidden=filtered.length>0;
 $('result-count').textContent=`${filtered.length} dossiers`;
 $('visible-count').textContent=`${filtered.length} van ${cases.length} dossiers`;
 $('sort-date').parentElement.setAttribute('aria-sort',ascending?'ascending':'descending');
}
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function openDetail(id){
 selected=cases.find(item=>item.id===id);const item=selected;
 $('detail-title').textContent=item.name;$('detail-id').textContent=item.id+' · Fictief dossier';
 let notice='';
 if(item.state==='mismatch')notice='<div class="notice"><strong>Planningstaak aanwezig, verzoek ontbreekt</strong><br>De taak “Plan ORV in” staat open, maar het oproepverzoek is niet zichtbaar in het planningsoverzicht. De taak alleen bevestigt dus niet dat het vervolg wordt ingepland.</div>';
 if(item.state==='missing')notice='<div class="notice"><strong>Vervolg nog niet vastgelegd</strong><br>Er is geen oproepverzoek ingediend en geen uitzondering vastgelegd.</div>';
 if(item.state==='exception')notice=`<div class="notice ${attention(item)?'':'info'}"><strong>${attention(item)?'Herbeoordelingsdatum bereikt':'Bewust geen vervolgspreekuur'}</strong><br>${escape(item.reason)}<br>Herbeoordelen op ${date(item.review)}.</div>`;
 $('detail-content').innerHTML=`${notice}<section class="detail-section"><h3>Voortgang</h3><dl class="facts"><div><dt>Laatste spreekuur</dt><dd>${date(item.last)}</dd></div><div><dt>ORV ingediend</dt><dd>${item.submitted?'Ja, '+date(item.submitted):'Nee'}</dd></div><div><dt>Zichtbaar bij planning</dt><dd>${['waiting','scheduled'].includes(item.state)?'Ja':'Nee'}</dd></div><div><dt>Vervolgspreekuur</dt><dd>${item.next?date(item.next):'Niet ingepland'}</dd></div></dl></section><section class="detail-section"><h3>${item.state==='exception'?'Uitzondering beoordelen':'Vervolg vastleggen'}</h3><form id="exception-form" class="detail-form"><label>Reden uitzondering<select id="reason" required><option value="">Kies een reden</option><option>In afwachting van arbeidsdeskundig onderzoek</option><option>Beoogd herstel; vervolgspreekuur niet nodig</option></select></label><label>Herbeoordelingsdatum<input type="date" id="review-date" min="${referenceDate}" required value="${item.state==='exception'?item.review:''}"></label><button class="primary" type="submit">Uitzondering vastleggen in demo</button></form>${item.state==='missing'||item.state==='exception'?'<button id="create-orv" class="secondary-button">ORV indienen in demo</button>':''}</section><p class="footnote">Alle wijzigingen zijn tijdelijk en alleen zichtbaar in dit concept. Er gaat geen verzoek naar een echte planning.</p>`;
 const facts=$('detail-content').querySelector('.facts');
 for(const [label,value] of [['Verzuimduur',duration(item.firstSickDay)],['Eerste ziektedag',date(item.firstSickDay)]]){
  const fact=document.createElement('div');const title=document.createElement('dt');const content=document.createElement('dd');title.textContent=label;content.textContent=value;fact.append(title,content);facts.prepend(fact);
 }
 if(item.state==='exception')$('reason').value=item.reason;
 $('exception-form').addEventListener('submit',event=>{event.preventDefault();item.state='exception';item.reason=$('reason').value;item.review=$('review-date').value;delete item.next;render();$('detail').close();notify('Uitzondering vastgelegd in het demodossier.');});
 if($('create-orv'))$('create-orv').addEventListener('click',()=>{item.state='waiting';item.submitted=referenceDate;delete item.reason;delete item.review;render();$('detail').close();notify('Demo-ORV ingediend en zichtbaar bij planning.');});
 if(!$('detail').open){lastFocus=document.activeElement;$('detail').showModal();}
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;render();}));
document.querySelector('[role=tablist]').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('[role=tab]')];const index=tabs.indexOf(document.activeElement);if(index<0)return;let target;if(event.key==='ArrowRight')target=(index+1)%tabs.length;if(event.key==='ArrowLeft')target=(index-1+tabs.length)%tabs.length;if(event.key==='Home')target=0;if(event.key==='End')target=tabs.length-1;if(target!==undefined){event.preventDefault();tabs[target].click();tabs[target].focus();}});
$('search').addEventListener('input',render);$('status').addEventListener('change',render);
$('reset').addEventListener('click',()=>{$('search').value='';$('status').value='all';view='all';render();});
$('sort-date').addEventListener('click',()=>{ascending=!ascending;render();});
$('rows').addEventListener('click',event=>{const button=event.target.closest('[data-id]');if(button)openDetail(button.dataset.id);});
$('close').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus();else document.querySelector('[role=tab][aria-selected=true]').focus();});
render();
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{
  Promise.resolve(document.modelContext.registerTool({
   name:'show_demo_case_view',title:'Demodossiers filteren',
   description:'Toon alle fictieve dossiers, dossiers met aandacht, uitzonderingen of lopende vervolgen. Wijzigt alleen de zichtbare selectie.',
   inputSchema:{type:'object',properties:{view:{type:'string',enum:['all','attention','exception','progress']}},required:['view'],additionalProperties:false},
   annotations:{readOnlyHint:false,untrustedContentHint:false},
   execute(input){if(!input||!['all','attention','exception','progress'].includes(input.view)||Object.keys(input).some(key=>key!=='view'))throw new Error('Ongeldige dossierselectie');view=input.view;$('search').value='';$('status').value='all';render();return {view,count:cases.filter(item=>matches(item,view)).length,demo:true};}
  },{signal:lifecycle.signal})).catch(()=>{});
 }catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

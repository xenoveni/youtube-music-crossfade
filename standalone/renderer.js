const qInput=document.getElementById('searchInput')
const qBtn=document.getElementById('searchBtn')
const resultsEl=document.getElementById('results')
const queueList=document.getElementById('queueList')

const audio1=document.getElementById('audio1')
const audio2=document.getElementById('audio2')
const disc1=document.getElementById('disc1')
const disc2=document.getElementById('disc2')
const title1=document.getElementById('title1')
const title2=document.getElementById('title2')
const author1=document.getElementById('author1')
const author2=document.getElementById('author2')
const toggle1=document.getElementById('toggle1')
const toggle2=document.getElementById('toggle2')
const vol1=document.getElementById('vol1')
const vol2=document.getElementById('vol2')
const xfadeControl=document.getElementById('xfadeControl')
const progress1=document.getElementById('progress1')
const progress2=document.getElementById('progress2')
const progressText1=document.getElementById('progressText1')
const progressText2=document.getElementById('progressText2')
const dropDeck1=document.getElementById('dropDeck1')
const dropDeck2=document.getElementById('dropDeck2')

let queue=[]
let currentDeck=1
let crossfadeActive=false
let xfadeSeconds=15
let dragIndex=null
let deck1TrackId=null
let deck2TrackId=null
let vol1Base=100
let vol2Base=100

function renderResults(items){
  resultsEl.innerHTML=''
  items.forEach(i=>{
    const row=document.createElement('div')
    row.className='result-item'
    const meta=document.createElement('div')
    meta.innerHTML=`${i.title}`
    row.draggable=true
    row.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('application/json',JSON.stringify({type:'result',item:i}))
    })
    row.appendChild(meta)
    resultsEl.appendChild(row)
  })
}

function renderQueue(){
  queueList.innerHTML=''
  queue.forEach((t,idx)=>{
    const item=document.createElement('div')
    item.className='queue-item'
    const meta=document.createElement('div')
    meta.className='queue-meta'
    meta.innerHTML=`${t.title}`
    item.draggable=true
    item.dataset.index=idx
    item.addEventListener('dragstart',e=>{dragIndex=idx;e.dataTransfer.setData('text/plain','drag');e.dataTransfer.setData('application/json',JSON.stringify({type:'queue',index:idx}))})
    item.addEventListener('dragover',e=>{e.preventDefault()})
    item.addEventListener('drop',e=>{e.preventDefault();const from=dragIndex;const to=idx;if(from===null||to===null) return;const [m]=queue.splice(from,1);queue.splice(to,0,m);dragIndex=null;renderQueue()})
    item.appendChild(meta)
    queueList.appendChild(item)
  })
}

async function addToQueue(item){
  if(queue.length===0){
    queue.push(item)
    renderQueue()
    try{
      const recs = await window.electronAPI.recommend(item.id)
      if(Array.isArray(recs)){
        const ids = new Set(queue.map(x=>x.id))
        const filtered = recs.filter(r=>r.id && !ids.has(r.id))
        queue = queue.concat(filtered)
        renderQueue()
      }
    }catch(_){ }
    currentDeck=1
    await loadNext(0)
    if(!deck2TrackId && queue.length){
      currentDeck=2
      await loadNext(0)
    }
  } else {
    queue.push(item)
    renderQueue()
    preloadIfNeeded()
    if(queue.length===2 && !deck2TrackId){
      currentDeck=2
      await loadNext(1)
    }
  }
}

async function preloadIfNeeded(){
  const targetDeck=currentDeck===1?2:1
  const audio=targetDeck===1?audio1:audio2
  if(!audio.src && queue.length){
    let nextIndex=0
    const otherId = targetDeck===1?deck2TrackId:deck1TrackId
    for(let i=0;i<queue.length;i++){ if(queue[i].id!==otherId){ nextIndex=i; break; } }
    const next=queue[nextIndex]
    const resolved=await window.electronAPI.resolveAudio(next.id)
    if(!resolved||!resolved.url){ return }
    audio.src=resolved.url
    audio.load()
    audio.volume=0
    const disc=targetDeck===1?disc1:disc2
    const titleEl=targetDeck===1?title1:title2
    const authorEl=targetDeck===1?author1:author2
    disc.src=resolved.thumbnail
    titleEl.textContent=resolved.title
    authorEl.textContent=resolved.author
    const p=targetDeck===1?progress1:progress2
    p.value=0
    p.max=resolved.lengthSeconds||100
  }
}

async function loadNext(idx){
  let item=queue[idx]
  const otherId = currentDeck===1?deck2TrackId:deck1TrackId
  if(item && item.id===otherId){
    const altIndex = queue.findIndex(q=>q.id!==otherId)
    if(altIndex>-1) { idx=altIndex; item=queue[idx] } else { return }
  }
  queue.splice(idx,1)
  renderQueue()
  const deck=currentDeck===1?audio1:audio2
  const disc=currentDeck===1?disc1:disc2
  const titleEl=currentDeck===1?title1:title2
  const authorEl=currentDeck===1?author1:author2
  const resolved=await window.electronAPI.resolveAudio(item.id)
  if(!resolved||!resolved.url){
    console.warn('No audio url for', item)
    return
  }
  deck.src=resolved.url
  deck.load()
  deck.volume=1
  disc.src=resolved.thumbnail
  titleEl.textContent=resolved.title
  authorEl.textContent=resolved.author
  deck.oncanplay=()=>{ deck.play().catch(()=>{}); deck.oncanplay=null }
  playCurrent()
  preloadIfNeeded()
  if(currentDeck===1){ deck1TrackId=item.id } else { deck2TrackId=item.id }
}

function playCurrent(){
  const deck=currentDeck===1?audio1:audio2
  deck.play().catch(()=>{})
  const disc=currentDeck===1?disc1:disc2
  disc.classList.add('spinning')
  updateVolumes()
  if(currentDeck===1){ toggle1.textContent='❚❚' } else { toggle2.textContent='❚❚' }
}

function pauseCurrent(){
  const deck=currentDeck===1?audio1:audio2
  deck.pause()
  const disc=currentDeck===1?disc1:disc2
  disc.classList.remove('spinning')
  if(currentDeck===1){ toggle1.textContent='▶' } else { toggle2.textContent='▶' }
}

function otherDeck(){
  return currentDeck===1?audio2:audio1
}

function updateVolumes(){
  const mix = Math.max(0, Math.min(100, parseInt(xfadeControl.value||'0',10))) / 100
  const v1 = (vol1Base/100) * (1 - mix)
  const v2 = (vol2Base/100) * mix
  audio1.volume = v1
  audio2.volume = v2
}

function monitor(){
  const deck=currentDeck===1?audio1:audio2
  if(crossfadeActive) return
  if(deck.duration&&deck.currentTime){
    const remaining=deck.duration-deck.currentTime
    const p= currentDeck===1?progress1:progress2
    p.max=Math.floor(deck.duration)
    p.value=Math.floor(deck.currentTime)
    const pt= currentDeck===1?progressText1:progressText2
    const fmt=(s)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
    const untilXfade=Math.max(0, Math.floor(remaining - xfadeSeconds))
    pt.textContent=`${fmt(deck.currentTime)} / ${fmt(deck.duration)}  •  xfade in ${untilXfade}s`
    if(remaining>0&&remaining<=xfadeSeconds){
      triggerCrossfade()
    }
  }
}

async function triggerCrossfade(){
  if(crossfadeActive) return
  crossfadeActive=true
  const from=currentDeck===1?audio1:audio2
  const to=otherDeck()
  if(!to.src&&queue.length){
    const next=queue.shift()
    renderQueue()
    const r=await window.electronAPI.resolveAudio(next.id)
    to.src=r.url
    to.load()
  }
  await to.play().catch(()=>{})
  const startVal = currentDeck===1 ? 0 : 100
  const endVal = currentDeck===1 ? 100 : 0
  const dur=xfadeSeconds*1000
  const start=Date.now()
  const id=setInterval(()=>{
    const p=Math.min(1,(Date.now()-start)/dur)
    xfadeControl.value = Math.round(startVal + (endVal - startVal)*p)
    updateVolumes()
    if(p>=1){
      clearInterval(id)
      from.pause()
      from.src=''
      const dFrom=(currentDeck===1?disc1:disc2)
      dFrom.classList.remove('spinning')
      currentDeck=currentDeck===1?2:1
      crossfadeActive=false
      updateVolumes()
      preloadIfNeeded()
    }
  },50)
}

dropDeck1.addEventListener('dragover',e=>{e.preventDefault()})
dropDeck1.addEventListener('drop',async e=>{
  e.preventDefault()
  try{
    const data=JSON.parse(e.dataTransfer.getData('application/json'))
    currentDeck=1
    if(data.type==='result'){
      queue.push(data.item)
      renderQueue()
      await loadNext(queue.length-1)
    } else if(data.type==='queue'){
      await loadNext(data.index)
    }
  }catch(_){ }
})
dropDeck2.addEventListener('dragover',e=>{e.preventDefault()})
dropDeck2.addEventListener('drop',async e=>{
  e.preventDefault()
  try{
    const data=JSON.parse(e.dataTransfer.getData('application/json'))
    currentDeck=2
    if(data.type==='result'){
      queue.push(data.item)
      renderQueue()
      await loadNext(queue.length-1)
    } else if(data.type==='queue'){
      await loadNext(data.index)
    }
  }catch(_){ }
})

const playlistArea=document.getElementById('playlistArea')
playlistArea.addEventListener('dragover',e=>{e.preventDefault()})
playlistArea.addEventListener('drop',async e=>{
  e.preventDefault()
  try{
    const data=JSON.parse(e.dataTransfer.getData('application/json'))
    if(data.type==='result'){
      await addToQueue(data.item)
    }
  }catch(_){ }
})

function doSearch(){
  const q=qInput.value.trim()
  if(!q) return
  window.electronAPI.search(q).then(items=>{
    if(!items||!items.length){
      resultsEl.innerHTML='<div style="padding:12px;color:#a0a0b0">No results. Try another query.</div>'
    }else{
      renderResults(items)
    }
  }).catch(()=>{
    resultsEl.innerHTML='<div style="padding:12px;color:#f99">Search failed.</div>'
  })
}
qBtn.onclick=doSearch
qInput.addEventListener('keydown',e=>{ if(e.key==='Enter'){ doSearch() } })

toggle1.onclick=()=>{ currentDeck=1; if(audio1.paused){ playCurrent(); toggle1.textContent='❚❚' } else { pauseCurrent(); toggle1.textContent='▶' } }
toggle2.onclick=()=>{ currentDeck=2; if(audio2.paused){ playCurrent(); toggle2.textContent='❚❚' } else { pauseCurrent(); toggle2.textContent='▶' } }
vol1.oninput=()=>{ vol1Base=parseInt(vol1.value||'100',10); updateVolumes() }
vol2.oninput=()=>{ vol2Base=parseInt(vol2.value||'100',10); updateVolumes() }
xfadeControl.oninput=()=>{ updateVolumes() }

setInterval(monitor,1000)
progress1.addEventListener('input',()=>{ if(audio1.duration){ audio1.currentTime = Math.min(audio1.duration, Math.max(0, parseInt(progress1.value||'0',10))) } })
progress2.addEventListener('input',()=>{ if(audio2.duration){ audio2.currentTime = Math.min(audio2.duration, Math.max(0, parseInt(progress2.value||'0',10))) } })
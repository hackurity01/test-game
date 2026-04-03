import{A as e,D as t,M as n,N as r,P as i,T as a,a as o,b as s,c,d as l,g as u,h as d,i as f,j as p,k as m,l as h,m as g,n as _,o as v,p as y,s as b,t as x,u as S,x as C}from"./scorer-DgDJ_lFl.js";function w(w){let T=w.trim().split(`.`).filter(Boolean),E=[],D=S(),O=g(),k=y(),A=l(),j=null,M=null,N=null,P=null,F=``,I=``;for(let l of T){let g=l[0];if(g===`a`){let e=parseInt(l[1]),t=a(l[2]),n=m[e-1],r=n.stories[t];D=o(D,r.center);let i=n.stories.map((e,n)=>`${n===t?`▶ `:`  `}${String.fromCharCode(65+n)} [${e.center}] ${e.text}`).join(`
`);E.push({phase:`Phase 1A`,label:`일기 라운드 ${e}: ${n.situation}`,question:`${n.situation} × ${n.dimension}`,answer:`${l[2]} [${r.center}] ${r.text}`,allChoices:i,impact:`center ${r.center} +1 → body:${D.body} heart:${D.heart} head:${D.head}`})}else if(g===`v`){let e=l.slice(1).split(``).map(Number),n=[1.5,1,.5],r=[],i=new Set(e),a=[];for(let i=0;i<e.length;i++){let o=t.find(t=>t.id===e[i]);D=x(D,o,n[i]),O=_(O,o,n[i]),k=f(k,o.mistype,n[i]),a.push(`[${i+1}순위] v${o.id}: ${o.title} (${o.center}/T${o.typeHint})\n    ${o.text}`),r.push(`${o.center} +${n[i]}, T${o.typeHint} +${n[i]}`)}let o=t.map(e=>`${i.has(e.id)?`▶ `:`  `}v${e.id}: ${e.title} (${e.center}/T${e.typeHint})\n    ${e.text}`).join(`
`);j=d(D),E.push({phase:`Phase 1B`,label:`내면의 목소리`,question:`가장 공감되는 순서대로 3개 선택`,answer:a.join(`
`),allChoices:o,impact:r.join(`
`)+`\n중심 판정: ${j.primary} (${(j.confidence*100).toFixed(0)}%), parallel: [${j.parallelCenters.join(`, `)}]`})}else if(g===`s`){let e=parseInt(l[1])-1,t=parseInt(l[2]),r=a(l[3]),i=n[e].variants[t],o=i.choices[r];D=c(D,o.center),j=d(D);let s=i.choices.map((e,t)=>`${t===r?`▶ `:`  `}${String.fromCharCode(65+t)} [${e.center}] ${e.text}`).join(`
`);E.push({phase:`Phase 1C`,label:`보충 질문 ${e+1}`,question:i.prompt,answer:`${l[3]} [${o.center}] ${o.text}`,allChoices:s,impact:`center ${o.center} +2 → body:${D.body} heart:${D.heart} head:${D.head}\n중심 판정: ${j.primary} (${(j.confidence*100).toFixed(0)}%)`})}else if(g===`d`){let e=parseInt(l[1])-1,t=parseInt(l[2]),n=l.slice(3),o=p[e],s=o.variants[t];j||=d(D);let c=j.parallelCenters.flatMap(e=>s.choices[e]),u=n.length,m=u===1?[1]:[1,.5],h=[],g=[],_=new Set,v=[];for(let e=0;e<u;e++){let t=a(n[e]);_.add(t);let s=c[t],l=o.weight*m[e];if(O=b(O,s.type,l),k=f(k,s.mistype,l),u>1){let e=r[s.type];D={...D,[e]:D[e]+l}}v.push(`${n[e]} [T${s.type} ${i[s.type]}] ${s.text}`),g.push(`T${s.type} +${l.toFixed(1)}`)}for(let e=0;e<c.length;e++){let t=c[e],n=_.has(e)?`▶ `:`  `;h.push(`${n}${String.fromCharCode(65+e)} [T${t.type} ${i[t.type]}] ${t.text}`)}E.push({phase:`Phase 2`,label:`유형 판별 ${e+1} (${o.dimension})`,question:s.prompt,answer:v.join(`
`),allChoices:h.join(`
`),impact:g.join(`, `)})}else if(g===`h`){let t=a(l[1]),n=e[0],r=n.stories[t];A=v(A,r.harmonic);let o=u(A);j&&(M=C(j.primary,o.primary));let s=n.stories.map((e,n)=>`${n===t?`▶ `:`  `}${String.fromCharCode(65+n)} [${e.harmonic}] ${e.text}`).join(`
`);E.push({phase:`Phase 3`,label:`하모닉 교차 검증`,question:`${n.situation} × ${n.dimension}`,answer:`${l[1]} [${r.harmonic}] ${r.text}`,allChoices:s,impact:`harmonic: ${r.harmonic}${M?` → 추론 유형: T${M} ${i[M]}`:``}`})}else if(g===`f`){let e=a(l[1]),t=s(O),n=t[e];N=n.type;let r=t.map((t,n)=>`${n===e?`▶ `:`  `}${String.fromCharCode(65+n)} [T${t.type} ${i[t.type]}] ${t.fear}`).join(`
`);E.push({phase:`Phase 4`,label:`핵심 두려움`,question:`다음 중 가장 견디기 힘든 상황은?`,answer:`${l[1]} [T${n.type} ${i[n.type]}] ${n.fear}`,allChoices:r,impact:`fear → T${n.type} (최종 점수에 +2 반영)`})}else if(g===`x`){let e=a(l[1]),t=s(O),n=t[e],r=h(O,N,n.type,M,k);P=r.primaryType,F=i[r.primaryType],I=r.confidence===`high`?`높은 확신`:`보통 확신`;let o=t.map((t,n)=>`${n===e?`▶ `:`  `}${String.fromCharCode(65+n)} [T${t.type} ${i[t.type]}] ${t.shadow}`).join(`
`);E.push({phase:`Phase 4`,label:`그림자 패턴`,question:`다음 중 솔직하게 인정할 수 있는 패턴은?`,answer:`${l[1]} [T${n.type} ${i[n.type]}] ${n.shadow}`,allChoices:o,impact:`shadow → T${n.type} (최종 점수에 +1 반영)\n최종 결과: T${r.primaryType} ${i[r.primaryType]} (${I})`})}}return{steps:E,finalType:P,finalName:F,confidence:I,finalTypeScores:O}}function T(){let e=document.getElementById(`parser-app`),t=new URLSearchParams(window.location.search).get(`code`)||``;e.innerHTML=`
    <div class="parser-container">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">응답 해석기</h1>
        <p style="font-size:14px; color:#8b8680;">응답 코드를 입력하면 각 질문과 점수를 확인할 수 있습니다.</p>
      </div>
      <div class="parser-input-section">
        <input class="parser-input" id="code-input" type="text"
          placeholder="응답 코드 (예: a1A.a2B.v159.d10A...)"
          value="${A(t)}" />
        <button class="parser-btn" id="btn-parse">해석하기</button>
      </div>
      <div id="parser-results"></div>
    </div>
  `;let n=e.querySelector(`#code-input`),r=e.querySelector(`#btn-parse`),i=e.querySelector(`#parser-results`),a=()=>{let e=n.value.trim();if(!e)return;let t=new URL(window.location.href);t.searchParams.set(`code`,e),history.replaceState(null,``,t.toString());try{E(i,w(e))}catch(e){i.innerHTML=`<div class="parser-error">해석 오류: ${k(e.message)}</div>`}};r.addEventListener(`click`,a),n.addEventListener(`keydown`,e=>{e.key===`Enter`&&a()}),t&&a()}function E(e,t){e.innerHTML=t.steps.map(e=>`
    <div class="parser-step">
      <div class="parser-step-phase">${k(e.phase)} · ${k(e.label)}</div>
      <div class="parser-step-question">${k(e.question)}</div>
      <div class="parser-step-answer">${O(e.answer)}</div>
      ${e.allChoices?`<details class="parser-all-choices"><summary>전체 보기</summary><div class="parser-all-choices-content">${O(e.allChoices)}</div></details>`:``}
      <div class="parser-step-impact">${k(e.impact)}</div>
    </div>
  `).join(``)+(t.finalType?`
    <div class="parser-final">
      <div class="parser-final-type">${t.finalType}</div>
      <div class="parser-final-name">${k(t.finalName)}</div>
      <div class="parser-final-confidence">${k(t.confidence)}</div>
    </div>
    ${D(t.finalTypeScores)}
  `:``)}function D(e){let t=[1,2,3,4,5,6,7,8,9].map(t=>({type:t,score:e[t]||0})).sort((e,t)=>t.score-e.score),n=t[0].score||1;return`<div class="parser-scores">
    <div style="font-size:13px; font-weight:600; color:#6b6560; margin-bottom:8px;">최종 유형 점수</div>
    ${t.map(({type:e,score:t})=>`<div class="parser-score-row">
      <span class="parser-score-label">T${e}</span>
      <div class="parser-score-track">
        <div class="parser-score-fill" style="width:${t/n*100}%"></div>
      </div>
      <span class="parser-score-num">${t.toFixed(1)}</span>
    </div>`).join(``)}
  </div>`}function O(e){return e.split(`
`).map(e=>{let t=k(e);return e.startsWith(`▶ `)?`<span class="parser-selected">${t}</span>`:t}).join(`
`)}function k(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function A(e){return e.replace(/&/g,`&amp;`).replace(/"/g,`&quot;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}T();
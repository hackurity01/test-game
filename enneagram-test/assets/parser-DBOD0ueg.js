import{A as e,C as t,D as n,M as r,O as i,T as a,a as o,c as s,f as c,i as l,j as u,k as d,l as f,m as p,n as m,o as h,p as g,s as _,t as v,u as y,v as b,y as x}from"./scorer-BweE4l9H.js";function S(S){let C=S.trim().split(`.`).filter(Boolean),w=[],T=f(),E=c(),D=y(),O=null,k=null,A=null,j=null,M=``,N=``;for(let c of C){let f=c[0];if(f===`a`){let e=parseInt(c[1]),r=t(c[2]),i=n[e-1],a=i.stories[r];T=l(T,a.center);let o=i.stories.map((e,t)=>`${t===r?`▶ `:`  `}${String.fromCharCode(65+t)} [${e.center}] ${e.text}`).join(`
`);w.push({phase:`Phase 1A`,label:`일기 라운드 ${e}: ${i.situation}`,question:`${i.situation} × ${i.dimension}`,answer:`${c[2]} [${a.center}] ${a.text}`,allChoices:o,impact:`center ${a.center} +1 → body:${T.body} heart:${T.heart} head:${T.head}`})}else if(f===`v`){let e=c.slice(1).split(``).map(Number),t=[1.5,1,.5],n=[],r=new Set(e),i=[];for(let r=0;r<e.length;r++){let o=a.find(t=>t.id===e[r]);T=v(T,o,t[r]),E=m(E,o,t[r]),i.push(`[${r+1}순위] v${o.id}: ${o.title} (${o.center}/T${o.typeHint})\n    ${o.text}`),n.push(`${o.center} +${t[r]}, T${o.typeHint} +${t[r]}`)}let o=a.map(e=>`${r.has(e.id)?`▶ `:`  `}v${e.id}: ${e.title} (${e.center}/T${e.typeHint})\n    ${e.text}`).join(`
`);O=g(T),w.push({phase:`Phase 1B`,label:`내면의 목소리`,question:`가장 공감되는 순서대로 3개 선택`,answer:i.join(`
`),allChoices:o,impact:n.join(`
`)+`\n중심 판정: ${O.primary} (${(O.confidence*100).toFixed(0)}%), parallel: [${O.parallelCenters.join(`, `)}]`})}else if(f===`s`){let n=parseInt(c[1])-1,r=parseInt(c[2]),i=t(c[3]),a=e[n].variants[r],o=a.choices[i];T=_(T,o.center),O=g(T);let s=a.choices.map((e,t)=>`${t===i?`▶ `:`  `}${String.fromCharCode(65+t)} [${e.center}] ${e.text}`).join(`
`);w.push({phase:`Phase 1C`,label:`보충 질문 ${n+1}`,question:a.prompt,answer:`${c[3]} [${o.center}] ${o.text}`,allChoices:s,impact:`center ${o.center} +2 → body:${T.body} heart:${T.heart} head:${T.head}\n중심 판정: ${O.primary} (${(O.confidence*100).toFixed(0)}%)`})}else if(f===`d`){let e=parseInt(c[1])-1,n=parseInt(c[2]),i=c.slice(3),a=d[e],o=a.variants[n];O||=g(T);let s=O.parallelCenters.flatMap(e=>o.choices[e]),l=i.length,f=l===1?[1]:[1,.5],p=[],m=[],_=new Set,v=[];for(let e=0;e<l;e++){let n=t(i[e]);_.add(n);let o=s[n],c=a.weight*f[e];if(E=h(E,o.type,c),l>1){let e=u[o.type];T={...T,[e]:T[e]+c}}v.push(`${i[e]} [T${o.type} ${r[o.type]}] ${o.text}`),m.push(`T${o.type} +${c.toFixed(1)}`)}for(let e=0;e<s.length;e++){let t=s[e],n=_.has(e)?`▶ `:`  `;p.push(`${n}${String.fromCharCode(65+e)} [T${t.type} ${r[t.type]}] ${t.text}`)}w.push({phase:`Phase 2`,label:`유형 판별 ${e+1} (${a.dimension})`,question:o.prompt,answer:v.join(`
`),allChoices:p.join(`
`),impact:m.join(`, `)})}else if(f===`h`){let e=t(c[1]),n=i[0],a=n.stories[e];D=o(D,a.harmonic);let s=p(D);O&&(k=x(O.primary,s.primary));let l=n.stories.map((t,n)=>`${n===e?`▶ `:`  `}${String.fromCharCode(65+n)} [${t.harmonic}] ${t.text}`).join(`
`);w.push({phase:`Phase 3`,label:`하모닉 교차 검증`,question:`${n.situation} × ${n.dimension}`,answer:`${c[1]} [${a.harmonic}] ${a.text}`,allChoices:l,impact:`harmonic: ${a.harmonic}${k?` → 추론 유형: T${k} ${r[k]}`:``}`})}else if(f===`f`){let e=t(c[1]),n=b(E),i=n[e];A=i.type;let a=n.map((t,n)=>`${n===e?`▶ `:`  `}${String.fromCharCode(65+n)} [T${t.type} ${r[t.type]}] ${t.fear}`).join(`
`);w.push({phase:`Phase 4`,label:`핵심 두려움`,question:`다음 중 가장 견디기 힘든 상황은?`,answer:`${c[1]} [T${i.type} ${r[i.type]}] ${i.fear}`,allChoices:a,impact:`fear → T${i.type} (최종 점수에 +2 반영)`})}else if(f===`x`){let e=t(c[1]),n=b(E),i=n[e],a=s(E,A,i.type,k);j=a.primaryType,M=r[a.primaryType],N=a.confidence===`high`?`높은 확신`:`보통 확신`;let o=n.map((t,n)=>`${n===e?`▶ `:`  `}${String.fromCharCode(65+n)} [T${t.type} ${r[t.type]}] ${t.shadow}`).join(`
`);w.push({phase:`Phase 4`,label:`그림자 패턴`,question:`다음 중 솔직하게 인정할 수 있는 패턴은?`,answer:`${c[1]} [T${i.type} ${r[i.type]}] ${i.shadow}`,allChoices:o,impact:`shadow → T${i.type} (최종 점수에 +1 반영)\n최종 결과: T${a.primaryType} ${r[a.primaryType]} (${N})`})}}return{steps:w,finalType:j,finalName:M,confidence:N,finalTypeScores:E}}function C(){let e=document.getElementById(`parser-app`),t=new URLSearchParams(window.location.search).get(`code`)||``;e.innerHTML=`
    <div class="parser-container">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">응답 해석기</h1>
        <p style="font-size:14px; color:#8b8680;">응답 코드를 입력하면 각 질문과 점수를 확인할 수 있습니다.</p>
      </div>
      <div class="parser-input-section">
        <input class="parser-input" id="code-input" type="text"
          placeholder="응답 코드 (예: a1A.a2B.v159.d10A...)"
          value="${O(t)}" />
        <button class="parser-btn" id="btn-parse">해석하기</button>
      </div>
      <div id="parser-results"></div>
    </div>
  `;let n=e.querySelector(`#code-input`),r=e.querySelector(`#btn-parse`),i=e.querySelector(`#parser-results`),a=()=>{let e=n.value.trim();if(!e)return;let t=new URL(window.location.href);t.searchParams.set(`code`,e),history.replaceState(null,``,t.toString());try{w(i,S(e))}catch(e){i.innerHTML=`<div class="parser-error">해석 오류: ${D(e.message)}</div>`}};r.addEventListener(`click`,a),n.addEventListener(`keydown`,e=>{e.key===`Enter`&&a()}),t&&a()}function w(e,t){e.innerHTML=t.steps.map(e=>`
    <div class="parser-step">
      <div class="parser-step-phase">${D(e.phase)} · ${D(e.label)}</div>
      <div class="parser-step-question">${D(e.question)}</div>
      <div class="parser-step-answer">${E(e.answer)}</div>
      ${e.allChoices?`<details class="parser-all-choices"><summary>전체 보기</summary><div class="parser-all-choices-content">${E(e.allChoices)}</div></details>`:``}
      <div class="parser-step-impact">${D(e.impact)}</div>
    </div>
  `).join(``)+(t.finalType?`
    <div class="parser-final">
      <div class="parser-final-type">${t.finalType}</div>
      <div class="parser-final-name">${D(t.finalName)}</div>
      <div class="parser-final-confidence">${D(t.confidence)}</div>
    </div>
    ${T(t.finalTypeScores)}
  `:``)}function T(e){let t=[1,2,3,4,5,6,7,8,9].map(t=>({type:t,score:e[t]||0})).sort((e,t)=>t.score-e.score),n=t[0].score||1;return`<div class="parser-scores">
    <div style="font-size:13px; font-weight:600; color:#6b6560; margin-bottom:8px;">최종 유형 점수</div>
    ${t.map(({type:e,score:t})=>`<div class="parser-score-row">
      <span class="parser-score-label">T${e}</span>
      <div class="parser-score-track">
        <div class="parser-score-fill" style="width:${t/n*100}%"></div>
      </div>
      <span class="parser-score-num">${t.toFixed(1)}</span>
    </div>`).join(``)}
  </div>`}function E(e){return e.split(`
`).map(e=>{let t=D(e);return e.startsWith(`▶ `)?`<span class="parser-selected">${t}</span>`:t}).join(`
`)}function D(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function O(e){return e.replace(/&/g,`&amp;`).replace(/"/g,`&quot;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}C();
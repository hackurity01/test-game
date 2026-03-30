import{A as e,C as t,D as n,M as r,O as i,T as a,a as o,c as s,f as c,i as l,j as u,k as d,l as f,m as p,n as m,o as h,p as g,s as _,t as v,u as y,v as b,y as x}from"./scorer-C7-Z0NKE.js";function S(S){let w=S.trim().split(`.`).filter(Boolean),T=[],E=f(),D=c(),O=y(),k=null,A=null,j=null,M=null,N=``,P=``;for(let c of w){let f=c[0];if(f===`a`){let e=parseInt(c[1]),r=t(c[2]),i=n[e-1],a=i.stories[r];E=l(E,a.center),T.push({phase:`Phase 1A`,label:`일기 라운드 ${e}: ${i.situation}`,question:`${i.situation} × ${i.dimension}`,answer:`${c[2]} — ${a.center}\n${C(a.text,100)}`,impact:`center ${a.center} +1 → body:${E.body} heart:${E.heart} head:${E.head}`})}else if(f===`v`){let e=c.slice(1).split(``).map(Number),t=[1.5,1,.5],n=[],r=[];for(let i=0;i<e.length;i++){let o=a.find(t=>t.id===e[i]);E=v(E,o,t[i]),D=m(D,o,t[i]),n.push(`[${i+1}순위] v${o.id}: ${o.title} (${o.center}/T${o.typeHint})`),r.push(`${o.center} +${t[i]}, T${o.typeHint} +${t[i]}`)}k=g(E),T.push({phase:`Phase 1B`,label:`내면의 목소리`,question:`가장 공감되는 순서대로 3개 선택`,answer:n.join(`
`),impact:r.join(`
`)+`\n중심 판정: ${k.primary} (${(k.confidence*100).toFixed(0)}%), parallel: [${k.parallelCenters.join(`, `)}]`})}else if(f===`s`){let n=parseInt(c[1])-1,r=parseInt(c[2]),i=t(c[3]),a=e[n].variants[r],o=a.choices[i];E=_(E,o.center),k=g(E),T.push({phase:`Phase 1C`,label:`보충 질문 ${n+1}`,question:a.prompt,answer:`${c[3]} — ${o.text}`,impact:`center ${o.center} +2 → body:${E.body} heart:${E.heart} head:${E.head}\n중심 판정: ${k.primary} (${(k.confidence*100).toFixed(0)}%)`})}else if(f===`d`){let e=parseInt(c[1])-1,n=parseInt(c[2]),i=c.slice(3),a=d[e],o=a.variants[n];k||=g(E);let s=k.parallelCenters.flatMap(e=>o.choices[e]),l=i.length,f=l===1?[1]:[1,.5],p=[],m=[];for(let e=0;e<l;e++){let n=s[t(i[e])],o=a.weight*f[e];if(D=h(D,n.type,o),l>1){let e=u[n.type];E={...E,[e]:E[e]+o}}p.push(`${i[e]} — T${n.type} ${r[n.type]}: ${C(n.text,60)}`),m.push(`T${n.type} +${o.toFixed(1)}`)}T.push({phase:`Phase 2`,label:`유형 판별 ${e+1} (${a.dimension})`,question:o.prompt,answer:p.join(`
`),impact:m.join(`, `)})}else if(f===`h`){let e=t(c[1]),n=i[0],a=n.stories[e];O=o(O,a.harmonic);let s=p(O);k&&(A=x(k.primary,s.primary)),T.push({phase:`Phase 3`,label:`하모닉 교차 검증`,question:`${n.situation} × ${n.dimension}`,answer:`${c[1]} — ${a.harmonic}\n${C(a.text,100)}`,impact:`harmonic: ${a.harmonic}${A?` → 추론 유형: T${A} ${r[A]}`:``}`})}else if(f===`f`){let e=t(c[1]),n=b(D)[e];j=n.type,T.push({phase:`Phase 4`,label:`핵심 두려움`,question:`다음 중 가장 견디기 힘든 상황은?`,answer:`${c[1]} — T${n.type} ${r[n.type]}\n${n.fear}`,impact:`fear → T${n.type} (최종 점수에 +2 반영)`})}else if(f===`x`){let e=t(c[1]),n=b(D)[e],i=s(D,j,n.type,A);M=i.primaryType,N=r[i.primaryType],P=i.confidence===`high`?`높은 확신`:`보통 확신`,T.push({phase:`Phase 4`,label:`그림자 패턴`,question:`다음 중 솔직하게 인정할 수 있는 패턴은?`,answer:`${c[1]} — T${n.type} ${r[n.type]}\n${n.shadow}`,impact:`shadow → T${n.type} (최종 점수에 +1 반영)\n최종 결과: T${i.primaryType} ${r[i.primaryType]} (${P})`})}}return{steps:T,finalType:M,finalName:N,confidence:P,finalTypeScores:D}}function C(e,t){return e.length<=t?e:e.substring(0,t)+`…`}function w(){let e=document.getElementById(`parser-app`),t=new URLSearchParams(window.location.search).get(`code`)||``;e.innerHTML=`
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
  `;let n=e.querySelector(`#code-input`),r=e.querySelector(`#btn-parse`),i=e.querySelector(`#parser-results`),a=()=>{let e=n.value.trim();if(!e)return;let t=new URL(window.location.href);t.searchParams.set(`code`,e),history.replaceState(null,``,t.toString());try{T(i,S(e))}catch(e){i.innerHTML=`<div class="parser-error">해석 오류: ${D(e.message)}</div>`}};r.addEventListener(`click`,a),n.addEventListener(`keydown`,e=>{e.key===`Enter`&&a()}),t&&a()}function T(e,t){e.innerHTML=t.steps.map(e=>`
    <div class="parser-step">
      <div class="parser-step-phase">${D(e.phase)} · ${D(e.label)}</div>
      <div class="parser-step-question">${D(e.question)}</div>
      <div class="parser-step-answer">${D(e.answer)}</div>
      <div class="parser-step-impact">${D(e.impact)}</div>
    </div>
  `).join(``)+(t.finalType?`
    <div class="parser-final">
      <div class="parser-final-type">${t.finalType}</div>
      <div class="parser-final-name">${D(t.finalName)}</div>
      <div class="parser-final-confidence">${D(t.confidence)}</div>
    </div>
    ${E(t.finalTypeScores)}
  `:``)}function E(e){let t=[1,2,3,4,5,6,7,8,9].map(t=>({type:t,score:e[t]||0})).sort((e,t)=>t.score-e.score),n=t[0].score||1;return`<div class="parser-scores">
    <div style="font-size:13px; font-weight:600; color:#6b6560; margin-bottom:8px;">최종 유형 점수</div>
    ${t.map(({type:e,score:t})=>`<div class="parser-score-row">
      <span class="parser-score-label">T${e}</span>
      <div class="parser-score-track">
        <div class="parser-score-fill" style="width:${t/n*100}%"></div>
      </div>
      <span class="parser-score-num">${t.toFixed(1)}</span>
    </div>`).join(``)}
  </div>`}function D(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function O(e){return e.replace(/&/g,`&amp;`).replace(/"/g,`&quot;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}w();
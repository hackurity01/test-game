import{A as e,C as t,D as n,E as r,F as i,M as a,N as o,O as s,P as c,S as l,_ as u,a as d,b as f,c as p,d as m,f as h,g,h as _,i as v,j as y,k as b,l as x,m as S,n as C,o as w,p as T,r as E,s as D,t as O,u as k,v as A,w as j,x as M,y as N}from"./scorer-DgDJ_lFl.js";function P(){return new URLSearchParams(window.location.search).get(`DEV`)===`true`}var F={body:`Body (8,9,1)`,heart:`Heart (2,3,4)`,head:`Head (5,6,7)`},I={positive:`Positive (2,7,9)`,competency:`Competency (1,3,5)`,reactive:`Reactive (4,6,8)`},L=class{constructor(){this.collapsed=!1,this.container=document.createElement(`div`),this.container.className=`dev-panel`;let e=document.createElement(`button`);e.className=`dev-panel-toggle`,e.textContent=`◀ DEV`,e.addEventListener(`click`,()=>{this.collapsed=!this.collapsed,this.container.classList.toggle(`collapsed`,this.collapsed),e.textContent=this.collapsed?`▶ DEV`:`◀ DEV`}),this.content=document.createElement(`div`),this.content.className=`dev-panel-content`,this.container.appendChild(e),this.container.appendChild(this.content),document.body.appendChild(this.container)}update(e){let t=e,n=[];if(n.push(`<div class="dev-section">
      <div class="dev-label">Phase</div>
      <div class="dev-value">${t.phase}</div>
    </div>`),n.push(`<div class="dev-section">
      <div class="dev-label">Center Scores</div>
      ${this.renderCenterBar(`Body`,t.centerScores.body)}
      ${this.renderCenterBar(`Heart`,t.centerScores.heart)}
      ${this.renderCenterBar(`Head`,t.centerScores.head)}
    </div>`),t.p1aPicks.length>0&&n.push(`<div class="dev-section">
        <div class="dev-label">P1A Picks</div>
        <div class="dev-value">${t.p1aPicks.map(e=>F[e]).join(` → `)}</div>
      </div>`),t.harmonicScores.positive+t.harmonicScores.competency+t.harmonicScores.reactive>0&&n.push(`<div class="dev-section">
        <div class="dev-label">Harmonic Scores</div>
        ${this.renderCenterBar(`Positive`,t.harmonicScores.positive)}
        ${this.renderCenterBar(`Competency`,t.harmonicScores.competency)}
        ${this.renderCenterBar(`Reactive`,t.harmonicScores.reactive)}
      </div>`),t.p1hPicks.length>0&&n.push(`<div class="dev-section">
        <div class="dev-label">P1H Picks</div>
        <div class="dev-value">${t.p1hPicks.map(e=>I[e]).join(` → `)}</div>
      </div>`),t.inferredType&&n.push(`<div class="dev-section">
        <div class="dev-label">Inferred Type</div>
        <div class="dev-value dev-final">${t.inferredType} ${c[t.inferredType]} (C×H)</div>
      </div>`),t.centerResult){let e=t.centerResult;n.push(`<div class="dev-section">
        <div class="dev-label">Center Result</div>
        <div class="dev-value">
          1st: ${F[e.primary]}<br/>
          ${e.secondary?`2nd: ${F[e.secondary]}<br/>`:``}
          confidence: ${(e.confidence*100).toFixed(0)}%<br/>
          parallel: [${e.parallelCenters.join(`, `)}]<br/>
          supplement: ${e.needsSupplement?`yes`:`no`}
        </div>
      </div>`)}if(Object.values(t.typeScores).some(e=>e>0)){let e=[1,2,3,4,5,6,7,8,9].map(e=>({type:e,score:t.typeScores[e]||0})).sort((e,t)=>t.score-e.score),r=e[0].score||1;n.push(`<div class="dev-section">
        <div class="dev-label">Type Scores</div>
        ${e.map(({type:e,score:t})=>this.renderTypeBar(e,t,r)).join(``)}
      </div>`)}if(Object.values(t.mistypeScores).some(e=>e>0)){let e=[1,2,3,4,5,6,7,8,9].map(e=>({type:e,score:t.mistypeScores[e]||0})).filter(({score:e})=>e>0).sort((e,t)=>t.score-e.score),r=e[0]?.score||1;n.push(`<div class="dev-section">
        <div class="dev-label">Mistype Scores</div>
        ${e.map(({type:e,score:t})=>this.renderTypeBar(e,t,r)).join(``)}
        ${t.mistypeResult?.active?`<div class="dev-value" style="color:#c77;">⚠ active</div>`:``}
      </div>`)}if(t.typeResult){let e=t.typeResult;n.push(`<div class="dev-section">
        <div class="dev-label">Type Result</div>
        <div class="dev-value">
          1st: ${e.primary} ${c[e.primary]}<br/>
          2nd: ${e.secondary} ${c[e.secondary]}<br/>
          gap: ${(e.confidence*100).toFixed(0)}%
        </div>
      </div>`)}if(t.finalResult){let e=t.finalResult;n.push(`<div class="dev-section">
        <div class="dev-label">Final Result</div>
        <div class="dev-value dev-final">
          Type ${e.primaryType} ${c[e.primaryType]}<br/>
          ${e.secondaryType?`(+${e.secondaryType} ${c[e.secondaryType]})<br/>`:``}
          confidence: ${e.confidence}
        </div>
      </div>`)}if(t.instinctualScores.SP+t.instinctualScores.SO+t.instinctualScores.SX>0&&n.push(`<div class="dev-section">
        <div class="dev-label">Instinct Scores</div>
        ${this.renderCenterBar(`SP`,t.instinctualScores.SP)}
        ${this.renderCenterBar(`SO`,t.instinctualScores.SO)}
        ${this.renderCenterBar(`SX`,t.instinctualScores.SX)}
      </div>`),t.instinctualResult){let e=t.instinctualResult;n.push(`<div class="dev-section">
        <div class="dev-label">Instinct Result</div>
        <div class="dev-value dev-final">
          ${i[e.dominant]} — ${e.subtypeTitle}<br/>
          confidence: ${(e.confidence*100).toFixed(0)}%
          ${e.isCountertype?`<br/>⚡ Countertype`:``}
        </div>
      </div>`)}this.content.innerHTML=n.join(``)}renderCenterBar(e,t){return`<div class="dev-bar-row">
      <span class="dev-bar-label">${e}</span>
      <div class="dev-bar-track">
        <div class="dev-bar-fill" style="width:${Math.min(t*20,100)}%"></div>
      </div>
      <span class="dev-bar-num">${t.toFixed(1)}</span>
    </div>`}renderTypeBar(e,t,n){return`<div class="dev-bar-row">
      <span class="dev-bar-label">${e}</span>
      <div class="dev-bar-track">
        <div class="dev-bar-fill" style="width:${n>0?t/n*100:0}%"></div>
      </div>
      <span class="dev-bar-num">${t.toFixed(1)}</span>
    </div>`}};function R(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function z(e,t){return`<span class="tooltip-trigger" tabindex="0">?<span class="tooltip-content" role="tooltip">
    <span class="tooltip-example">${R(e)}</span>
    ${t?`<span class="tooltip-caveat">${R(t)}</span>`:``}
  </span></span>`}function B(){return{phase:`intro`,centerScores:k(),centerResult:null,harmonicScores:m(),harmonicResult:null,inferredType:null,typeScores:S(),mistypeScores:T(),typeResult:null,p2Questions:[],p2Index:0,p1cIndex:0,p4Candidates:[],fearType:null,shadowType:null,finalResult:null,instinctualScores:h(),instinctualResult:null,p5Index:0,p1aPicks:[],p1hPicks:[],selectedVoices:[],choiceLog:[]}}function V(e){let t=[...e];for(let e=t.length-1;e>0;e--){let n=Math.floor(Math.random()*(e+1));[t[e],t[n]]=[t[n],t[e]]}return t}var H=class{constructor(e){this.root=e,this.state=B(),this.shuffledVoices=V(n),this.selectedSupplementary=l(),this.devMode=P(),this.devPanel=null,this.devMode&&(document.body.classList.add(`dev-mode`),this.devPanel=new L),this.render()}render(){switch(this.state.phase){case`intro`:this.renderIntro();break;case`p1a`:this.renderP1A();break;case`p1b`:this.renderP1B();break;case`p1c`:this.renderP1C();break;case`p2`:this.renderP2();break;case`p3`:this.renderP3();break;case`p4fear`:this.renderP4Fear();break;case`p4shadow`:this.renderP4Shadow();break;case`p5instinct`:this.renderP5Instinct();break;case`result`:this.renderResult();break}this.updateDevPanel()}updateDevPanel(){this.devPanel&&this.devPanel.update({phase:this.state.phase,centerScores:this.state.centerScores,centerResult:this.state.centerResult,harmonicScores:this.state.harmonicScores,harmonicResult:this.state.harmonicResult,inferredType:this.state.inferredType,typeScores:this.state.typeScores,mistypeScores:this.state.mistypeScores,typeResult:this.state.typeResult,mistypeResult:this.state.finalResult?.mistypeResult??null,finalResult:this.state.finalResult,instinctualScores:this.state.instinctualScores,instinctualResult:this.state.instinctualResult,p1aPicks:this.state.p1aPicks,p1hPicks:this.state.p1hPicks})}devBadge(e){return this.devMode?`<div class="dev-badge">${e}</div>`:``}setHTML(e){this.root.innerHTML=e}phaseIndicator(e){return`<div class="phase-indicator">
      ${[`Phase 1`,`Phase 2`,`Phase 3`,`Phase 4`,`Phase 5`].map((t,n)=>`<div class="phase-dot ${n<e?`done`:n===e?`active`:``}"></div>`).join(``)}
    </div>`}renderIntro(){this.setHTML(`
      <div class="fade-in" style="text-align:center; padding-top:80px;">
        <h1 style="font-size:28px; font-weight:700; margin-bottom:12px;">내면의 패턴 찾기</h1>
        <p style="font-size:15px; color:#6b6560; margin-bottom:40px; line-height:1.8;">
          누구나 자기만의 방식으로 세상을 경험합니다.<br/>
          정답은 없습니다. 느낌을 따라가면 됩니다.
        </p>
        <button class="btn-next" style="max-width:280px; margin:0 auto;" id="btn-start">시작하기</button>
      </div>
    `),this.root.querySelector(`#btn-start`).addEventListener(`click`,()=>{this.state={...this.state,phase:`p1a`},this.render()})}renderP1A(){let e=this.state.p1aPicks.length,n=b[e],i=V([0,1,2]),a=i.map(e=>n.stories[e]),o=e===0;this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(0)}
        ${o?`<p class="guide-text">
              세 사람이 같은 상황을 겪은 뒤 일기를 썼습니다.<br/>
              천천히 읽어보세요. 그 사람의 <strong>내면이 작동하는 방식</strong>에 주목하세요.<br/>
              "아, 이건 나랑 비슷하다"고 느껴지는 사람을 골라주세요.
            </p>`:`<p class="guide-text">
              이번에는 다른 상황입니다.<br/>
              다시 세 사람의 일기를 읽고, 가장 공감되는 사람을 골라주세요.
            </p>`}
        <div id="stories">
          ${a.map((e,t)=>`
            <div class="story-card" data-idx="${t}">
              ${e.text}
              ${this.devBadge(e.center)}
            </div>
          `).join(``)}
        </div>
        <button class="btn-next" id="btn-next" disabled>다음</button>
      </div>
    `);let s=this.root.querySelectorAll(`.story-card`),c=this.root.querySelector(`#btn-next`);s.forEach(e=>{e.addEventListener(`click`,()=>{s.forEach(e=>e.classList.remove(`selected`)),e.classList.add(`selected`),c.disabled=!1})}),c.addEventListener(`click`,()=>{let n=this.root.querySelector(`.story-card.selected`);if(!n)return;let o=parseInt(n.getAttribute(`data-idx`)),s=a[o].center,c=i[o],l=`a${e+1}${r(c)}`;console.log(`[선택] P1A R${e+1}: ${s} (${l})`);let u=[...this.state.p1aPicks,s],f=d(this.state.centerScores,s),p=[...this.state.choiceLog,l];t(u)?this.state={...this.state,p1aPicks:u,centerScores:f,choiceLog:p}:this.state={...this.state,p1aPicks:u,centerScores:f,choiceLog:p,phase:`p1b`},this.render()})}renderP3(){let t=e[0],n=V([0,1,2]),i=n.map(e=>t.stories[e]);this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(2)}
        <p class="guide-text">
          거의 다 왔습니다. 한 가지만 더 확인해볼게요.<br/>
          힘든 상황에서의 내면 반응을 살펴봅니다.<br/>
          세 사람이 같은 상황을 겪은 뒤 일기를 썼습니다.<br/>
          <strong>스트레스에 대처하는 방식</strong>에 주목하세요.<br/>
          "아, 이건 나랑 비슷하다"고 느껴지는 사람을 골라주세요.
        </p>
        <div id="stories">
          ${i.map((e,t)=>`
            <div class="story-card" data-idx="${t}">
              ${e.text}
              ${this.devBadge(e.harmonic)}
            </div>
          `).join(``)}
        </div>
        <button class="btn-next" id="btn-next" disabled>다음</button>
      </div>
    `);let a=this.root.querySelectorAll(`.story-card`),o=this.root.querySelector(`#btn-next`);a.forEach(e=>{e.addEventListener(`click`,()=>{a.forEach(e=>e.classList.remove(`selected`)),e.classList.add(`selected`),o.disabled=!1})}),o.addEventListener(`click`,()=>{let e=this.root.querySelector(`.story-card.selected`);if(!e)return;let t=parseInt(e.getAttribute(`data-idx`)),a=i[t].harmonic,o=n[t],s=`h${r(o)}`;console.log(`[선택] P3 Harmonic: ${a} (${s})`);let c=w(this.state.harmonicScores,a),l=g(c),u=this.state.centerResult,d=M(u.primary,l.primary),f=[...this.state.choiceLog,s];this.state={...this.state,p1hPicks:[a],harmonicScores:c,harmonicResult:l,inferredType:d,choiceLog:f,phase:`p4fear`},this.render()})}renderP1B(){let e=this.state.centerScores,t=[[`body`,e.body],[`heart`,e.heart],[`head`,e.head]];t.sort((e,t)=>t[1]-e[1]);let r=t[1][1]>t[2][1]?new Set([t[0][0],t[1][0]]):null,i=r?this.shuffledVoices.filter(e=>r.has(e.center)):this.shuffledVoices;this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(0)}
        <p class="guide-text">
          오래전부터 나를 따라다니는 마음의 패턴들입니다.<br/>
          전부 읽어보고, 가장 비슷한 느낌을 받은 것을<br/>
          <strong>순서대로 3개</strong> 골라주세요.<br/>
          <span class="guide-sub">자신을 잘 설명하는 말일 수도, 애써 무시해왔던 말일 수도 있습니다.</span>
        </p>
        <div class="voice-grid" id="voices">
          ${i.map(e=>`
            <div class="voice-card" data-id="${e.id}">
              <div class="voice-title">${e.title}</div>
              <div class="voice-text">${e.text}</div>
              ${this.devBadge(`${e.center} / T${e.typeHint}`)}
            </div>
          `).join(``)}
        </div>
        <div class="selection-count" id="count">0 / 3 선택 (누른 순서 = 우선순위)</div>
        <button class="btn-next" id="btn-next" disabled>다음</button>
      </div>
    `);let a=this.root.querySelectorAll(`.voice-card`),o=this.root.querySelector(`#btn-next`),s=this.root.querySelector(`#count`),c=()=>{let e=this.state.selectedVoices;a.forEach(t=>{let n=parseInt(t.getAttribute(`data-id`)),r=e.indexOf(n);t.classList.toggle(`selected`,r!==-1);let i=t.querySelector(`.priority-badge`);r===-1?i&&i.remove():(i||(i=document.createElement(`div`),i.className=`priority-badge`,t.prepend(i)),i.textContent=String(r+1))}),s.textContent=`${e.length} / 3 선택 (누른 순서 = 우선순위)`,o.disabled=e.length!==3};a.forEach(e=>{e.addEventListener(`click`,()=>{let t=parseInt(e.getAttribute(`data-id`)),n=this.state.selectedVoices;n.indexOf(t)===-1?n.length<3&&(this.state={...this.state,selectedVoices:[...n,t]}):this.state={...this.state,selectedVoices:n.filter(e=>e!==t)},c()})}),o.addEventListener(`click`,()=>{let e=this.state.centerScores,t=this.state.typeScores,r=this.state.mistypeScores,i=[1.5,1,.5];for(let a=0;a<this.state.selectedVoices.length;a++){let o=this.state.selectedVoices[a],s=n.find(e=>e.id===o);e=O(e,s,i[a]),t=C(t,s,i[a]),r=v(r,s.mistype,i[a])}let a=`v${this.state.selectedVoices.join(``)}`;console.log(`[선택] P1B Voices: ${this.state.selectedVoices.map(e=>`v${e}`).join(`, `)} (${a})`);let o=[...this.state.choiceLog,a],s=_(e);s.needsSupplement?this.state={...this.state,centerScores:e,typeScores:t,mistypeScores:r,centerResult:s,choiceLog:o,phase:`p1c`,p1cIndex:0}:this.state={...this.state,centerScores:e,typeScores:t,mistypeScores:r,centerResult:s,choiceLog:o,phase:`p2`,p2Questions:N(s.parallelCenters),p2Index:0},this.render()})}renderP1C(){let e=this.selectedSupplementary[this.state.p1cIndex];if(!e){let e=_(this.state.centerScores);this.state={...this.state,centerResult:e,phase:`p2`,p2Questions:N(e.parallelCenters),p2Index:0},this.render();return}this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(0)}
        <p class="guide-text">조금 더 확인이 필요합니다.</p>
        <p class="question-prompt">${e.prompt}</p>
        <div id="choices">
          ${e.choices.map((e,t)=>`
            <div class="choice-card" data-idx="${t}">${e.text}${this.devBadge(e.center)}</div>
          `).join(``)}
        </div>
        <button class="btn-next" id="btn-next" disabled>다음</button>
      </div>
    `);let t=null,n=this.root.querySelectorAll(`.choice-card`),i=this.root.querySelector(`#btn-next`);n.forEach(e=>{e.addEventListener(`click`,()=>{n.forEach(e=>e.classList.remove(`selected`)),e.classList.add(`selected`),t=parseInt(e.getAttribute(`data-idx`)),i.disabled=!1})}),i.addEventListener(`click`,()=>{if(t===null)return;let n=e.choices[t].center,i=p(this.state.centerScores,n),o=this.state.p1cIndex,s=a[o].variants.findIndex(t=>t.prompt===e.prompt),c=`s${o+1}${s}${r(t)}`;console.log(`[선택] P1C S${o+1}: ${n} (${c})`);let l=[...this.state.choiceLog,c],u=this.state.p1cIndex+1;if(u>=this.selectedSupplementary.length){let e=_(i);this.state={...this.state,centerScores:i,centerResult:e,choiceLog:l,phase:`p2`,p2Questions:N(e.parallelCenters),p2Index:0}}else this.state={...this.state,centerScores:i,choiceLog:l,p1cIndex:u};this.render()})}renderP2(){let e=this.state.p2Questions,t=this.state.p2Index;if(t>=e.length){let e=A(this.state.typeScores);this.state={...this.state,typeResult:e,phase:`p4fear`},this.render();return}let n=e[t],i=e.length,a=n.pickCount,s=V(n.choices),c=a===2?`<p class="guide-text">
          조금 더 구체적으로 들어가 볼게요.<br/>
          비슷한 듯 다른 여섯 가지 내면의 패턴입니다.<br/>
          가장 가까운 것을 <strong>순서대로 2개</strong> 골라주세요.
        </p>`:`<p class="guide-text">
          조금 더 구체적으로 들어가 볼게요.<br/>
          비슷한 듯 다른 세 가지 내면의 패턴입니다.<br/>
          완벽히 일치하지 않아도, 가장 가까운 것을 골라주세요.
        </p>`;this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(1)}
        ${t===0?c:`<p class="guide-text">${t+1} / ${i}</p>`}
        <p class="question-prompt">${R(n.prompt)}</p>
        ${n.guidance?`<p class="guidance-text">${R(n.guidance)}</p>`:``}
        <div id="choices">
          ${s.map((e,t)=>`
            <div class="choice-card" data-idx="${t}">${e.text}${e.example?z(e.example,n.tooltipCaveat):``}${this.devBadge(`T${e.type} ${o[e.type]}`)}</div>
          `).join(``)}
        </div>
        ${a===2?`<div class="selection-count" id="p2-count">0 / 2 선택 (누른 순서 = 우선순위)</div>`:``}
        <button class="btn-next" id="btn-next" disabled>다음</button>
      </div>
    `);let l=[],u=this.root.querySelectorAll(`.choice-card`),d=this.root.querySelector(`#btn-next`),f=this.root.querySelector(`#p2-count`),p=()=>{u.forEach(e=>{let t=parseInt(e.getAttribute(`data-idx`)),n=l.indexOf(t);e.classList.toggle(`selected`,n!==-1);let r=e.querySelector(`.priority-badge`);a===2&&n!==-1?(r||(r=document.createElement(`div`),r.className=`priority-badge`,e.prepend(r)),r.textContent=String(n+1)):r&&r.remove()}),f&&(f.textContent=`${l.length} / 2 선택 (누른 순서 = 우선순위)`),d.disabled=l.length!==a};u.forEach(e=>{e.addEventListener(`click`,()=>{let t=parseInt(e.getAttribute(`data-idx`));a===1?l=[t]:l.indexOf(t)===-1?l.length<a&&(l=[...l,t]):l=l.filter(e=>e!==t),p()})}),d.addEventListener(`click`,()=>{if(l.length!==a)return;let e=y[t].variants.findIndex(e=>e.prompt===n.prompt),i=l.map(e=>{let t=s[e];return r(n.choices.indexOf(t))}).join(``),c=`d${t+1}${e}${i}`;console.log(`[선택] P2 D${t+1}: ${i} (${c})`);let u=this.state.typeScores,d=this.state.centerScores,f=this.state.mistypeScores,p=a===1?[1]:[1,.5];for(let e=0;e<l.length;e++){let t=s[l[e]],r=n.weight*p[e];if(u=D(u,t.type,r),f=v(f,t.mistype,r),a>1){let e=o[t.type];d={...d,[e]:d[e]+r}}}let m=[...this.state.choiceLog,c];this.state={...this.state,typeScores:u,centerScores:d,mistypeScores:f,choiceLog:m,p2Index:t+1},this.render()})}renderP4Fear(){let e=f(this.state.typeScores),t=V(e);this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(3)}
        <p class="guide-text">
          마지막으로 확인해볼게요.<br/>
          조금 불편할 수 있는 질문이지만, 솔직할수록 정확합니다.
        </p>
        <p class="question-prompt">다음 중 가장 견디기 힘든 상황은?</p>
        <div id="choices">
          ${t.map((e,t)=>`
            <div class="choice-card" data-idx="${t}">${e.fear}${this.devBadge(`T${e.type}`)}</div>
          `).join(``)}
        </div>
        <button class="btn-next" id="btn-next" disabled>다음</button>
      </div>
    `);let n=null,i=this.root.querySelectorAll(`.choice-card`),a=this.root.querySelector(`#btn-next`);i.forEach(e=>{e.addEventListener(`click`,()=>{i.forEach(e=>e.classList.remove(`selected`)),e.classList.add(`selected`),n=parseInt(e.getAttribute(`data-idx`)),a.disabled=!1})}),a.addEventListener(`click`,()=>{if(n===null)return;let i=n,a=`f${r(e.findIndex(e=>e.type===t[i].type))}`;console.log(`[선택] P4 Fear: T${t[i].type} (${a})`);let o=[...this.state.choiceLog,a];this.state={...this.state,p4Candidates:e,fearType:t[i].type,choiceLog:o,phase:`p4shadow`},this.render()})}renderP4Shadow(){let e=this.state.p4Candidates,t=V(e);this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(3)}
        <p class="question-prompt">다음 중 솔직하게 인정할 수 있는 패턴은?</p>
        <div id="choices">
          ${t.map((e,t)=>`
            <div class="choice-card" data-idx="${t}">${e.shadow}${this.devBadge(`T${e.type}`)}</div>
          `).join(``)}
        </div>
        <button class="btn-next" id="btn-next" disabled>결과 보기</button>
      </div>
    `);let n=null,i=this.root.querySelectorAll(`.choice-card`),a=this.root.querySelector(`#btn-next`);i.forEach(e=>{e.addEventListener(`click`,()=>{i.forEach(e=>e.classList.remove(`selected`)),e.classList.add(`selected`),n=parseInt(e.getAttribute(`data-idx`)),a.disabled=!1})}),a.addEventListener(`click`,()=>{if(n===null)return;let i=t[n].type,a=`x${r(e.findIndex(e=>e.type===i))}`,o=[...this.state.choiceLog,a],s=x(this.state.typeScores,this.state.fearType,i,this.state.inferredType,this.state.mistypeScores),l=j(o);console.log(`[선택] P4 Shadow: T${i} (${a})`),console.log(`[결과] 응답 코드: ${l}`),console.log(`[결과] 최종 유형: ${s.primaryType} ${c[s.primaryType]} (${s.confidence})`),this.state={...this.state,shadowType:i,finalResult:s,choiceLog:o,phase:`p5instinct`,p5Index:0,instinctualScores:h()},this.render()})}renderP5Instinct(){let e=this.state.finalResult.primaryType,t=s[e],n=this.state.p5Index;if(n>=t.length){let t=u(this.state.instinctualScores,e);console.log(`[결과] 하위본능: ${t.dominant} — ${t.subtypeTitle} (신뢰도: ${t.confidence.toFixed(2)})`),this.state={...this.state,instinctualResult:t,phase:`result`},this.render();return}let i=t[n],a=V(i.choices),o=t.length,c=n===0;this.setHTML(`
      <div class="fade-in">
        ${this.phaseIndicator(4)}
        ${c?`<p class="guide-text">
              유형을 파악했습니다. 마지막으로,<br/>
              에너지가 향하는 방향을 확인해 볼게요.<br/>
              세 가지 내면의 소리 중 가장 공감되는 것을 골라주세요.
            </p>`:`<p class="guide-text">${n+1} / ${o}</p>`}
        <p class="question-prompt">${i.prompt}</p>
        <div id="choices">
          ${a.map((e,t)=>`
            <div class="choice-card" data-idx="${t}">${e.text}${this.devBadge(e.variant)}</div>
          `).join(``)}
        </div>
        <button class="btn-next" id="btn-next" disabled>${n<o-1?`다음`:`결과 보기`}</button>
      </div>
    `);let l=null,d=this.root.querySelectorAll(`.choice-card`),f=this.root.querySelector(`#btn-next`);d.forEach(e=>{e.addEventListener(`click`,()=>{d.forEach(e=>e.classList.remove(`selected`)),e.classList.add(`selected`),l=parseInt(e.getAttribute(`data-idx`)),f.disabled=!1})}),f.addEventListener(`click`,()=>{if(l===null)return;let e=a[l],t=i.choices.findIndex(t=>t.variant===e.variant),o=`i${n+1}${r(t)}`;console.log(`[선택] P5 Instinct ${n+1}: ${e.variant} (${o})`);let s=E(this.state.instinctualScores,e.variant),c=[...this.state.choiceLog,o];this.state={...this.state,instinctualScores:s,choiceLog:c,p5Index:n+1},this.render()})}renderResult(){let e=this.state.finalResult,t=this.state.instinctualResult,r=e.confidence===`high`?`높은 확신`:`보통 확신`,a=j(this.state.choiceLog);t&&`${e.primaryType}${t.dominant}`,this.setHTML(`
      <div class="fade-in result-container">
        <div class="result-type-number">${e.primaryType}</div>
        <div class="result-type-name">${c[e.primaryType]}</div>
        <div class="result-confidence">${r}</div>
        ${e.mistypeResult?.active&&e.mistypeResult.topCandidate?`
          <div class="result-mistype">
            <div class="result-mistype-label">혼동 가능성</div>
            <div class="result-mistype-type">${e.mistypeResult.topCandidate.type}번 — ${c[e.mistypeResult.topCandidate.type]}</div>
            <div class="result-mistype-prob">유사도 ${Math.round(e.mistypeResult.topCandidate.probability*100)}%</div>
            <div class="result-mistype-desc">${e.mistypeResult.topCandidate.label}</div>
          </div>
        `:``}
        ${t?`
          <div class="result-variant">
            <div class="result-variant-label">본능적 변형</div>
            <div class="result-variant-name">${i[t.dominant]}</div>
            <div class="result-subtype-name">${t.subtypeTitle}</div>
            ${t.isCountertype?`<div class="result-countertype-badge">반유형 (Countertype)</div>`:``}
          </div>
        `:``}
        <details class="result-log">
          <summary class="result-log-toggle">응답 기록 보기</summary>
          <div class="result-log-content">
            <code class="result-log-code">${a}</code>
            <a class="result-log-link" href="/parser.html?code=${encodeURIComponent(a)}" target="_blank">해석기에서 보기 →</a>
          </div>
        </details>
        <button class="btn-restart" id="btn-restart">다시 하기</button>
      </div>
    `),this.root.querySelector(`#btn-restart`).addEventListener(`click`,()=>{this.state=B(),this.shuffledVoices=V(n),this.selectedSupplementary=l(),this.render()})}},U=document.getElementById(`app`);U&&new H(U);
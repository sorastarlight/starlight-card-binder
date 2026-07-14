const stage=document.querySelector('.pack-stage');const button=document.getElementById('open-pack-button');
if(stage){stage.insertAdjacentHTML('afterbegin','<div class="magic-circle" aria-hidden="true"></div><div class="magic-ribbons" aria-hidden="true"><i></i><i></i><i></i></div><div class="magic-stars" aria-hidden="true">✦ ✧ ★ ✦ ✧ ★</div>')}
button?.addEventListener('click',()=>{stage?.classList.add('is-opening');setTimeout(()=>stage?.classList.remove('is-opening'),5200)});

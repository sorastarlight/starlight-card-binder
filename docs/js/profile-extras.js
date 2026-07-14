import { getMyProfileExtras, setMyProfileExtras, uploadProfileImage } from './profile-extras-service.js';

const fileInput=document.getElementById('profile-image-file');
const canvas=document.getElementById('profile-image-canvas');
const zoom=document.getElementById('profile-image-zoom');
const saveImage=document.getElementById('save-profile-image');
const preview=document.getElementById('profile-image-preview');
const titleSelect=document.getElementById('collector-title-select');
const achievementGrid=document.getElementById('achievement-grid');
const extrasStatus=document.getElementById('profile-extras-status');
let image=null,scale=1,offsetX=0,offsetY=0,dragging=false,lastX=0,lastY=0,currentAvatar='';
const ctx=canvas?.getContext('2d');
function status(msg,type=''){if(!extrasStatus)return;extrasStatus.textContent=msg;extrasStatus.className=`profile-extras-status ${type}`}
function draw(){if(!ctx||!image)return;ctx.clearRect(0,0,canvas.width,canvas.height);const base=Math.max(canvas.width/image.width,canvas.height/image.height);const s=base*scale;const w=image.width*s,h=image.height*s;ctx.save();ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,canvas.width/2,0,Math.PI*2);ctx.clip();ctx.drawImage(image,(canvas.width-w)/2+offsetX,(canvas.height-h)/2+offsetY,w,h);ctx.restore()}
fileInput?.addEventListener('change',()=>{const file=fileInput.files?.[0];if(!file)return;if(file.size>1048576){status('Please choose an image that is 1 MB or smaller.','error');fileInput.value='';return}if(!file.type.startsWith('image/')){status('Please choose a PNG, JPG, or WebP image.','error');return}const img=new Image();img.onload=()=>{image=img;scale=1;offsetX=0;offsetY=0;zoom.value='1';draw();saveImage.disabled=false;status('Drag to reposition and use the slider to zoom.','success')};img.src=URL.createObjectURL(file)});
zoom?.addEventListener('input',()=>{scale=Number(zoom.value)||1;draw()});
canvas?.addEventListener('pointerdown',e=>{if(!image)return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas?.addEventListener('pointermove',e=>{if(!dragging)return;offsetX+=e.clientX-lastX;offsetY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;draw()});
canvas?.addEventListener('pointerup',()=>dragging=false);canvas?.addEventListener('pointercancel',()=>dragging=false);
saveImage?.addEventListener('click',async()=>{if(!image)return;saveImage.disabled=true;status('Uploading your profile image…');canvas.toBlob(async blob=>{try{if(!blob)throw new Error('Could not prepare the image.');const url=await uploadProfileImage(blob);currentAvatar=url;preview.src=url;preview.classList.remove('hidden');status('Profile image saved!','success')}catch(e){status(e.message||'Upload failed.','error')}finally{saveImage.disabled=false}},'image/webp',.86)});
titleSelect?.addEventListener('change',async()=>{try{await setMyProfileExtras({avatarUrl:currentAvatar||null,titleId:titleSelect.value||null});status('Collector title updated.','success')}catch(e){status(e.message||'Could not update title.','error')}});
(async()=>{try{const data=await getMyProfileExtras();currentAvatar=data.avatarUrl||'';if(currentAvatar){preview.src=currentAvatar;preview.classList.remove('hidden')}titleSelect.innerHTML='<option value="">No collector title</option>'+data.titles.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');titleSelect.value=data.selectedTitleId||'';achievementGrid.innerHTML=data.achievements.length?data.achievements.map(a=>`<article class="achievement-badge"><span>${a.icon}</span><div><strong>${a.name}</strong><small>${a.description}</small></div></article>`).join(''):'<p class="profile-help">Open packs and grow your collection to unlock achievements.</p>'}catch(e){status(e.message||'Could not load profile extras.','error')}})();

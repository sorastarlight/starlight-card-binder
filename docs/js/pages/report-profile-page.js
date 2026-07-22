import {submitProfileReport} from '../moderation-service.js';
const params=new URLSearchParams(location.search);
const username=document.getElementById('username');
const status=document.getElementById('status');
const button=document.getElementById('submit');
const cancel=document.getElementById('report-cancel');
const reported=params.get('username')||'';
username.value=reported;
if(cancel){
  cancel.href=reported
    ?`binder.html?view=collector&username=${encodeURIComponent(reported)}`
    :'binder.html?view=home';
}
document.getElementById('form').addEventListener('submit',async e=>{
  e.preventDefault();
  button.disabled=true;
  status.className='status';
  status.textContent='Submitting report…';
  try{
    await submitProfileReport(username.value,document.getElementById('category').value,document.getElementById('details').value);
    status.className='status success';
    status.textContent='Your report was submitted to the moderation team.';
    e.target.reset();
    username.value=reported;
  }catch(err){
    status.className='status error';
    status.textContent=err.message;
  }finally{
    button.disabled=false;
  }
});

const params=new URLSearchParams(location.search);
    const error=params.get('error')||params.get('error_description');
    const ok=!error;
    if(!ok){
      document.getElementById('title').textContent='Twitch Connection Was Not Completed';
      document.getElementById('message').textContent=error;
    }
    function finish(){
      try{
        if(window.opener&&!window.opener.closed){
          window.opener.postMessage({type:'starlight-twitch-oauth-complete',ok,message:error||''},location.origin);
          window.opener.focus();
          window.close();
          return;
        }
      }catch(_){ }
      location.replace('binder.html?view='+(params.get('flow')==='broadcaster'?'admin-twitch':'profile'));
    }
    document.getElementById('closeButton').addEventListener('click',finish);
    setTimeout(finish,900);


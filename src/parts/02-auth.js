
/* ---------- wallpaper ---------- */
const WALL = '<div class="wall"><i class="w1"></i><i class="w2"></i><i class="w3"></i><i class="w4"></i></div>'

/* ---------- auth screen ---------- */
function authScreen() {
  document.body.innerHTML = `${WALL}<div id="auth">
    <div class="auth-card glass pop-in">
      <div class="auth-logo">${logo(64)}</div>
      <h1>TeleCloud</h1><p class="sub">Unlimited, private cloud storage — powered by your Telegram account.</p>
      <div class="seg glass-inset" id="aseg"><span class="seg-th"></span><button data-m="qr" class="on">${I.qr} QR code</button><button data-m="phone">${I.phone} Phone</button></div>
      <div id="am" class="am"></div><div class="err" id="aerr"></div>
      <div class="feats">
        <div>${I.cloud}<b>Unlimited</b><span>No storage cap</span></div>
        <div>${I.lock}<b>Encrypted</b><span>Optional E2E</span></div>
        <div>${I.device}<b>Everywhere</b><span>Any browser</span></div>
      </div>
    </div>
    <p class="auth-foot">${I.shield} Your login stays in this browser. Files live in a private channel only you can see.</p>
  </div><div id="island"></div>`
  placeSeg($('#aseg'))
  let cancelQr = false
  const err = (e) => { const el = $('#aerr'); el.textContent = e ? errMsg(e).replace(/_/g, ' ') : ''; if (e) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake') } }
  const swapAm = (html) => { const am = $('#am'); am.classList.remove('am-in'); am.innerHTML = html; void am.offsetWidth; am.classList.add('am-in') }
  const done = async () => { cancelQr = true; $('.auth-card').classList.add('pop-out'); await sleep(320); start() }
  const askPassword = async () => {
    cancelQr = true
    const hint = await tg.passwordHint().catch(() => '')
    $('#aseg').classList.add('hidden')
    swapAm(`<p class="sub" style="margin:0 0 14px">Two-step verification is on. Enter your Telegram cloud password.</p>
      <input class="field" id="pw" type="password" placeholder="Password${hint ? ' (hint: ' + esc(hint) + ')' : ''}" autocomplete="current-password" autofocus>
      <button class="btn primary lg" id="go">Continue</button>`)
    const go = async () => { err(); $('#go').disabled = true; $('#go').classList.add('loading'); try { await tg.checkPassword($('#pw').value); done() } catch (e) { err(e); $('#go').disabled = false; $('#go').classList.remove('loading') } }
    $('#go').onclick = go; $('#pw').onkeydown = (e) => { if (e.key === 'Enter') go() }; $('#pw').focus()
  }
  const qr = async () => {
    cancelQr = false
    swapAm(`<div class="qrbox"><canvas id="qc" width="200" height="200"></canvas><div class="qr-sk"></div><div class="ql">${I.telegram}</div></div>
      <ol class="steps"><li>Open <b>Telegram</b> on your phone</li><li>Go to <b>Settings → Devices</b></li><li>Tap <b>Link Desktop Device</b> and scan</li></ol>`)
    const c = $('#qc')
    try {
      const r = await tg.qrLogin((url) => { if (c.isConnected) QRCode.toCanvas(c, url, { width: 200, margin: 0, errorCorrectionLevel: 'H' }, () => c.parentNode && c.parentNode.classList.add('ready')) }, () => cancelQr)
      if (r === 'ok') done(); else if (r === 'password') askPassword()
    } catch (e) { if (!cancelQr) err(e) }
  }
  const phone = () => {
    cancelQr = true
    swapAm(`<input class="field" id="ph" type="tel" placeholder="+880 1XXX XXXXXX" autocomplete="tel" autofocus>
      <button class="btn primary lg" id="go">Send code</button>`)
    const send = async () => {
      err(); const num = $('#ph').value.replace(/[^\d+]/g, ''); if (num.length < 8) return err({ message: 'Enter your phone number with country code' })
      $('#go').disabled = true; $('#go').classList.add('loading')
      try {
        const { phoneCodeHash, isCodeViaApp } = await tg.sendCode(num)
        swapAm(`<p class="sub" style="margin:0 0 14px">We sent a code ${isCodeViaApp ? 'to your <b>Telegram app</b>' : 'by SMS'} for ${esc(num)}.</p>
          <input class="field code" id="cd" inputmode="numeric" autocomplete="one-time-code" placeholder="• • • • •" autofocus>
          <button class="btn primary lg" id="go">Sign in</button>`)
        const signin = async () => {
          err(); $('#go').disabled = true; $('#go').classList.add('loading')
          try { const r = await tg.signIn(num, phoneCodeHash, $('#cd').value.trim()); r === 'ok' ? done() : askPassword() } catch (e) { err(e); $('#go').disabled = false; $('#go').classList.remove('loading') }
        }
        $('#go').onclick = signin; $('#cd').oninput = (e) => { if (e.target.value.replace(/\D/g, '').length >= 5) signin() }; $('#cd').focus()
      } catch (e) { err(e); $('#go').disabled = false; $('#go').classList.remove('loading') }
    }
    $('#go').onclick = send; $('#ph').onkeydown = (e) => { if (e.key === 'Enter') send() }; $('#ph').focus()
  }
  $$('#aseg button').forEach((b) => b.onclick = () => {
    $$('#aseg button').forEach((x) => x.classList.toggle('on', x === b)); placeSeg($('#aseg')); err()
    b.dataset.m === 'qr' ? qr() : phone()
  })
  qr()
}

/* sliding thumb for segmented controls */
function placeSeg(seg) {
  if (!seg) return
  const th = $('.seg-th', seg), on = $('button.on', seg); if (!th) return
  if (!on) { th.style.opacity = 0; return }
  th.style.opacity = 1; th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft}px)`
}

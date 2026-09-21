/* ============================================================
   RSVP · Chapter V · The Honor of a Reply
   ------------------------------------------------------------
   Runs the form on /rsvp:
     · one row per guest (name · ceremony/reception pick · eight or under)
     · song suggestions, email for the confirmation, an optional note
     · a live tally, a draft that survives a refresh, and a closed state
       after the first of February
   Replies POST to /api/rsvp, which relays them to the Google Sheet
   and sends the emails.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('rsvpReply');
  if (!form) return;

  /* ---------- Settings ---------- */
  // Replies close at the end of 1 February 2027, Central time (06:00 UTC on the 2nd).
  var CLOSE_AT = Date.UTC(2027, 1, 2, 6, 0, 0);
  var ENDPOINT = '/api/rsvp';
  var DRAFT_KEY = 'bb.rsvp.draft';
  var SENT_KEY = 'bb.rsvp.sent';
  var MAX_GUESTS = 12;
  var MAX_SONGS = 6;

  var ATTEND_LABEL = {
    both: 'Ceremony & Reception',
    ceremony: 'Ceremony only',
    reception: 'Reception only',
    none: 'Regretfully unable'
  };

  /* ---------- Elements ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var guestList = $('guestList');
  var songList = $('songList');
  var guestTpl = $('guestRowTpl');
  var songTpl = $('songRowTpl');
  var addGuestBtn = $('addGuest');
  var addSongBtn = $('addSong');
  var liveSummary = $('liveSummary');
  var formError = $('formError');
  var submitBtn = $('submitBtn');
  var emailInput = $('rsvpEmail');
  var noteInput = $('rsvpNote');
  var doneBox = $('rsvpDone');
  var closedBox = $('rsvpClosed');
  var returning = $('rsvpReturning');
  var intro = $('rsvpIntro');

  var storage = (function () {
    try { var t = '__t'; localStorage.setItem(t, t); localStorage.removeItem(t); return localStorage; }
    catch (e) { return null; }
  })();
  function load(key) {
    if (!storage) return null;
    try { return JSON.parse(storage.getItem(key)); } catch (e) { return null; }
  }
  function save(key, value) {
    if (!storage) return;
    try { storage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function clear(key) {
    if (!storage) return;
    try { storage.removeItem(key); } catch (e) {}
  }

  var guestSeq = 0;

  /* ---------- Guests ---------- */
  function addGuest(data, opts) {
    if (guestList.children.length >= MAX_GUESTS) return null;
    var row = guestTpl.content.firstElementChild.cloneNode(true);
    var id = 'g' + (++guestSeq);
    var nameInput = row.querySelector('input[name="guestName"]');
    var nameLabel = row.querySelector('.guest-name label');
    nameInput.id = id + '-name';
    nameLabel.setAttribute('for', nameInput.id);

    var radios = row.querySelectorAll('.guest-attend input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].name = id + '-attend';
      radios[i].id = id + '-' + radios[i].value;
    }
    var child = row.querySelector('input[name="child"]');
    child.id = id + '-child';

    if (data) {
      nameInput.value = data.name || '';
      if (data.attend) {
        var r = row.querySelector('.guest-attend input[value="' + data.attend + '"]');
        if (r) r.checked = true;
      }
      child.checked = !!data.child;
    }

    row.querySelector('.guest-remove').addEventListener('click', function () {
      if (guestList.children.length <= 1) return;
      var next = row.nextElementSibling || row.previousElementSibling;
      row.parentNode.removeChild(row);
      renumber();
      refresh();
      if (next) { var f = next.querySelector('input[name="guestName"]'); if (f) f.focus(); }
    });

    guestList.appendChild(row);
    renumber();
    syncRow(row);
    if (!(opts && opts.silent)) {
      refresh();
      nameInput.focus();
    }
    return row;
  }

  function renumber() {
    var rows = guestList.children;
    for (var i = 0; i < rows.length; i++) {
      rows[i].querySelector('.guest-index').textContent = String(i + 1);
      rows[i].classList.toggle('is-only', rows.length === 1);
    }
    addGuestBtn.hidden = rows.length >= MAX_GUESTS;
  }

  function syncRow(row) {
    var pick = row.querySelector('.guest-attend input:checked');
    var declined = !!pick && pick.value === 'none';
    row.classList.toggle('is-declined', declined);
    var child = row.querySelector('input[name="child"]');
    if (declined) { child.checked = false; child.disabled = true; }
    else { child.disabled = false; }
  }

  function readGuests() {
    var out = [];
    var rows = guestList.children;
    for (var i = 0; i < rows.length; i++) {
      var pick = rows[i].querySelector('.guest-attend input:checked');
      out.push({
        row: rows[i],
        name: rows[i].querySelector('input[name="guestName"]').value.trim(),
        attend: pick ? pick.value : '',
        child: rows[i].querySelector('input[name="child"]').checked
      });
    }
    return out;
  }

  /* ---------- Songs ---------- */
  function addSong(value, opts) {
    if (songList.children.length >= MAX_SONGS) return null;
    var row = songTpl.content.firstElementChild.cloneNode(true);
    var input = row.querySelector('input[name="song"]');
    var label = row.querySelector('label');
    input.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    label.setAttribute('for', input.id);
    if (value) input.value = value;
    row.querySelector('.song-remove').addEventListener('click', function () {
      if (songList.children.length <= 1) { input.value = ''; saveDraft(); return; }
      row.parentNode.removeChild(row);
      renumberSongs();
      saveDraft();
    });
    songList.appendChild(row);
    renumberSongs();
    if (!(opts && opts.silent)) input.focus();
    return row;
  }
  function renumberSongs() {
    var rows = songList.children;
    for (var i = 0; i < rows.length; i++) rows[i].classList.toggle('is-only', rows.length === 1);
    addSongBtn.hidden = rows.length >= MAX_SONGS;
  }
  function readSongs() {
    var out = [];
    var inputs = songList.querySelectorAll('input[name="song"]');
    for (var i = 0; i < inputs.length; i++) {
      var v = inputs[i].value.trim();
      if (v) out.push(v);
    }
    return out;
  }

  /* ---------- Tally · summary ---------- */
  function tally(guests) {
    var t = { ceremony: 0, reception: 0, little: 0, declined: 0, named: 0 };
    for (var i = 0; i < guests.length; i++) {
      var g = guests[i];
      if (!g.name && !g.attend) continue;
      t.named++;
      if (g.attend === 'both' || g.attend === 'ceremony') t.ceremony++;
      if (g.attend === 'both' || g.attend === 'reception') t.reception++;
      if (g.attend === 'none') t.declined++;
      if (g.child && g.attend && g.attend !== 'none') t.little++;
    }
    return t;
  }

  function refresh() {
    var guests = readGuests();
    var t = tally(guests);

    // Live tally beneath the form
    var parts = [];
    if (t.ceremony) parts.push('<span class="n">' + t.ceremony + '</span> at the ceremony');
    if (t.reception) parts.push('<span class="n">' + t.reception + '</span> at the reception');
    if (t.little) parts.push('<span class="n">' + t.little + '</span> eight or under');
    if (t.declined && !t.ceremony && !t.reception) parts.push('<span class="n">' + t.declined + '</span> sending regrets');
    liveSummary.innerHTML = parts.length ? parts.join('<span class="dot">&middot;</span>') : '';

    saveDraft();
  }


  /* ---------- Draft ---------- */
  var draftTimer = null;
  function currentPayload() {
    var guests = readGuests().map(function (g) { return { name: g.name, attend: g.attend, child: g.child }; });
    return {
      guests: guests,
      songs: readSongs(),
      email: emailInput.value.trim(),
      note: noteInput.value.trim()
    };
  }
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { save(DRAFT_KEY, currentPayload()); }, 250);
  }
  function fill(data) {
    guestList.innerHTML = '';
    songList.innerHTML = '';
    var guests = (data && data.guests && data.guests.length) ? data.guests : [null];
    for (var i = 0; i < guests.length; i++) addGuest(guests[i], { silent: true });
    var songs = (data && data.songs && data.songs.length) ? data.songs : [''];
    for (var j = 0; j < songs.length; j++) addSong(songs[j], { silent: true });
    emailInput.value = (data && data.email) || '';
    noteInput.value = (data && data.note) || '';
    refresh();
  }

  /* ---------- Validation ---------- */
  function setFieldError(el, msg) {
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function validate() {
    var firstBad = null;
    var guests = readGuests();
    var live = [];
    var guestsError = '';

    for (var i = 0; i < guests.length; i++) {
      var g = guests[i];
      var nameField = g.row.querySelector('.guest-name');
      var attend = g.row.querySelector('.guest-attend');
      nameField.classList.remove('has-error');
      attend.classList.remove('has-error');

      var blank = !g.name && !g.attend;
      if (blank && guests.length > 1) continue;      // an untouched extra row is simply ignored

      if (!g.name) {
        nameField.classList.add('has-error');
        guestsError = 'Please give us a name for each guest.';
        if (!firstBad) firstBad = nameField.querySelector('input');
      }
      if (!g.attend) {
        attend.classList.add('has-error');
        guestsError = guestsError || 'Please tell us which part of the day each guest will join.';
        if (!firstBad) firstBad = attend.querySelector('input');
      }
      if (g.name && g.attend) live.push(g);
    }
    if (!guestsError && !live.length) {
      guestsError = 'Please add at least one guest.';
      firstBad = firstBad || guestList.querySelector('input[name="guestName"]');
    }
    setFieldError($('guestsError'), guestsError);

    var email = emailInput.value.trim();
    var emailError = '';
    var emailField = emailInput.closest('.rsvp-field');
    emailField.classList.remove('has-error');
    if (!email) emailError = 'We need an email address to send your confirmation.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) emailError = 'That email address does not look quite right.';
    if (emailError) {
      emailField.classList.add('has-error');
      if (!firstBad) firstBad = emailInput;
    }
    setFieldError($('emailError'), emailError);

    return { ok: !firstBad, focus: firstBad, guests: live };
  }

  /* ---------- Submit ---------- */
  function setSending(on) {
    submitBtn.classList.toggle('is-sending', on);
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.hidden = true;

    if (Date.now() >= CLOSE_AT && !previewOpen()) { showClosed(); return; }

    var v = validate();
    if (!v.ok) {
      if (v.focus) { v.focus.focus(); try { v.focus.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) {} }
      return;
    }

    var payload = {
      email: emailInput.value.trim(),
      note: noteInput.value.trim(),
      guests: v.guests.map(function (g) { return { name: g.name, attend: g.attend, child: g.child && g.attend !== 'none' }; }),
      songs: readSongs(),
      website: form.elements['website'] ? form.elements['website'].value : '',
      sentAt: new Date().toISOString()
    };

    setSending(true);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (r.status === 410) { showClosed(); return; }
        if (!r.ok || !body.ok) throw new Error(body.error || 'send-failed');
        save(SENT_KEY, { at: payload.sentAt, id: body.id || '', payload: payload });
        clear(DRAFT_KEY);
        showDone(payload);
      });
    }).catch(function () {
      formError.innerHTML = 'Something kept your reply from sending. Please try once more, or write to us at '
        + '<a href="mailto:laurarestumm@gmail.com?subject=RSVP">laurarestumm@gmail.com</a> and we will record it by hand.';
      formError.hidden = false;
      formError.focus && formError.focus();
    }).then(function () { setSending(false); });
  });

  /* ---------- States ---------- */
  function firstNames(guests) {
    var names = [];
    for (var i = 0; i < guests.length; i++) {
      var n = (guests[i].name || '').trim().split(/\s+/)[0];
      if (n) names.push(n);
    }
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' & ' + names[1];
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }

  function showDone(payload) {
    form.hidden = true;
    returning.hidden = true;
    closedBox.hidden = true;
    if (intro) intro.hidden = true;

    var names = firstNames(payload.guests);
    $('doneTitle').textContent = names ? 'Thank you, ' + names : 'Thank you';
    $('doneEmail').textContent = payload.email;

    var list = $('doneList');
    list.innerHTML = '';
    for (var i = 0; i < payload.guests.length; i++) {
      var g = payload.guests[i];
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = g.name;
      if (g.child && g.attend !== 'none') {
        var little = document.createElement('span');
        little.className = 'little';
        little.textContent = 'eight or under';
        name.appendChild(little);
      }
      var status = document.createElement('span');
      status.className = 'status' + (g.attend === 'none' ? '' : ' in');
      status.textContent = ATTEND_LABEL[g.attend] || '';
      li.appendChild(name);
      li.appendChild(status);
      list.appendChild(li);
    }

    var extra = $('doneExtra');
    var t = tally(payload.guests);
    if (t.reception > 0) {
      extra.textContent = 'We will see you at Crestview Country Club. Cocktails at half past five.';
      extra.hidden = false;
    } else if (t.ceremony > 0) {
      extra.textContent = 'We will see you at Central Community Church at four o\u2019clock.';
      extra.hidden = false;
    } else {
      extra.textContent = 'You will be missed. Thank you for letting us know.';
      extra.hidden = false;
    }

    doneBox.hidden = false;
    doneBox.focus();
    try { doneBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
  }


  function showClosed() {
    form.hidden = true;
    doneBox.hidden = true;
    returning.hidden = true;
    if (intro) intro.hidden = true;
    closedBox.hidden = false;
  }

  function previewOpen() {
    return /[?&]open=1(&|$)/.test(window.location.search);
  }

  $('editReply').addEventListener('click', function () {
    var sent = load(SENT_KEY);
    var data = (sent && sent.payload) || load(DRAFT_KEY);
    fill(data);
    doneBox.hidden = true;
    if (intro) intro.hidden = false;
    if (sent && sent.at) {
      var d = new Date(sent.at);
      $('returningDate').textContent = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      returning.hidden = false;
    }
    form.hidden = false;
    var first = guestList.querySelector('input[name="guestName"]');
    if (first) first.focus();
    try { form.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
  });

  /* ---------- Wiring ---------- */
  addGuestBtn.addEventListener('click', function () { addGuest(); });
  addSongBtn.addEventListener('click', function () { addSong(); });

  form.addEventListener('change', function (e) {
    var row = e.target.closest && e.target.closest('.guest-row');
    if (row) syncRow(row);
    refresh();
  });
  form.addEventListener('input', function (e) {
    if (e.target.name === 'guestName') refresh(); else saveDraft();
  });

  // Enter inside a guest name moves to the next row instead of submitting.
  guestList.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.name === 'guestName') {
      e.preventDefault();
      var row = e.target.closest('.guest-row');
      var next = row && row.nextElementSibling;
      if (next) next.querySelector('input[name="guestName"]').focus();
      else if (!addGuestBtn.hidden) addGuest();
    }
  });

  /* ---------- Boot ---------- */
  if (Date.now() >= CLOSE_AT && !previewOpen()) {
    showClosed();
    return;
  }

  var sent = load(SENT_KEY);
  if (sent && sent.payload && sent.payload.guests && sent.payload.guests.length) {
    fill(sent.payload);
    showDone(sent.payload);
    doneBox.blur();
  } else {
    fill(load(DRAFT_KEY));
  }
})();

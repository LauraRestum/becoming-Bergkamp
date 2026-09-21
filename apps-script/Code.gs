/* ============================================================
   Becoming Bergkamp · RSVP relay · Google Apps Script
   ------------------------------------------------------------
   Lives inside the Google Sheet that collects replies
   (Extensions · Apps Script). Receives each reply from the site's
   /api/rsvp function, writes it to the Sheet, and sends the emails.

   One-time setup (about ten minutes):
     1. Make a new Google Sheet. Name it whatever you like.
     2. Extensions · Apps Script. Delete the sample code, paste this file.
     3. Fill in SECRET and NOTIFY_TO below.
     4. Run the function `setup` once (choose it in the toolbar, press Run,
        approve the permissions). It builds the Guests, Replies and Summary tabs.
     5. Deploy · New deployment · type "Web app".
          Execute as: Me
          Who has access: Anyone
        Copy the web app URL (ends in /exec).
     6. In Vercel · your project · Settings · Environment Variables, add
          RSVP_WEBHOOK_URL = that URL
          RSVP_SECRET      = the same SECRET as below
        and redeploy the site.
     7. Optional: run `testReply` here to drop a sample row in and check
        that the two emails arrive. Delete the sample rows afterwards.

   If you ever edit this file again, you must Deploy · Manage deployments ·
   edit · New version, or the site keeps talking to the old copy.
   ============================================================ */

var SECRET = 'paste-a-long-random-string-here';          // same value as RSVP_SECRET in Vercel
var NOTIFY_TO = ['laurarestumm@gmail.com', 'william@example.com']; // who hears about every reply
var REPLY_TO = 'laurarestumm@gmail.com';                 // guest confirmations reply here
var SENDER_NAME = 'Laura & William';
var SITE = 'https://becoming-bergkamp.vercel.app';

var SHEET_GUESTS = 'Guests';
var SHEET_REPLIES = 'Replies';
var SHEET_SUMMARY = 'Summary';

var ATTEND_LABEL = {
  both: 'Ceremony & Reception',
  ceremony: 'Ceremony only',
  reception: 'Reception only',
  none: 'Regretfully unable'
};

var GUEST_HEADERS = [
  'Received', 'Reply ID', 'Party Email', 'Guest', 'Attending',
  'Ceremony', 'Reception', '8 or Under', 'Plates', 'Motorcoach', 'Seats',
  'Songs', 'Note', 'Current'
];
var REPLY_HEADERS = [
  'Received', 'Reply ID', 'Party Email', 'Guests', 'Ceremony', 'Reception',
  '8 or Under', 'Plates', 'Motorcoach', 'Seats', 'Songs', 'Note', 'Current'
];

/* ---------- Web app entry points ---------- */

function doGet() {
  return json({ ok: true, service: 'becoming-bergkamp-rsvp' });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad-json' });
  }
  if (!data || data.secret !== SECRET) {
    return json({ ok: false, error: 'forbidden' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(ss);
    var reply = normalize(data);
    supersedeEarlier(ss, reply.email);
    writeReply(ss, reply);
  } finally {
    lock.releaseLock();
  }

  // Emails go out after the Sheet is safe. A mail hiccup should not lose the row.
  try { notifyCouple(reply); } catch (err) { console.error('notifyCouple failed: ' + err); }
  try { confirmGuest(reply); } catch (err) { console.error('confirmGuest failed: ' + err); }

  return json({ ok: true, id: reply.id });
}

/* ---------- Shaping the reply ---------- */

function normalize(data) {
  var guests = (data.guests || []).map(function (g) {
    var attend = ATTEND_LABEL[g.attend] ? g.attend : 'none';
    var ceremony = attend === 'both' || attend === 'ceremony';
    var reception = attend === 'both' || attend === 'reception';
    var child = attend !== 'none' && g.child === true;
    return {
      name: String(g.name || '').trim(),
      attend: attend,
      label: ATTEND_LABEL[attend],
      ceremony: ceremony,
      reception: reception,
      child: child,
      plates: reception ? (child ? 0.5 : 1) : 0
    };
  }).filter(function (g) { return g.name; });

  var receptionCount = guests.filter(function (g) { return g.reception; }).length;
  var transport = receptionCount > 0 ? (data.transport === 'yes' ? 'Yes' : (data.transport === 'no' ? 'No' : '')) : '';
  var seats = transport === 'Yes' ? receptionCount : 0;

  return {
    id: String(data.id || ('R-' + Date.now().toString(36).toUpperCase())),
    received: data.receivedAt ? new Date(data.receivedAt) : new Date(),
    email: String(data.email || '').trim().toLowerCase(),
    guests: guests,
    ceremonyCount: guests.filter(function (g) { return g.ceremony; }).length,
    receptionCount: receptionCount,
    childCount: guests.filter(function (g) { return g.reception && g.child; }).length,
    plates: guests.reduce(function (n, g) { return n + g.plates; }, 0),
    transport: transport,
    seats: seats,
    songs: (data.songs || []).map(function (s) { return String(s).trim(); }).filter(Boolean),
    note: String(data.note || '').trim()
  };
}

/* ---------- Sheet writes ---------- */

function ensureSheets(ss) {
  if (!ss.getSheetByName(SHEET_GUESTS) || !ss.getSheetByName(SHEET_REPLIES) || !ss.getSheetByName(SHEET_SUMMARY)) {
    setup();
  }
}

function supersedeEarlier(ss, email) {
  if (!email) return;
  [SHEET_GUESTS, SHEET_REPLIES].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    var last = sh.getLastRow();
    if (last < 2) return;
    var emailCol = 3;
    var currentCol = name === SHEET_GUESTS ? GUEST_HEADERS.length : REPLY_HEADERS.length;
    var emails = sh.getRange(2, emailCol, last - 1, 1).getValues();
    var current = sh.getRange(2, currentCol, last - 1, 1).getValues();
    var changed = false;
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).toLowerCase() === email && current[i][0] === 'Yes') {
        current[i][0] = 'No';
        changed = true;
      }
    }
    if (changed) sh.getRange(2, currentCol, last - 1, 1).setValues(current);
  });
}

function writeReply(ss, r) {
  var guests = ss.getSheetByName(SHEET_GUESTS);
  var songs = r.songs.join(' · ');
  var rows = r.guests.map(function (g, i) {
    return [
      r.received, r.id, r.email, g.name, g.label,
      g.ceremony ? 'Yes' : 'No',
      g.reception ? 'Yes' : 'No',
      g.child ? 'Yes' : 'No',
      g.plates,
      g.reception ? r.transport : '',
      g.reception && r.transport === 'Yes' ? 1 : 0,
      i === 0 ? songs : '',
      i === 0 ? r.note : '',
      'Yes'
    ];
  });
  if (rows.length) {
    guests.getRange(guests.getLastRow() + 1, 1, rows.length, GUEST_HEADERS.length).setValues(rows);
  }

  var replies = ss.getSheetByName(SHEET_REPLIES);
  replies.appendRow([
    r.received, r.id, r.email,
    r.guests.map(function (g) { return g.name; }).join(', '),
    r.ceremonyCount, r.receptionCount, r.childCount, r.plates,
    r.transport, r.seats, songs, r.note, 'Yes'
  ]);
}

/* ---------- Emails ---------- */

function notifyCouple(r) {
  var names = r.guests.map(function (g) { return g.name; }).join(', ');
  var attending = r.guests.filter(function (g) { return g.attend !== 'none'; }).length;
  var subject = 'RSVP · ' + names + ' · ' + (attending ? attending + ' attending' : 'regrets');

  var lines = r.guests.map(function (g) {
    return '<tr><td style="padding:6px 12px 6px 0;">' + esc(g.name) + (g.child ? ' <em style="color:#777;">(8 or under)</em>' : '') + '</td>'
      + '<td style="padding:6px 0;color:#555;">' + g.label + '</td></tr>';
  }).join('');

  var html = wrap(
    '<p style="margin:0 0 18px;font-size:13px;letter-spacing:0.3em;text-transform:uppercase;color:#888;">New reply · ' + esc(r.id) + '</p>'
    + '<table style="border-collapse:collapse;font-size:16px;">' + lines + '</table>'
    + '<p style="margin:22px 0 4px;">Ceremony: <strong>' + r.ceremonyCount + '</strong> &nbsp;·&nbsp; Reception: <strong>' + r.receptionCount + '</strong>'
    + (r.childCount ? ' &nbsp;·&nbsp; Eight or under: <strong>' + r.childCount + '</strong>' : '')
    + ' &nbsp;·&nbsp; Plates: <strong>' + r.plates + '</strong></p>'
    + (r.songs.length ? '<p style="margin:14px 0 4px;">Songs: ' + esc(r.songs.join(' · ')) + '</p>' : '')
    + (r.note ? '<p style="margin:14px 0 4px;padding:12px 16px;border-left:2px solid #b89149;background:#faf7f0;">' + esc(r.note).replace(/\n/g, '<br>') + '</p>' : '')
    + '<p style="margin:22px 0 0;color:#777;font-size:14px;">From ' + esc(r.email) + ' &nbsp;·&nbsp; <a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '" style="color:#b89149;">Open the Sheet</a></p>'
  );

  MailApp.sendEmail({
    to: NOTIFY_TO.join(','),
    replyTo: r.email,
    subject: subject,
    htmlBody: html,
    name: 'Becoming Bergkamp RSVP'
  });
}

function confirmGuest(r) {
  if (!r.email) return;
  var firsts = firstNames(r.guests);
  var attending = r.guests.filter(function (g) { return g.attend !== 'none'; }).length;

  var lines = r.guests.map(function (g) {
    return '<tr><td style="padding:6px 12px 6px 0;">' + esc(g.name) + (g.child ? ' <em style="color:#777;">(eight or under)</em>' : '') + '</td>'
      + '<td style="padding:6px 0;color:#555;">' + g.label + '</td></tr>';
  }).join('');

  var html = wrap(
    '<p style="margin:0 0 18px;font-size:13px;letter-spacing:0.3em;text-transform:uppercase;color:#888;">The honor of a reply</p>'
    + '<p style="margin:0 0 18px;font-size:18px;">' + (attending ? 'Thank you, ' + esc(firsts) + '. We have your reply and we cannot wait to see you.' : 'Thank you, ' + esc(firsts) + '. We are sorry you cannot join us, and grateful you let us know.') + '</p>'
    + '<table style="border-collapse:collapse;font-size:16px;">' + lines + '</table>'
    + (r.songs.length ? '<p style="margin:18px 0 0;">Noted for the playlist: ' + esc(r.songs.join(' · ')) + '</p>' : '')
    + '<p style="margin:22px 0 0;color:#666;font-size:14px;">Plans change? Reply again at <a href="' + SITE + '/rsvp" style="color:#b89149;">' + SITE.replace('https://', '') + '/rsvp</a> from this same email address and we will keep your latest. Replies close on the first of February.</p>'
    + '<p style="margin:22px 0 0;">With all our love,<br>Laura &amp; William</p>'
    + '<p style="margin:18px 0 0;color:#888;font-size:13px;">Saturday, the twentieth of March, two thousand twenty seven &nbsp;·&nbsp; Wichita, Kansas</p>'
  );

  MailApp.sendEmail({
    to: r.email,
    replyTo: REPLY_TO,
    subject: 'Your reply is received · Laura & William · 20 March 2027',
    htmlBody: html,
    name: SENDER_NAME
  });
}

function wrap(inner) {
  return '<div style="background:#f5f5f5;padding:32px 16px;font-family:Georgia,\'Times New Roman\',serif;color:#111;line-height:1.6;">'
    + '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e0e0e0;padding:36px 32px;">'
    + '<p style="margin:0 0 26px;text-align:center;font-size:20px;letter-spacing:0.24em;color:#111;">LBR &middot; WJB</p>'
    + inner
    + '</div></div>';
}

function firstNames(guests) {
  var names = guests.map(function (g) { return g.name.split(/\s+/)[0]; }).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + ' & ' + names[1];
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- One-time setup and a test ---------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var guests = ss.getSheetByName(SHEET_GUESTS) || ss.insertSheet(SHEET_GUESTS);
  if (guests.getLastRow() === 0) {
    guests.appendRow(GUEST_HEADERS);
    styleHeader(guests, GUEST_HEADERS.length);
    guests.setColumnWidth(1, 150);
    guests.setColumnWidth(4, 200);
    guests.setColumnWidth(5, 170);
    guests.setColumnWidth(12, 220);
    guests.setColumnWidth(13, 260);
    guests.getRange('A2:A').setNumberFormat('mmm d, yyyy h:mm am/pm');
  }

  var replies = ss.getSheetByName(SHEET_REPLIES) || ss.insertSheet(SHEET_REPLIES);
  if (replies.getLastRow() === 0) {
    replies.appendRow(REPLY_HEADERS);
    styleHeader(replies, REPLY_HEADERS.length);
    replies.setColumnWidth(1, 150);
    replies.setColumnWidth(4, 260);
    replies.setColumnWidth(11, 220);
    replies.setColumnWidth(12, 260);
    replies.getRange('A2:A').setNumberFormat('mmm d, yyyy h:mm am/pm');
  }

  var summary = ss.getSheetByName(SHEET_SUMMARY) || ss.insertSheet(SHEET_SUMMARY);
  if (summary.getLastRow() === 0) {
    var rows = [
      ['Becoming Bergkamp · RSVP Summary', ''],
      ['Counts only the current reply from each household.', ''],
      ['', ''],
      ['Households replied', '=COUNTIF(Replies!M:M,"Yes")'],
      ['Guests replied', '=COUNTIF(Guests!N:N,"Yes")'],
      ['Attending the ceremony', '=COUNTIFS(Guests!F:F,"Yes",Guests!N:N,"Yes")'],
      ['Attending the reception', '=COUNTIFS(Guests!G:G,"Yes",Guests!N:N,"Yes")'],
      ['Reception guests 8 or under', '=COUNTIFS(Guests!G:G,"Yes",Guests!H:H,"Yes",Guests!N:N,"Yes")'],
      ['Catering plates (8 and under at half)', '=SUMIFS(Guests!I:I,Guests!N:N,"Yes")'],
      ['Motorcoach seats', '=SUMIFS(Guests!K:K,Guests!N:N,"Yes")'],
      ['Regrets', '=COUNTIFS(Guests!E:E,"Regretfully unable",Guests!N:N,"Yes")'],
      ['', ''],
      ['Songs suggested', '=COUNTIFS(Guests!L:L,"<>",Guests!N:N,"Yes")'],
      ['Last reply received', '=IF(COUNTA(Replies!A:A)>1,MAX(Replies!A:A),"")']
    ];
    summary.getRange(1, 1, rows.length, 2).setValues(rows);
    summary.getRange('A1').setFontSize(14).setFontWeight('bold');
    summary.getRange('A2').setFontStyle('italic').setFontColor('#666666');
    summary.getRange('B4:B13').setHorizontalAlignment('right').setFontWeight('bold');
    summary.getRange('B14').setNumberFormat('mmm d, yyyy h:mm am/pm').setHorizontalAlignment('right');
    summary.setColumnWidth(1, 300);
    summary.setColumnWidth(2, 140);
  }

  ss.setActiveSheet(summary);
  ss.moveActiveSheet(1);
}

function styleHeader(sheet, cols) {
  var h = sheet.getRange(1, 1, 1, cols);
  h.setFontWeight('bold').setBackground('#111111').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

// Drops a sample reply in and sends both emails, so you can check the plumbing
// without touching the website. Delete the sample rows afterwards.
function testReply() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        secret: SECRET,
        id: 'R-TEST01',
        receivedAt: new Date().toISOString(),
        email: NOTIFY_TO[0],
        guests: [
          { name: 'Test Guest', attend: 'both', child: false },
          { name: 'Test Partner', attend: 'reception', child: false },
          { name: 'Test Little One', attend: 'both', child: true }
        ],
        transport: 'yes',
        songs: ['September, Earth Wind & Fire'],
        note: 'This is a test reply from the Apps Script editor.'
      })
    }
  };
  var out = doPost(fake);
  Logger.log(out.getContent());
}

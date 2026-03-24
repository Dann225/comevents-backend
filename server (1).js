// ═══════════════════════════════════════════════════════
// ComEvents CRM — Serveur Backend Twilio Voice
// Déployer sur Render.com (gratuit)
// ⚠️ Les clés sont dans les variables d'environnement UNIQUEMENT
// ═══════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const twilio  = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));

// ── Identifiants Twilio — DEPUIS LES VARIABLES D'ENVIRONNEMENT UNIQUEMENT ──
const ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN;
const PHONE_NUMBER  = process.env.TWILIO_PHONE_NUMBER;
const TWIML_APP_SID = process.env.TWIML_APP_SID || '';

if(!ACCOUNT_SID || !AUTH_TOKEN || !PHONE_NUMBER){
  console.error('❌ Variables manquantes: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
}

// ── Route santé ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ComEvents Twilio Backend' });
});

// ── Générer token Twilio Voice pour le navigateur ───────
app.get('/token', (req, res) => {
  try {
    const agentId    = req.query.agent || 'agent_default';
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant  = AccessToken.VoiceGrant;

    const token = new AccessToken(ACCOUNT_SID, AUTH_TOKEN, AUTH_TOKEN, {
      identity: agentId,
      ttl: 3600
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWIML_APP_SID || undefined,
      incomingAllow: true
    });
    token.addGrant(voiceGrant);

    res.json({ token: token.toJwt(), identity: agentId, numero: PHONE_NUMBER });
  } catch(e) {
    console.error('[Token]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── TwiML — Appel sortant ────────────────────────────────
app.post('/voice/outgoing', (req, res) => {
  const to = req.body.To || req.query.To;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if(to){
    const dial = twiml.dial({ callerId: PHONE_NUMBER });
    if(to.startsWith('client:')){
      dial.client(to.replace('client:',''));
    } else {
      dial.number(to);
    }
  } else {
    twiml.say({ language: 'fr-FR' }, 'Bienvenue chez ComEvents.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ── TwiML — Appel entrant ────────────────────────────────
app.post('/voice/incoming', (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const dial = twiml.dial({ timeout: 20 });
  dial.client('agent_default');
  res.type('text/xml');
  res.send(twiml.toString());
});

// ── Statut d'appel ───────────────────────────────────────
app.post('/voice/status', (req, res) => {
  console.log(`[Statut] ${req.body.CallStatus} | ${req.body.From} → ${req.body.To}`);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ComEvents Backend démarré sur port ${PORT}`);
});

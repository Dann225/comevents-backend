require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const twilio  = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));

const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID  || '';
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN   || '';
const PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+13185836464';
const TWIML_APP_SID= process.env.TWIML_APP_SID       || 'AP123d1955a9a6b79c21ca09566fb1701b';

// Route santé
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ComEvents Twilio Backend', numero: PHONE_NUMBER });
});

// Token Twilio Voice
app.get('/token', (req, res) => {
  try {
    if(!ACCOUNT_SID || !AUTH_TOKEN){
      return res.status(500).json({ error: 'Variables TWILIO manquantes sur Render' });
    }
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant  = AccessToken.VoiceGrant;
    const agentId     = req.query.agent || 'agent_default';

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

// Appel sortant
app.post('/voice/outgoing', (req, res) => {
  const to = req.body.To || req.query.To;
  const twiml = new twilio.twiml.VoiceResponse();
  if(to){
    const dial = twiml.dial({ callerId: PHONE_NUMBER });
    to.startsWith('client:') ? dial.client(to.replace('client:','')) : dial.number(to);
  } else {
    twiml.say({ language: 'fr-FR' }, 'Bienvenue chez ComEvents.');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

// Appel entrant
app.post('/voice/incoming', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const dial  = twiml.dial({ timeout: 20 });
  dial.client('agent_default');
  res.type('text/xml');
  res.send(twiml.toString());
});

// Statut
app.post('/voice/status', (req, res) => {
  console.log(`[Statut] ${req.body.CallStatus} | ${req.body.From} -> ${req.body.To}`);
  res.sendStatus(200);
});

// Démarrage — PORT obligatoire pour Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ComEvents Backend démarré sur port ${PORT}`);
});

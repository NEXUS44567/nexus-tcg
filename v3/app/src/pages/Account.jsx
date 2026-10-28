import React, { useEffect, useMemo, useRef, useState } from 'react';
import { href, useData, useNow } from '../lib/hooks.js';
import { useStore } from '../lib/store.js';
import { fmtDate, fmtNum, fmtShort } from '../lib/data.js';
import { collectionValue } from '../lib/coll.js';
import { toast } from '../lib/toast.js';
import {
  useCloud, cloudOn, providers, signIn, signUp, signInWith, signOut, resetPassword, resendConfirmation, pseudoFree,
  changePassword, changePseudo, deleteAccount, syncNow, isDirty, dismissRecovery, cleanPseudo, clearLinkError,
} from '../lib/cloud.js';
import { Seg } from '../ui/Kit.jsx';
import { LogoMark, Emblem } from '../ui/Brand.jsx';
import Icon from '../ui/Icon.jsx';

// Compte NEXUS : connexion, inscription, carte de membre et état de la sauvegarde en ligne.

const PROVIDERS = { google: 'Google', discord: 'Discord', github: 'GitHub', apple: 'Apple', facebook: 'Facebook', twitch: 'Twitch' };

export default function AccountPage() {
  const c = useCloud();
  if (!cloudOn()) return <Closed />;
  if (c.user && c.recovery) return <div className="page account-page"><NewPassword /></div>;
  return c.user ? <Profile /> : <Welcome />;
}

// Chiffres de la progression (sur cet appareil, ou dans le compte une fois connecté)
function useProgress() {
  const d = useData();
  const coll = useStore((s) => s.collection);
  const opened = useStore((s) => Object.values(s.wallet || {}).reduce((n, w) => n + (w?.opened || 0), 0) || s.packs?.opened || 0);
  const ach = useStore((s) => Object.keys(s.achievements || {}).length);
  const watch = useStore((s) => Object.keys(s.watch || {}).length);
  const wallet = useStore((s) => s.wallet);
  const value = useMemo(() => (d.ready ? collectionValue(coll, d) : null), [coll, d.ready, d.v]);
  const cards = coll.reduce((n, e) => n + (e.qty || 0), 0);
  return { cards, value, opened, ach, watch, wallet };
}

// Carte de membre holographique (aperçu pendant l'inscription, vraie carte une fois connecté)
function MemberCard({ pseudo, since, code, stats, preview }) {
  const name = pseudo || 'Ton pseudo';
  return (
    <div className={'member' + (preview ? ' preview' : '')} data-tilt>
      <div className="member-in">
        <div className="member-top">
          <LogoMark size={28} />
          <span>NEXUS TCG<small>Carte de membre</small></span>
          <em>{code ? 'N° ' + code : 'N° ······'}</em>
        </div>
        <div className="member-id">
          <span className="member-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase() || '?'}</span>
          <div>
            <b className={'member-name' + (pseudo ? '' : ' blank')}>{name}</b>
            <small>{since ? 'Membre depuis ' + fmtDate(since, { month: 'long', year: 'numeric' }) : 'Collectionneur One Piece et Pokémon'}</small>
          </div>
        </div>
        <div className="member-stats">
          {stats.map(([v, l]) => <span key={l}><b>{v}</b><small>{l}</small></span>)}
        </div>
        <div className="member-foot">
          <span className="member-chip" aria-hidden="true" />
          <span className="member-emb"><Emblem game="onepiece" size={26} /><Emblem game="pokemon" size={26} /></span>
        </div>
      </div>
      <i className="member-holo" aria-hidden="true" />
    </div>
  );
}

const statsOf = (p) => [
  [fmtNum(p.cards), p.cards > 1 ? 'cartes' : 'carte'],
  [p.value ? fmtShort(p.value.total) : '—', 'de valeur'],
  [fmtNum(p.opened), p.opened > 1 ? 'boosters' : 'booster'],
  [fmtNum(p.ach), 'succès'],
];

// ---------- Pas encore de serveur de comptes ----------
function Closed() {
  return (
    <div className="page account-page">
      <div className="acc-hero">
        <div className="kicker">Compte NEXUS</div>
        <h1 className="page-title">Les comptes <span className="grad">arrivent bientôt</span></h1>
        <p className="lead">En attendant, ta collection, tes boosters et tes succès sont enregistrés dans ce navigateur. Dès l’ouverture des comptes, tout ce que tu as déjà fait ici rejoindra ton compte.</p>
        <div className="row"><a className="btn primary" href={href('/collection')}><Icon name="album" size={18} />Ma collection</a><a className="btn ghost" href={href('/reglages')}><Icon name="download" size={18} />Exporter une sauvegarde</a></div>
      </div>
    </div>
  );
}

// ---------- Connexion et inscription ----------
function Welcome() {
  const c = useCloud();
  const p = useProgress();
  const [mode, setMode] = useState('signup');
  const [pseudo, setPseudo] = useState('');
  const [sent, setSent] = useState(null); // { kind: 'confirm' | 'reset', email }
  useEffect(() => { if (c.expired) setMode('login'); }, [c.expired]);
  const has = p.cards || p.opened || p.ach;
  return (
    <div className="page account-page">
      <div className="acc-hero">
        <div className="kicker">Compte NEXUS · gratuit</div>
        <h1 className="page-title">Ta progression, <span className="grad">partout avec toi</span></h1>
        <p className="lead">Crée ton compte pour retrouver ta collection, tes boosters, ton classeur et tes succès sur ton téléphone comme sur ton ordinateur.</p>
      </div>
      <div className="acc-grid">
        <section className="panel pad acc-card glow-edge" aria-label="Connexion">
          {c.linkError && <p className="notice">{c.linkError}</p>}
          {c.expired && !c.linkError && <p className="notice soft">Ta session a expiré. Reconnecte-toi : ce que tu as fait entre-temps sera envoyé dans ton compte.</p>}
          {sent ? <Sent sent={sent} back={() => { setSent(null); setMode('login'); }} /> : (
            <>
              {mode !== 'forgot' && <Seg value={mode} onChange={setMode} label="Connexion ou inscription" options={[['signup', 'Créer un compte'], ['login', 'Se connecter']]} />}
              {mode === 'signup' && <SignupForm pseudo={pseudo} setPseudo={setPseudo} onSent={(email) => setSent({ kind: 'confirm', email })} />}
              {mode === 'login' && <LoginForm forgot={() => setMode('forgot')} />}
              {mode === 'forgot' && <ForgotForm back={() => setMode('login')} onSent={(email) => setSent({ kind: 'reset', email })} />}
              {mode !== 'forgot' && providers().length > 0 && (
                <div className="acc-oauth">
                  <span className="acc-or">ou</span>
                  {providers().map((pv) => <button key={pv} type="button" className="btn ghost block" onClick={() => signInWith(pv)}><Icon name="user" size={18} />Continuer avec {PROVIDERS[pv] || pv}</button>)}
                </div>
              )}
            </>
          )}
        </section>
        <aside className="acc-pitch">
          <MemberCard pseudo={mode === 'signup' ? cleanPseudo(pseudo) || pseudo.trim() : ''} stats={statsOf(p)} preview />
          <ul className="acc-perks">
            <li><Icon name="cloud" size={20} /><span><b>Sauvegarde automatique</b>Chaque carte ajoutée, chaque booster ouvert part dans ton compte en quelques secondes.</span></li>
            <li><Icon name="swap" size={20} /><span><b>Sur tous tes appareils</b>Connecte-toi ailleurs : ta collection et ton classeur sont déjà là.</span></li>
            <li><Icon name="trophy" size={20} /><span><b>Ton pseudo te suit</b>Jusque dans le classement des collectionneurs.</span></li>
            <li><Icon name="sparkle" size={20} /><span><b>Rien n’est perdu</b>{has ? `Ce que tu as déjà fait ici (${fmtNum(p.cards)} carte${p.cards > 1 ? 's' : ''}, ${fmtNum(p.opened)} booster${p.opened > 1 ? 's' : ''}) rejoint ton compte dès la connexion.` : 'Ce que tu as déjà fait sur cet appareil rejoint ton compte dès la connexion.'}</span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Field({ icon, label, children, hint, state }) {
  return (
    <label className={'acc-field' + (state ? ' ' + state : '')}>
      <span>{label}</span>
      <span className="acc-input"><Icon name={icon} size={18} />{children}</span>
      {hint && <small className="acc-hint">{hint}</small>}
    </label>
  );
}
function Password({ value, onChange, autoComplete = 'current-password', label = 'Mot de passe', hint, state }) {
  const [show, setShow] = useState(false);
  return (
    <Field icon="lock" label={label} hint={hint} state={state}>
      <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} maxLength={72} />
      <button type="button" className="acc-eye" onClick={() => setShow(!show)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}><Icon name={show ? 'eyeoff' : 'eye'} size={18} /></button>
    </Field>
  );
}
// Force du mot de passe : longueur, puis variété des caractères
function strength(pw) {
  if (pw.length < 8) return 1;
  let s = 2;
  if (pw.length >= 12) s++;
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s++;
  if (/[^a-z0-9]/i.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return Math.min(4, s);
}
const STRENGTH = ['', 'Trop court', 'Correct', 'Solide', 'Excellent'];
function Meter({ pw }) {
  if (!pw) return null;
  const s = strength(pw);
  return <span className={'acc-meter s' + s} aria-live="polite"><i /><i /><i /><i /><small>{pw.length < 8 ? `Encore ${8 - pw.length} caractère${8 - pw.length > 1 ? 's' : ''}` : STRENGTH[s]}</small></span>;
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = (fn) => async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true); setErr(''); clearLinkError();
    try { await fn(); } catch (x) { setErr(x.message || 'Une erreur est survenue.'); } finally { setBusy(false); }
  };
  return { busy, err, setErr, run };
}

function SignupForm({ pseudo, setPseudo, onSent }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [free, setFree] = useState(null); // null · 'checking' · true · false
  const { busy, err, setErr, run } = useSubmit();
  const clean = cleanPseudo(pseudo);
  useEffect(() => {
    setFree(null);
    if (!clean) return;
    let ok = true; setFree('checking');
    const t = setTimeout(() => pseudoFree(clean).then((v) => ok && setFree(v)), 450);
    return () => { ok = false; clearTimeout(t); };
  }, [clean]);
  const submit = run(async () => {
    if (!clean) { setErr('Ton pseudo doit faire entre 2 et 20 caractères.'); return; }
    if (free === false) { setErr('Ce pseudo est déjà pris : choisis-en un autre.'); return; }
    if (pw.length < 8) { setErr('Ton mot de passe doit faire au moins 8 caractères.'); return; }
    const r = await signUp({ email, password: pw, pseudo: clean });
    if (r.confirm) onSent(email.trim());
  });
  const pState = !clean ? '' : free === false ? 'bad' : free === true ? 'good' : '';
  return (
    <form className="acc-form" onSubmit={submit} noValidate>
      <Field icon="user" label="Pseudo" state={pState} hint={free === false ? 'Déjà pris : essaie une variante.' : free === true ? 'Disponible !' : 'Visible dans le classement. Évite ton vrai nom.'}>
        <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="Ex. RoiDesPirates" required />
        {free === 'checking' && <span className="acc-spin" aria-hidden="true" />}
        {free === true && <Icon name="check" size={18} className="acc-ok" />}
      </Field>
      <Field icon="mail" label="E-mail" hint="Il sert seulement à te connecter et à retrouver ton mot de passe.">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="toi@exemple.fr" required />
      </Field>
      <Password value={pw} onChange={setPw} autoComplete="new-password" />
      <Meter pw={pw} />
      {err && <p className="notice" role="alert">{err}</p>}
      <button className="btn primary big block" disabled={busy}>{busy ? <><span className="acc-spin" />Création du compte…</> : <><Icon name="sparkle" size={19} />Créer mon compte</>}</button>
    </form>
  );
}

function LoginForm({ forgot }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const { busy, err, run } = useSubmit();
  const submit = run(() => signIn({ email, password: pw }));
  return (
    <form className="acc-form" onSubmit={submit}>
      <Field icon="mail" label="E-mail">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="toi@exemple.fr" required />
      </Field>
      <Password value={pw} onChange={setPw} />
      <button type="button" className="link small acc-forgot" onClick={forgot}>Mot de passe oublié ?</button>
      {err && <p className="notice" role="alert">{err}</p>}
      <button className="btn primary big block" disabled={busy}>{busy ? <><span className="acc-spin" />Connexion…</> : <><Icon name="user" size={19} />Se connecter</>}</button>
    </form>
  );
}

function ForgotForm({ back, onSent }) {
  const [email, setEmail] = useState('');
  const { busy, err, run } = useSubmit();
  const submit = run(async () => { await resetPassword(email); onSent(email.trim()); });
  return (
    <form className="acc-form" onSubmit={submit}>
      <h2 className="acc-h">Mot de passe oublié</h2>
      <p className="muted small">Indique l’adresse de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.</p>
      <Field icon="mail" label="E-mail">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="toi@exemple.fr" required autoFocus />
      </Field>
      {err && <p className="notice" role="alert">{err}</p>}
      <button className="btn primary big block" disabled={busy}>{busy ? <><span className="acc-spin" />Envoi…</> : <><Icon name="mail" size={19} />Recevoir le lien</>}</button>
      <button type="button" className="link small" onClick={back}><Icon name="left" size={15} />Retour à la connexion</button>
    </form>
  );
}

function Sent({ sent, back }) {
  const [again, setAgain] = useState('');
  const resend = async () => {
    try { if (sent.kind === 'confirm') await resendConfirmation(sent.email); else await resetPassword(sent.email); setAgain('Nouvel e-mail envoyé.'); }
    catch (e) { setAgain(e.message); }
  };
  return (
    <div className="acc-sent">
      <span className="acc-sent-ico"><Icon name="mail" size={30} /></span>
      <h2 className="acc-h">Vérifie ta boîte mail</h2>
      <p className="muted">{sent.kind === 'confirm'
        ? <>Un lien de confirmation vient de partir à <b>{sent.email}</b>. Clique dessus : ton compte s’ouvrira directement ici.</>
        : <>Si un compte existe avec <b>{sent.email}</b>, un lien pour choisir un nouveau mot de passe vient de partir.</>}</p>
      <p className="faint small">Rien reçu après quelques minutes ? Regarde dans les indésirables.</p>
      <div className="row center">
        <button className="btn ghost small" onClick={resend}><Icon name="refresh" size={16} />Renvoyer l’e-mail</button>
        <button className="btn ghost small" onClick={back}><Icon name="user" size={16} />Se connecter</button>
      </div>
      {again && <p className="ok-msg small">{again}</p>}
    </div>
  );
}

function NewPassword({ inline }) {
  const [pw, setPw] = useState('');
  const { busy, err, run } = useSubmit();
  const [done, setDone] = useState(false);
  const submit = run(async () => {
    if (pw.length < 8) throw new Error('Ton mot de passe doit faire au moins 8 caractères.');
    await changePassword(pw); setPw(''); setDone(true);
    toast('Ton nouveau mot de passe est enregistré.', { icon: 'lock' });
  });
  return (
    <form className={inline ? 'acc-form' : 'panel pad acc-card glow-edge acc-form acc-narrow'} onSubmit={submit}>
      {!inline && <><div className="kicker">Compte NEXUS</div><h1 className="acc-h big">Choisis un nouveau mot de passe</h1></>}
      <Password value={pw} onChange={setPw} autoComplete="new-password" label="Nouveau mot de passe" />
      <Meter pw={pw} />
      {err && <p className="notice" role="alert">{err}</p>}
      {done && inline && <p className="ok-msg small">Mot de passe changé.</p>}
      <div className="row">
        <button className="btn primary" disabled={busy || !pw}>{busy ? <><span className="acc-spin" />Enregistrement…</> : <><Icon name="lock" size={18} />Enregistrer</>}</button>
        {!inline && <button type="button" className="btn ghost" onClick={dismissRecovery}>Plus tard</button>}
      </div>
    </form>
  );
}

// ---------- Connecté ----------
function ago(t, now) {
  if (!t) return '';
  const s = Math.max(0, Math.round((now - new Date(t)) / 1000));
  if (s < 10) return 'à l’instant';
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return 'le ' + fmtDate(t, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}
export const STATUS = {
  idle: ['check', 'Tout est enregistré dans ton compte'],
  dirty: ['cloud', 'Changements en attente d’envoi…'],
  sync: ['refresh', 'Enregistrement en cours…'],
  offline: ['cloudoff', 'Hors ligne : l’envoi reprendra dès le retour du réseau'],
  error: ['info', 'La sauvegarde n’a pas pu être envoyée'],
  off: ['user', 'Non connecté'],
};

function SyncPanel() {
  const c = useCloud();
  const now = useNow();
  const [st, txt] = STATUS[c.status] || STATUS.idle;
  return (
    <section className={'panel pad acc-sync st-' + c.status} aria-live="polite">
      <span className="acc-sync-ico"><Icon name={st} size={22} /></span>
      <div>
        <b>{txt}</b>
        <small>{c.status === 'error' ? c.error : c.at ? 'Dernier enregistrement ' + ago(c.at, now) : 'Synchronisation automatique activée'}</small>
      </div>
      <button className="btn ghost small" onClick={() => syncNow()} disabled={c.status === 'sync'}><Icon name="refresh" size={16} />Synchroniser</button>
    </section>
  );
}

function Profile() {
  const c = useCloud();
  const p = useProgress();
  const user = c.user;
  const pseudo = c.pseudo || '';
  const code = user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const coins = (g) => p.wallet?.[g]?.coins;
  return (
    <div className="page account-page">
      <div className="acc-hero">
        <div className="kicker">Mon compte</div>
        <h1 className="page-title">{pseudo ? <>Salut, <span className="grad">{pseudo}</span></> : <>Ton <span className="grad">compte</span></>}</h1>
        <p className="lead">Tout ce que tu fais sur NEXUS est enregistré dans ton compte et te suit sur tous tes appareils.</p>
      </div>
      <div className="acc-grid profile">
        <div className="acc-col">
          <MemberCard pseudo={pseudo || user.meta?.pseudo || user.email?.split('@')[0]} since={user.created_at} code={code} stats={statsOf(p)} />
          <SyncPanel />
          <section className="panel pad acc-saved">
            <h2 className="acc-h"><Icon name="cloud" size={20} />Enregistré dans ton compte</h2>
            <div className="acc-saved-grid">
              <a href={href('/collection')}><b>{fmtNum(p.cards)}</b><small>carte{p.cards > 1 ? 's' : ''} en collection</small></a>
              <a href={href('/boosters')}><b>{fmtNum(p.opened)}</b><small>booster{p.opened > 1 ? 's' : ''} ouvert{p.opened > 1 ? 's' : ''}</small></a>
              <a href={href('/succes')}><b>{fmtNum(p.ach)}</b><small>succès</small></a>
              <a href={href('/suivis')}><b>{fmtNum(p.watch)}</b><small>alerte{p.watch > 1 ? 's' : ''} de prix</small></a>
              <a href={href('/boutique?u=onepiece')}><b>{coins('onepiece') != null ? fmtNum(coins('onepiece')) : '—'}</b><small>Berrys</small></a>
              <a href={href('/boutique?u=pokemon')}><b>{coins('pokemon') != null ? fmtNum(coins('pokemon')) : '—'}</b><small>Pokéballs</small></a>
            </div>
            <p className="faint small">Le classeur, l’historique des boosters, le comparateur et la langue des cartes sont aussi enregistrés. Les effets visuels et les sons restent propres à chaque appareil.</p>
          </section>
        </div>
        <div className="acc-col">
          <PseudoPanel current={pseudo} />
          <section className="panel pad acc-block">
            <h2 className="acc-h"><Icon name="mail" size={20} />Connexion</h2>
            <p className="muted small">{user.provider === 'email' ? <>Tu te connectes avec <b>{user.email}</b>.</> : <>Tu te connectes avec {PROVIDERS[user.provider] || user.provider}{user.email ? <> (<b>{user.email}</b>)</> : null}.</>}</p>
            {user.provider === 'email' && <details className="acc-details"><summary><Icon name="lock" size={17} />Changer de mot de passe</summary><NewPassword inline /></details>}
          </section>
          <LogoutPanel />
          <DeletePanel pseudo={pseudo} />
        </div>
      </div>
    </div>
  );
}

function PseudoPanel({ current }) {
  const [v, setV] = useState(current);
  const { busy, err, run } = useSubmit();
  const [ok, setOk] = useState(false);
  useEffect(() => setV(current), [current]);
  const submit = run(async () => { setOk(false); await changePseudo(v); setOk(true); });
  const missing = !current;
  return (
    <section className={'panel pad acc-block' + (missing ? ' glow-edge acc-need' : '')}>
      <h2 className="acc-h"><Icon name="user" size={20} />{missing ? 'Choisis ton pseudo' : 'Pseudo'}</h2>
      {missing && <p className="muted small">Il apparaîtra sur ta carte de membre et dans le classement des collectionneurs.</p>}
      <form className="acc-inline" onSubmit={submit}>
        <span className="acc-input"><Icon name="user" size={18} /><input value={v} onChange={(e) => { setV(e.target.value); setOk(false); }} maxLength={20} autoComplete="nickname" aria-label="Pseudo" placeholder="Ton pseudo" /></span>
        <button className="btn primary" disabled={busy || !cleanPseudo(v) || cleanPseudo(v) === current}>{busy ? <span className="acc-spin" /> : 'Enregistrer'}</button>
      </form>
      {err && <p className="notice" role="alert">{err}</p>}
      {ok && <p className="ok-msg small">Pseudo enregistré.</p>}
    </section>
  );
}

function LogoutPanel() {
  const [warn, setWarn] = useState(false);
  const [busy, setBusy] = useState(false);
  const out = async (force) => {
    setBusy(true);
    try { await signOut({ force }); toast('Tu es déconnecté. Ta progression t’attend dans ton compte.', { icon: 'logout' }); location.hash = '#/compte'; }
    catch (e) { if (e.code === 'dirty') setWarn(true); else toast(e.message, { icon: 'info' }); }
    finally { setBusy(false); }
  };
  return (
    <section className="panel pad acc-block">
      <h2 className="acc-h"><Icon name="logout" size={20} />Se déconnecter</h2>
      <p className="muted small">Ta progression reste dans ton compte. Cet appareil repart d’une collection vide jusqu’à ta prochaine connexion.</p>
      {!warn ? <button className="btn ghost" onClick={() => out(false)} disabled={busy}>{busy ? <span className="acc-spin" /> : <Icon name="logout" size={18} />}Se déconnecter</button> : (
        <div className="acc-confirm">
          <p className="notice">{isDirty() ? 'Tes derniers changements n’ont pas pu être envoyés (pas de réseau ?). Si tu te déconnectes maintenant, ils seront perdus.' : 'Tout est maintenant enregistré.'}</p>
          <div className="row"><button className="btn danger" onClick={() => out(true)} disabled={busy}>Me déconnecter quand même</button><button className="btn ghost" onClick={() => { setWarn(false); syncNow(); }}>Réessayer l’envoi</button></div>
        </div>
      )}
    </section>
  );
}

function DeletePanel({ pseudo }) {
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const { busy, err, run } = useSubmit();
  const word = 'SUPPRIMER';
  const submit = run(async () => { await deleteAccount(); toast('Ton compte et sa sauvegarde ont été supprimés.', { icon: 'trash' }); location.hash = '#/compte'; });
  return (
    <section className="panel pad acc-block">
      <h2 className="acc-h danger-h"><Icon name="trash" size={20} />Supprimer mon compte</h2>
      {!open ? <button className="btn danger" onClick={() => setOpen(true)}>Supprimer mon compte…</button> : (
        <form className="acc-form" onSubmit={submit}>
          <p className="muted small">Ton compte{pseudo ? ` « ${pseudo} »` : ''} et toute sa sauvegarde seront effacés définitivement, sur tous tes appareils. Pense à exporter ta collection avant si tu veux la garder.</p>
          <Field icon="trash" label={`Pour confirmer, écris ${word}`}><input value={txt} onChange={(e) => setTxt(e.target.value)} autoComplete="off" /></Field>
          {err && <p className="notice" role="alert">{err}</p>}
          <div className="row"><button className="btn danger" disabled={busy || txt.trim().toUpperCase() !== word}>{busy ? <span className="acc-spin" /> : <Icon name="trash" size={18} />}Supprimer définitivement</button><button type="button" className="btn ghost" onClick={() => { setOpen(false); setTxt(''); }}>Annuler</button></div>
        </form>
      )}
    </section>
  );
}

// ---------- Bouton de la barre du haut ----------
export function AccountButton() {
  const c = useCloud();
  if (!cloudOn()) return null;
  const name = c.pseudo || c.user?.meta?.pseudo || c.user?.email || '';
  const label = c.user ? `Mon compte (${STATUS[c.status]?.[1] || ''})` : 'Se connecter ou créer un compte';
  return (
    <a className={'icon-btn acc-btn' + (c.user ? ' in st-' + c.status : '')} href={href('/compte')} aria-label={label} title={c.user ? name : 'Se connecter'}>
      {c.user ? <span className="acc-av" aria-hidden="true">{name.charAt(0).toUpperCase()}</span> : <Icon name="user" />}
      {c.user && <i className="acc-dot" aria-hidden="true" />}
    </a>
  );
}

// Encart du menu latéral
export function AccountDrawer({ tab }) {
  const c = useCloud();
  if (!cloudOn()) return null;
  if (!c.user) return (
    <a className="drawer-acc out" href={href('/compte')} tabIndex={tab}>
      <span className="acc-av big"><Icon name="user" size={22} /></span>
      <span><b>Se connecter</b><small>Crée ton compte pour tout sauvegarder</small></span>
      <Icon name="right" size={16} />
    </a>
  );
  const name = c.pseudo || c.user.meta?.pseudo || c.user.email || '';
  return (
    <a className={'drawer-acc st-' + c.status} href={href('/compte')} tabIndex={tab}>
      <span className="acc-av big">{name.charAt(0).toUpperCase()}<i className="acc-dot" /></span>
      <span><b>{name}</b><small>{STATUS[c.status]?.[1]}</small></span>
      <Icon name="right" size={16} />
    </a>
  );
}

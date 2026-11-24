import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, BadgeCheck, Check, ChevronDown, ChevronUp,
  CircleHelp, Download, ExternalLink, FileDown, Menu, MessageSquareQuote,
  MonitorSmartphone, ShieldCheck, Sparkles, Star, WalletCards, X, Zap
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
const dateLabel = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const initials = name => (name || 'U').slice(0, 1).toUpperCase();

function Brand({ app }) {
  return <a className="brand" href="#home">
    {app?.iconUrl ? <img className="brand-icon" src={app.iconUrl} alt="Udhaar Desk" /> : <img className="brand-mark" src="/icon.png" alt="Udhaar Desk" />}
    <span>{app?.appName || 'Udhaar Desk'}<small>APP DOWNLOAD</small></span>
  </a>;
}

function Stars({ value = 0, size = 16, interactive = false, onChange }) {
  return <span className={`stars ${interactive ? 'interactive' : ''}`} aria-label={`${value} out of 5 stars`}>
    {[1,2,3,4,5].map(n => <button type="button" key={n} disabled={!interactive} onClick={() => onChange?.(n)} aria-label={`${n} stars`}>
      <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
    </button>)}
  </span>;
}

function App() {
  const [app, setApp] = useState(null);
  const [stats, setStats] = useState({ downloads: 0, reviews: 0, averageRating: 0 });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminOpen, setAdminOpen] = useState(location.pathname.replace(/\/+$/, '') === '/admin');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  async function load() {
    const startedAt = Date.now();
    try {
      const [a, r] = await Promise.all([request('/api/app'), request('/api/reviews')]);
      setApp(a.app); setStats(a.stats); setReviews(r.reviews || []); setError('');
    } catch (e) { setError(e.message); }
    finally {
      const remaining = Math.max(0, 700 - (Date.now() - startedAt));
      window.setTimeout(() => setLoading(false), remaining);
    }
  }
  useEffect(() => {
    load();
    const onRouteChange = () => setAdminOpen(location.pathname.replace(/\/+$/, '') === '/admin');
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
      const progressBar = document.querySelector('.scroll-progress span');
      if (progressBar) progressBar.style.width = `${progress}%`;
      const sections = ['home', 'features', 'screenshots', 'reviews', 'faq', 'download'];
      let current = 'home';
      for (const id of sections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 180) current = id;
      }
      setActiveSection(current);
    };
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.section, .feature-card, .preview-inner, .download-card, .review-layout, .faq-wrap, .strip-grid, .footer-grid, .ledger-workspace').forEach(element => {
      element.classList.add('reveal');
      revealObserver.observe(element);
    });

    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('scroll', onScroll);
      revealObserver.disconnect();
    };
  }, []);

  async function submitReview(e) {
    e.preventDefault(); setNotice(''); setSubmitting(true);
    try {
      const result = await request('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, review })
      });
      setNotice(result.message); setName(''); setReview(''); setRating(5);
    } catch (e) { setNotice(e.message); }
    finally { setSubmitting(false); }
  }

  const average = Number(stats.averageRating || 0).toFixed(1);
  if (adminOpen) return <Admin onClose={() => { history.pushState({}, '', '/'); setAdminOpen(false); }} onUpdated={load} />;
  if (loading) return <PageLoader />;

  return <div className="site-shell">
    <div className="scroll-progress" aria-hidden="true"><span /></div>
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-wrap">
        <Brand app={app}/>
        <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
        <nav className={mobileMenu ? 'nav-links show' : 'nav-links'}>
          <a className={activeSection === 'features' ? 'active' : ''} href="#features" onClick={() => setMobileMenu(false)}>Features</a>
          <a className={activeSection === 'screenshots' ? 'active' : ''} href="#screenshots" onClick={() => setMobileMenu(false)}>How it works</a>
          <a className={activeSection === 'reviews' ? 'active' : ''} href="#reviews" onClick={() => setMobileMenu(false)}>Reviews</a>
          <a className={activeSection === 'faq' ? 'active' : ''} href="#faq" onClick={() => setMobileMenu(false)}>Support</a>
          <a className="nav-download" href="#download"><Download size={16}/> Download Udhaar</a>
        </nav>
      </div>
    </header>

    <main>
      <section className="hero container" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> CREDIT MANAGEMENT FOR INDIAN STORES</div>
          <h1>Udhaar ka hisaab.<br/><span>Hamesha clear.</span></h1>
          <p className="hero-lead">{app?.tagline || 'A credit and payment system built for kirana stores.'} Add transactions in seconds, know exactly how much is pending, and send a professional reminder without awkward follow-ups.</p>
          <div className="hero-actions">
            <a className="primary-btn" href="#download"><ArrowDownToLine size={18}/> Get the Android app <ArrowRight size={16}/></a>
            <a className="text-btn" href="#screenshots">See how it works <ArrowRight size={16}/></a>
          </div>
          <div className="trust-line"><ShieldCheck size={16}/> Store-isolated records <span>·</span> WhatsApp reminders <span>·</span> UPI payment links</div>
          <div className="hero-stats">
            <div><strong>{Number(stats.downloads).toLocaleString('en-IN')}<small>+</small></strong><span>Downloads</span></div>
            <i/>
            <div><strong>{average}<small>/5</small></strong><span><Stars value={Math.round(stats.averageRating)} size={12}/></span></div>
            <i/>
            <div><strong>{Number(stats.reviews).toLocaleString('en-IN')}</strong><span>User reviews</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-glow"/>
          <div className="ledger-workspace">
            <aside className="ledger-sidebar">
              <div className="ledger-logo"><img src={app?.iconUrl || '/icon.png'} alt="Udhaar Desk"/></div>
              <span className="ledger-nav active"><WalletCards size={16}/></span>
              <span className="ledger-nav"><Check size={16}/></span>
              <span className="ledger-nav"><MessageSquareQuote size={16}/></span>
            </aside>
            <div className="ledger-main">
              <div className="ledger-toolbar"><span><small>Business</small><b>Shree Provision Store</b></span><span className="ledger-avatar">RK</span></div>
              <div className="ledger-summary">
                <div><span>Outstanding</span><strong>₹12,450</strong><small>8 customers</small></div>
                <div><span>Collected today</span><strong>₹2,800</strong><small>5 payments</small></div>
              </div>
              <div className="ledger-table-head"><b>Customer ledger</b><span>+ Add entry</span></div>
              <div className="ledger-row"><span className="avatar a1">RK</span><span><b>Rahul Kumar</b><small>Credit · 18 Nov</small></span><strong>₹500</strong></div>
              <div className="ledger-row"><span className="avatar a2">AS</span><span><b>Amit Sahu</b><small>Paid · Today</small></span><strong className="paid">₹1,200</strong></div>
              <div className="ledger-row"><span className="avatar a3">PM</span><span><b>Priya Mishra</b><small>Overdue · 34 days</small></span><strong className="due">₹800</strong></div>
            </div>
          </div>
          <div className="float-chip chip-one"><span className="chip-icon green"><Check size={15}/></span><span><b>Payment received</b><small>Rahul Kumar · ₹500</small></span></div>
          <div className="float-chip chip-two"><span className="chip-icon purple"><MessageSquareQuote size={15}/></span><span><b>Reminder sent</b><small>Via WhatsApp</small></span></div>
        </div>
      </section>

      {error && <div className="container error-banner">{error} <button onClick={load}>Retry</button></div>}

      <section className="feature-strip"><div className="container strip-grid">
        <div><WalletCards/><span><b>Digital ledger</b><small>Clear customer balances</small></span></div>
        <div><Zap/><span><b>Fast entries</b><small>Add credit and payments quickly</small></span></div>
        <div><MessageSquareQuote/><span><b>Smart reminders</b><small>WhatsApp overdue alerts</small></span></div>
        <div><BadgeCheck/><span><b>UPI collection</b><small>Secure payment links and QR</small></span></div>
      </div></section>

      <section className="section container" id="features">
        <div className="section-heading"><div className="eyebrow">PRODUCT WORKFLOW</div><h2>One ledger.<br/><span>Every transaction.</span></h2><p>Built around the way store owners actually work: quick entries, clear balances and follow-ups that do not get lost.</p></div>
        <div className="feature-grid">
          {(app?.features?.length ? app.features.map((title, index) => ({
            title,
            copy: [
              'See every customer balance and transaction in one store-specific ledger.',
              'Record purchases and payments quickly, with accurate running balances.',
              'Identify old pending dues before they become difficult to recover.',
              'Create ready-to-send WhatsApp reminders with balance and payment details.',
              'Share UPI links or QR codes so customers can pay from their own phone.',
              'Review collections and pending receivables for a clearer daily picture.'
            ][index % 6]
          })) : [
            { title: 'Customer ledger', copy: 'See every customer balance and transaction in one store-specific ledger.' },
            { title: 'Credit & payment entries', copy: 'Record purchases and payments quickly, with accurate running balances.' },
            { title: 'Overdue tracking', copy: 'Identify old pending dues before they become difficult to recover.' },
            { title: 'WhatsApp reminders', copy: 'Create ready-to-send reminders with balance and payment details.' },
            { title: 'UPI links & QR', copy: 'Share UPI links or QR codes so customers can pay from their phone.' },
            { title: 'Store reports', copy: 'Review collections and pending receivables for a clearer daily picture.' }
          ]).map((feature,i) => {
            const icons = [WalletCards, Check, MessageSquareQuote, ShieldCheck];
            const Icon = icons[i % icons.length];
            return <article className="feature-card" key={feature.title}><div className={`feature-icon fi-${i%4}`}><Icon size={20}/></div><h3>{feature.title}</h3><p>{feature.copy}</p><span className="card-arrow"><ArrowUpRightFallback/></span></article>;
          })}
        </div>
      </section>

      <section className="preview-section" id="screenshots"><div className="container preview-inner">
        <div className="section-heading"><div className="eyebrow">TAKE A CLOSER LOOK</div><h2>Designed for<br/><span>everyday use.</span></h2><p>Use Udhaar Desk from mobile or desktop for customer ledgers, credit entries, payments, reminders and reports.</p></div>
        {app?.screenshots?.length ? <div className="screenshots">{app.screenshots.map((s,i)=><img key={s.path || i} src={s.url} alt={s.name || `Udhaar Desk screenshot ${i+1}`}/>)}</div> : <div className="screenshot-empty"><div className="empty-phone"><div className="empty-notch"/><img className="empty-screen-icon" src={app?.iconUrl || '/icon.png'} alt="Udhaar Desk"/><b>Udhaar Desk</b><span>App screenshots will appear here</span><div className="empty-bars"><i/><i/><i/></div></div><div className="empty-note"><Sparkles size={18}/><span><b>App preview gallery</b><small>Real screenshots can be added from the admin dashboard.</small></span></div></div>}
      </div></section>

      <section className="download-section" id="download"><div className="container download-card">
        <div className="download-orb orb-a"/><div className="download-orb orb-b"/>
        <div className="download-copy"><div className="eyebrow light">READY WHEN YOU ARE</div><h2>Bring every<br/><span>hisaab one place.</span></h2><p>Use Udhaar Desk to maintain a digital customer ledger, track outstanding balances, send WhatsApp reminders and accept UPI payments through your store details.</p>
          <div className="download-meta"><span><b>Version</b>{app?.version || '—'}</span><span><b>File size</b>{app?.fileSize || '—'}</span><span><b>Requires</b>{app?.androidRequirement || 'Android'}</span></div>
        </div>
        <div className="download-action">
          <div className="download-icon"><img src={app?.iconUrl || '/icon.png'} alt="Udhaar Desk"/></div>
          <b>{app?.appName || 'Udhaar Desk'}</b><small>Kirana credit & khata application</small>
          <a className={`download-main ${!app?.downloadReady ? 'disabled' : ''}`} href={app?.downloadReady ? `${API}/api/download` : undefined} onClick={e=>{if(!app?.downloadReady){e.preventDefault();setNotice('The APK has not been uploaded yet. Please check back soon.')}}}><Download size={19}/> {app?.downloadReady ? 'Download APK' : 'Coming soon'}</a>
          <span className="safe-note"><ShieldCheck size={14}/> Direct file download</span>
          {notice && <span className="download-notice">{notice}</span>}
        </div>
      </div></section>

      <section className="section container review-section" id="reviews">
        <div className="review-top"><div className="section-heading"><div className="eyebrow">COMMUNITY FEEDBACK</div><h2>Made better with<br/><span>your feedback.</span></h2><p>Read what users think, or share your own experience.</p></div>
          <div className="rating-summary"><strong>{average}</strong><Stars value={Math.round(stats.averageRating)} size={19}/><span>Based on {stats.reviews} approved reviews</span></div>
        </div>
        <div className="review-layout"><div className="review-list">
          {reviews.length ? reviews.map(r=><article className="review-card" key={r.id}><div className="review-person"><span className="avatar review-avatar">{initials(r.reviewer_name)}</span><span><b>{r.reviewer_name}</b><small>{dateLabel(r.created_at)}</small></span><Stars value={r.rating} size={13}/></div><p>{r.review_text}</p></article>) : <div className="no-reviews"><MessageSquareQuote size={25}/><b>Be the first to share feedback</b><span>Approved reviews will appear here.</span></div>}
        </div>
        <form className="review-form" onSubmit={submitReview}><div className="form-eyebrow">YOUR EXPERIENCE</div><h3>Write a review</h3><p>No account needed. Your review will be visible after approval.</p>
          <label>Your rating</label><Stars value={rating} size={25} interactive onChange={setRating}/>
          <label htmlFor="review-name">Your name</label><input id="review-name" value={name} onChange={e=>setName(e.target.value)} minLength="2" maxLength="50" placeholder="Enter your name" required/>
          <label htmlFor="review-text">Your review</label><textarea id="review-text" value={review} onChange={e=>setReview(e.target.value)} minLength="5" maxLength="1000" placeholder="Tell us about your experience..." required/>
          <button className="primary-btn submit-review" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit review'} <ArrowRight size={17}/></button>
          {notice && <div className="form-notice">{notice}</div>}
          <small className="privacy-note"><ShieldCheck size={13}/> No login required. Please keep feedback respectful.</small>
        </form></div>
      </section>

      <section className="faq-section" id="faq"><div className="container faq-wrap"><div className="section-heading"><div className="eyebrow">NEED TO KNOW</div><h2>Quick <span>answers.</span></h2></div>
        <div className="faq-list"><Faq q="What is Udhaar Desk used for?" a="Udhaar Desk is a digital khata app for kirana stores and small businesses to track customer credit, payments, pending balances and transaction history."/><Faq q="Can I send payment reminders?" a="Yes. The app identifies pending and 30-plus-day dues and helps create WhatsApp reminders with the outstanding balance and a secure UPI payment link."/><Faq q="How do customers pay?" a="Store owners can set their UPI details. Udhaar Desk can generate UPI payment links and QR codes, as well as WhatsApp payment and purchase messages."/><Faq q="Does it support reports?" a="Yes. The app is designed to show ledger activity, customer dues, cleared accounts and store-level reports so owners can review their business at a glance."/><Faq q="Is the APK available right now?" a={app?.downloadReady ? 'Yes. Use the Download APK button above.' : 'The release file has not been uploaded yet. Check the download section again after the latest APK is added.'}/></div>
      </div></section>
    </main>
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand app={app}/>
          <p>A simple digital khata for kirana stores and small businesses to manage customer credit, payments and daily records.</p>
          <div className="footer-status"><span/><b>Store records</b><small>Private to your account</small></div>
        </div>
        <div className="footer-column">
          <h3>Resources</h3>
          <a href="#features">About Udhaar Desk</a>
          <a href="#screenshots">How it works</a>
          <a href="#faq">Frequently asked</a>
          <a href="#reviews">Customer reviews</a>
          <a href="#download">Download app</a>
        </div>
        <div className="footer-column">
          <h3>App & account</h3>
          <a href="#download">Android download</a>
          <a href="#features">Ledger features</a>
          <a href="#screenshots">Payment workflow</a>
          <a href="#reviews">Share feedback</a>
          <a href="#faq">Support</a>
        </div>
        <div className="footer-system">
          <h3>System status</h3>
          <div className="system-card">
            <div><span>Application</span><b><i/> Operational</b></div>
            <div><span>Current version</span><b>Udhaar Desk <small>{app?.version || '1.0'}</small></b></div>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Udhaar Desk. All rights reserved.</span>
        <div><a href="#faq">Support</a><a href="#home">Back to top <ArrowRight size={12}/></a></div>
      </div>
    </footer>
    {loading && <div className="loading-line"/>}
  </div>;
}

function ArrowUpRightFallback(){ return <ArrowRight size={17}/>; }

function PageLoader() {
  return <div className="page-loader" role="status" aria-label="Loading Udhaar Desk">
    <div className="loader-mark"><img src="/icon.png" alt="" /></div>
    <div className="loader-name">Udhaar Desk</div>
    <div className="loader-track"><span /></div>
  </div>;
}

function Faq({q,a}) {
  const [open,setOpen] = useState(false);
  return <div className={`faq-item ${open?'open':''}`}><button onClick={()=>setOpen(!open)}><span>{q}</span>{open?<ChevronUp/>:<ChevronDown/>}</button>{open&&<p>{a}</p>}</div>;
}

function Admin({onClose,onUpdated}) {
  const [token,setToken] = useState(sessionStorage.getItem('udhaar_admin_token') || '');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [data,setData] = useState(null);
  const [form,setForm] = useState(null);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [loginError,setLoginError] = useState('');

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });
  async function loadAdmin(t=token) {
    const result = await request('/api/admin/overview',{headers:{Authorization:`Bearer ${t}`}});
    setData(result);
    setForm({
      appName: result.settings.appName, tagline: result.settings.tagline,
      description: result.settings.description, version: result.settings.version,
      fileSize: result.settings.fileSize, androidRequirement: result.settings.androidRequirement,
      features: (result.settings.features || []).join('\n')
    });
  }
  useEffect(()=>{ if(token) loadAdmin().catch(()=>{setToken('');sessionStorage.removeItem('udhaar_admin_token')}) },[]);
  async function login(e) {
    e.preventDefault(); setLoginError(''); setBusy(true);
    try {
      const result = await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      sessionStorage.setItem('udhaar_admin_token',result.token); setToken(result.token); setPassword('');
      await loadAdmin(result.token);
    } catch(e){setLoginError(e.message)} finally{setBusy(false)}
  }
  async function save(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      await request('/api/admin/app',{method:'PUT',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({...form,features:form.features.split('\n').map(x=>x.trim()).filter(Boolean)})});
      setMessage('App information saved successfully.'); await loadAdmin(); onUpdated();
    } catch(e){setMessage(e.message)} finally{setBusy(false)}
  }
  async function upload(kind,file) {
    if(!file)return; setBusy(true);setMessage('');
    try {
      const body=new FormData();body.append('file',file);
      await request(`/api/admin/upload/${kind}`,{method:'POST',headers:authHeaders(),body});
      setMessage(`${kind} uploaded successfully.`);await loadAdmin();onUpdated();
    }catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  async function reviewAction(id,status) {
    try { await request(`/api/admin/reviews/${id}`,{method:'PATCH',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({status})}); await loadAdmin();onUpdated(); }
    catch(e){setMessage(e.message)}
  }
  async function deleteReview(id) {
    if(!confirm('Delete this review permanently?'))return;
    try {await request(`/api/admin/reviews/${id}`,{method:'DELETE',headers:authHeaders()});await loadAdmin();onUpdated()}
    catch(e){setMessage(e.message)}
  }
  function logout(){sessionStorage.removeItem('udhaar_admin_token');setToken('');setData(null);setForm(null)}
  if(!token || !data) return <div className="admin-screen"><div className="admin-login-card"><button className="admin-close" onClick={onClose}><X/></button><div className="admin-logo"><ShieldCheck/></div><div className="eyebrow">PRIVATE AREA</div><h1>Admin sign in</h1><p>Manage your Udhaar Desk download page.</p><form onSubmit={login}><label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary-btn" disabled={busy}>{busy?'Signing in…':'Sign in'} <ArrowRight size={17}/></button>{loginError&&<div className="form-notice error">{loginError}</div>}</form><small>Authorized administrator only</small></div></div>;

  return <div className="admin-screen"><div className="admin-wrap"><header className="admin-header"><div><div className="eyebrow">UDHAAR DESK / CONTROL CENTER</div><h1>Admin dashboard</h1><p>Administrator session active</p></div><div className="admin-head-actions"><button className="outline-btn" onClick={onClose}>View website <ExternalLink size={15}/></button><button className="dark-btn" onClick={logout}>Sign out</button></div></header>
    <div className="admin-metrics"><div><span>Total downloads</span><b>{Number(data.downloads).toLocaleString('en-IN')}</b></div><div><span>Total reviews</span><b>{data.reviews.length}</b></div><div><span>Pending reviews</span><b>{data.reviews.filter(r=>r.status==='pending').length}</b></div></div>
    {message&&<div className="admin-message">{message}</div>}
    <div className="admin-grid"><form className="admin-panel edit-panel" onSubmit={save}><div className="panel-title"><div><div className="eyebrow">APP CONTENT</div><h2>App information</h2></div><button className="primary-btn compact" disabled={busy}>Save changes</button></div>
      {form&&<><label>Application name</label><input value={form.appName} onChange={e=>setForm({...form,appName:e.target.value})}/><label>Tagline</label><input value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})}/><label>Description</label><textarea className="admin-textarea" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><div className="two-fields"><div><label>Version</label><input value={form.version} onChange={e=>setForm({...form,version:e.target.value})}/></div><div><label>File size</label><input value={form.fileSize} onChange={e=>setForm({...form,fileSize:e.target.value})}/></div></div><label>Android requirement</label><input value={form.androidRequirement} onChange={e=>setForm({...form,androidRequirement:e.target.value})}/><label>Features (one per line)</label><textarea className="admin-textarea" value={form.features} onChange={e=>setForm({...form,features:e.target.value})}/></>}
    </form>
    <div className="admin-panel"><div className="eyebrow">MEDIA & RELEASE</div><h2>Manage files</h2><Upload label="App icon" hint="PNG, JPG or WEBP · max 8 MB" accept="image/*" onFile={f=>upload('icon',f)}/><Upload label="Add screenshot" hint="Image · max 8 MB · up to 8 shown" accept="image/*" onFile={f=>upload('screenshot',f)}/><Upload label="Upload APK / release" hint="APK, AAB, ZIP or PDF · max 150 MB" accept=".apk,.aab,.zip,.pdf" onFile={f=>upload('release',f)}/><p className="storage-note"><ShieldCheck size={15}/> Files are stored in your private/public Supabase Storage buckets.</p></div></div>
    <div className="admin-panel admin-reviews"><div className="panel-title"><div><div className="eyebrow">COMMUNITY</div><h2>Review moderation</h2></div><span className="status-count">{data.reviews.filter(r=>r.status==='pending').length} pending</span></div>
      {data.reviews.length?data.reviews.map(r=><div className="moderation-row" key={r.id}><div className="moderation-content"><div className="moderation-name"><b>{r.reviewer_name}</b><Stars value={r.rating} size={13}/><span className={`review-status ${r.status}`}>{r.status}</span></div><p>{r.review_text}</p><small>{dateLabel(r.created_at)}</small></div><div className="moderation-actions">{r.status!=='approved'&&<button onClick={()=>reviewAction(r.id,'approved')}>Approve</button>}{r.status!=='rejected'&&<button onClick={()=>reviewAction(r.id,'rejected')}>Hide</button>}<button className="delete-btn" onClick={()=>deleteReview(r.id)}>Delete</button></div></div>):<p className="muted">No reviews have been submitted yet.</p>}
    </div>
    <div className="admin-footer"><span>Udhaar Desk Admin</span><span>Changes are saved to Supabase.</span></div>
  </div></div>;
}

function Upload({label,hint,accept,onFile}) {
  const [file,setFile]=useState('');
  return <label className="upload-box"><span><b>{label}</b><small>{hint}</small>{file&&<em>{file}</em>}</span><span className="upload-choose">Choose file <ArrowRight size={14}/></span><input type="file" accept={accept} onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f.name);onFile(f)}}}/></label>;
}

export default App;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function __demoAutofill() {
  (async () => {
    let email = "";
    let password = "";
    try {
      const response = await fetch("/api/auth/demo-credentials", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        email = data.email || data.username || "";
        password = data.password || "";
      }
    } catch (error) {
      /* fall back to build-time credentials below */
    }
    if (!email || !password) {
      const env = (typeof process !== "undefined" && process.env) ? process.env : {};
      email = email || env.REACT_APP_DEMO_EMAIL || env.VITE_DEMO_EMAIL || "";
      password = password || env.REACT_APP_DEMO_PASSWORD || env.VITE_DEMO_PASSWORD || "";
    }
    const form = document.querySelector("form");
    const setValue = (element, value) => {
      if (!element) return;
      const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      setter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const scope = form || document;
    setValue(scope.querySelector('input[type="email"], input[name="email"], input[name="username"]') || scope.querySelectorAll("input")[0], email);
    setValue(scope.querySelector('input[type="password"], input[name="password"]') || scope.querySelectorAll("input")[1], password);
    window.setTimeout(() => {
      if (form && typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        const submit = scope.querySelector('button[type="submit"], input[type="submit"]');
        if (submit) submit.click();
      }
    }, 50);
  })();
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isReg, setIsReg] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const autoFill = () => { setEmail(import.meta.env.VITE_DEMO_EMAIL || ''); setPassword(import.meta.env.VITE_DEMO_PASSWORD || ''); toast.success('Credentials filled!'); };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isReg ? '/api/auth/register' : '/api/auth/login';
      const body = isReg ? { email, password, name } : { email, password };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.user, data.token);
      toast.success(`Welcome${data.user.name ? ', ' + data.user.name : ''}!`);
      nav('/');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-head">
          <div className="login-icon">R</div>
          <h1>RentHub</h1>
          <p>Rent anything, anywhere. The marketplace for everything.</p>
        </div>
        <div className="login-card">
          <form onSubmit={submit}>
            {isReg && <div className="fg"><label>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></div>}
            <div className="fg"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" required /></div>
            <div className="fg"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required /></div>
            <button type="submit" className="btn btn-p" disabled={loading}>{loading ? 'Please wait...' : isReg ? 'Create Account' : 'Sign In'}</button>
          </form>
          <div className="divider">or</div>
          <button className="autofill" onClick={__demoAutofill}>Quick Login - Auto Fill Demo Credentials</button>
          <div className="toggle-auth">
            <button onClick={()=>setIsReg(!isReg)}>{isReg ? 'Already have an account? Sign In' : 'Need an account? Register'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

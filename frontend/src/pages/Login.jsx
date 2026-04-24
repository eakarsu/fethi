import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isReg, setIsReg] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const autoFill = () => { setEmail('demo@rental.com'); setPassword('demo1234'); toast.success('Credentials filled!'); };

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
          <button className="autofill" onClick={autoFill}>Quick Login - Auto-fill Demo Credentials</button>
          <div className="toggle-auth">
            <button onClick={()=>setIsReg(!isReg)}>{isReg ? 'Already have an account? Sign In' : 'Need an account? Register'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

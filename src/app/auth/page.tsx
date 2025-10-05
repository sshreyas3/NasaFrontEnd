'use client';

import { useState, useEffect } from 'react';
import styles from './auth.module.scss';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginStatus, setLoginStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [registerStatus, setRegisterStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearStatus = () => {
    setLoginStatus(null);
    setRegisterStatus(null);
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    clearStatus();
  };

  const handleSubmit = async (e: React.FormEvent, type: 'login' | 'register') => {
    e.preventDefault();
    setIsSubmitting(true);
    clearStatus();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const username = (formData.get('username') as string).trim();
    const password = formData.get('password') as string;

    if (!username || !password) {
      if (type === 'login') {
        setLoginStatus({ message: 'Please fill in all fields', type: 'error' });
      } else {
        setRegisterStatus({ message: 'Please fill in all fields', type: 'error' });
      }
      setIsSubmitting(false);
      return;
    }

    if (type === 'register' && password.length < 6) {
      setRegisterStatus({ message: 'Password must be at least 6 characters', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('userId', data.userID);
        sessionStorage.setItem('username', username);

        const successMessage = type === 'login'
          ? `Welcome back! User ID: ${data.userID}`
          : `Registration successful! User ID: ${data.userID}`;

        if (type === 'login') {
          setLoginStatus({ message: successMessage, type: 'success' });
        } else {
          setRegisterStatus({ message: successMessage, type: 'success' });

        setTimeout(() => {
          window.location.href = '/mars-explorer';
        }, 1500);
      } else {
        const errorMessage = data.detail || `${type === 'login' ? 'Login' : 'Registration'} failed`;
        if (type === 'login') {
          setLoginStatus({ message: errorMessage, type: 'error' });
        } else {
          setRegisterStatus({ message: errorMessage, type: 'error' });
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      const errorMsg = 'Connection error. Please try again.';
      if (type === 'login') {
        setLoginStatus({ message: errorMsg, type: 'error' });
      } else {
        setRegisterStatus({ message: errorMsg, type: 'error' });
      }
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className={styles.background}></div>
    <div className={styles.stars}></div>
    <div className={styles.container}>
      <div className={styles.authBox}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🔴</div>
          <h1>Mars Explorer</h1>
          <p>Collaborative Planetary Exploration</p>
        </div>

        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === 'login' ? styles.active : ''}`}
            onClick={() => handleTabChange('login')}
          >
            Login
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'register' ? styles.active : ''}`}
            onClick={() => handleTabChange('register')}
          >
            Register
          </button>
        </div>

        <div className={styles.formContainer}>
          {/* Login Form */}
          {activeTab === 'login' && (
            <form className={`${styles.form} ${styles.active}`} onSubmit={(e) => handleSubmit(e, 'login')}>
              <div className={styles.formGroup}>
                <label>Username</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    type="text"
                    name="username"
                    className={styles.formInput}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Password</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>🔒</span>
                  <input
                    type="password"
                    name="password"
                    className={styles.formInput}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className={styles.loading}></span>
                ) : (
                  <span className={styles.btnText}>Launch Mission</span>
                )}
              </button>

              {loginStatus && (
                <div className={`${styles.statusMessage} ${styles[loginStatus.type]} ${styles.show}`}>
                  {loginStatus.message}
                </div>
              )}
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form className={`${styles.form} ${styles.active}`} onSubmit={(e) => handleSubmit(e, 'register')}>
              <div className={styles.formGroup}>
                <label>Username</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>👤</span>
                  <input
                    type="text"
                    name="username"
                    className={styles.formInput}
                    placeholder="Choose a username"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Password</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>🔒</span>
                  <input
                    type="password"
                    name="password"
                    className={styles.formInput}
                    placeholder="Create a password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className={styles.loading}></span>
                ) : (
                  <span className={styles.btnText}>Join Expedition</span>
                )}
              </button>

              {registerStatus && (
                <div className={`${styles.statusMessage} ${styles[registerStatus.type]} ${styles.show}`}>
                  {registerStatus.message}
                </div>
              )}
            </form>
          )}
        </div>

        <div className={styles.footerText}>Exploring Mars, together</div>
      </div>
    </div>
    </>
  );
}
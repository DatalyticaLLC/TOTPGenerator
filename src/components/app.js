import { h } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { TOTPForm, generateTOTP, generateAndShowSecret } from './totp';

const sanitize = input => input.replace(/<[^>]*>/g, '').replace(/[^a-zA-Z0-9 .,!?-]/g, '').trim();

const AccountItem = ({ account: { name, secret }, onDelete }) => {
  const [currentTOTP, setCurrentTOTP] = useState(() => generateTOTP(secret));

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      if (now % 30 === 0) setCurrentTOTP(generateTOTP(secret));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [secret]);

  return (
    <div className="account-item" role="listitem">
      <button 
        onClick={onDelete}
        aria-label={`Delete ${name} account`}
      >
        Delete
      </button>
      <span className="account-name">{name}</span>
      <span className="totp-code" aria-live="polite" aria-atomic="true">
        {currentTOTP}
      </span>
    </div>
  );
};

const ProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => setProgress(Math.floor(Date.now() / 1000) % 30);
    updateProgress();
    const intervalId = setInterval(updateProgress, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return <div className="progress-container">
  <progress value={progress} max="30" aria-label="Time remaining for current TOTP code" />
</div>;
};

const Footer = ({ toggleTheme, isDarkMode, backupData, restoreData, generateAndShowSecret }) => (
  <footer>
    <div className="footer-content">
      <div className="footer-left">
        <a 
          href="#" 
          onClick={backupData} 
          onKeyDown={(e) => handleKeyDown(e, backupData)}
          role="button" 
          aria-label="Backup accounts data"
        >
          Backup
        </a>
        <a 
          href="#" 
          onClick={restoreData} 
          onKeyDown={(e) => handleKeyDown(e, restoreData)}
          role="button" 
          aria-label="Restore accounts data"
        >
          Restore
        </a>
        <a 
          href="#" 
          onClick={toggleTheme} 
          onKeyDown={(e) => handleKeyDown(e, toggleTheme)}
          role="button" 
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? 'Light' : 'Dark'}
        </a>
        <a 
          href="#" 
          onClick={generateAndShowSecret} 
          onKeyDown={(e) => handleKeyDown(e, generateAndShowSecret)}
          role="button" 
          aria-label="Generate new secret"
        >
          GenSecret
        </a>
      </div>
      <div className="footer-right">
        <span>Not designed for most users. ©Datalytica</span>
      </div>
    </div>
  </footer>
);

const handleKeyDown = (e, onActivate) => {
  if (e.key === 'Enter' || e.key === ' ') {
    onActivate();
    e.preventDefault();
  }
};

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

const App = () => {
  const [accounts, setAccounts] = useLocalStorage('totpAccounts', []);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    document.title = 'TOTP Generator - Manage Your Accounts';
  }, []);

  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
  
        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
  
    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  const backupData = useCallback(() => {
    const blob = new Blob([JSON.stringify(accounts)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TOTP_Generator_backup_${new Date().toLocaleString().replace(/[/\\:]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [accounts]);

  const restoreData = useCallback(() => {
    if (!confirm('Restoring will overwrite your current accounts. Proceed?')) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const restoredAccounts = JSON.parse(e.target.result);
            if (restoredAccounts.length > 5) {
              setError('Restore failed: The backup contains more than 5 accounts.');
            } else {
              setAccounts(restoredAccounts);
              setError('');
              alert('Data restored successfully!');
            }
          } catch (error) {
            console.error('Restore failed:', error);
            setError('Restore failed. Please check your file and try again.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setAccounts]);

  const addAccount = useCallback(account => {
    setAccounts(prev => {
      if (prev.length >= 5) {
        setError('Maximum limit of 5 accounts reached.');
        return prev;
      }
      const sanitizedAccount = {
        name: sanitize(account.name),
        secret: account.secret
      };
      setError('');
      return [...prev, sanitizedAccount];
    });
  }, [setAccounts]);

  const deleteAccount = useCallback(index => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      setAccounts(prev => prev.filter((_, i) => i !== index));
      setError('');
    }
  }, [setAccounts]);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), [setIsDarkMode]);

  const accountItems = useMemo(() => 
    accounts.map((account, index) => (
      <AccountItem 
        key={account.name + index} 
        account={account} 
        onDelete={() => deleteAccount(index)} 
      />
    )),
    [accounts, deleteAccount]
  );

  return (
    <div id="app">
     <a href="#main-content" className="skip-link">Skip to main content</a>
     <main id="main-content">
     <div id="aria-live-region" aria-live="polite" className="visually-hidden"></div>
      <div className="app-content">
        <h1>TOTP Generator</h1>
        {accounts.length < 5 ? (
          <TOTPForm addAccount={addAccount} />
        ) : (
          <p>Maximum limit of 5 accounts reached. Delete an account to add a new one.</p>
        )}
        {error && <div className="error" role="alert">{error}</div>}
        <ProgressBar />
        <div className="accounts-list">
          {accountItems}
        </div>
      </div>
      </main>
      <Footer 
        toggleTheme={toggleTheme} 
        isDarkMode={isDarkMode} 
        backupData={backupData} 
        restoreData={restoreData} 
        generateAndShowSecret={generateAndShowSecret}
      />
    </div>
  );
};

export default App;
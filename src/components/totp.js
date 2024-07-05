import { h } from 'preact';
import { useState, useCallback, useEffect } from 'preact/hooks';
import jsSHA from 'jssha';

const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const leftPad = (str, len, pad) => (len + 1 >= str.length) ? Array(len + 1 - str.length).join(pad) + str : str;
const dec2hex = s => (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
const hex2dec = s => parseInt(s, 16);

const base32ToHex = base32 => {
  const base32Clean = base32.replace(/=+$/, '').toUpperCase();
  if (!/^[A-Z2-7]+$/.test(base32Clean)) throw new Error("Invalid Base32 input");
  let bits = '';
  let hex = '';
  for (let i = 0; i < base32Clean.length; i++) {
    const val = base32Chars.indexOf(base32Clean.charAt(i));
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let chunk = bits.substr(i, 8);
    hex = hex + parseInt(chunk, 2).toString(16).padStart(2, '0');
  }
  return hex;
};

export const generateTOTP = (secret, period = 30, digits = 6) => {
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const time = leftPad(dec2hex(Math.floor(epoch / period)), 16, '0');
    const sha = new jsSHA('SHA-1', 'HEX');
    sha.setHMACKey(base32ToHex(secret), 'HEX');
    sha.update(time);
    const hmac = sha.getHMAC('HEX');
    const offset = hex2dec(hmac.substring(hmac.length - 1));
    let otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';
    return otp.substr(otp.length - digits, digits).padStart(digits, '0');
  } catch (error) {
    console.error('Error generating TOTP:', error);
    return 'Error generating code';
  }
};

const generateTOTPSecret = (length = 20) => {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  let result = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      result += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += base32Chars[(value << (5 - bits)) & 31];
  }
  while (result.length % 8 !== 0) {
    result += '=';
  }
  return result;
};

const announceSecret = (secret) => {
  prompt('Your TOTP Secret (click to copy):', secret);
  const ariaLiveRegion = document.getElementById('aria-live-region');
  if (ariaLiveRegion) {
    ariaLiveRegion.textContent = `TOTP Secret generated: ${secret.split('').join(' ')}. Secret is displayed in a dialog for copying.`;
  }
};

export const generateAndShowSecret = e => {
  if (e) e.preventDefault();
  const secret = generateTOTPSecret();
  announceSecret(secret);
  const button = e.target;
  button.setAttribute('aria-label', 'Generate new secret. Last generated secret is available for copying.');
};

export const TOTPForm = ({ addAccount }) => {
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const handleSubmit = useCallback(e => {
    e.preventDefault();
    if (isButtonDisabled) return;
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a valid account name.');
      return;
    }
    const trimmedSecret = secret.trim().toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z2-7]+=*$/.test(trimmedSecret) || trimmedSecret.replace(/=+$/, '').length % 8 !== 0) {
      setError('Please enter a valid Base32 secret key.');
      return;
    }
    addAccount({ name: trimmedName, secret: trimmedSecret });
    setName('');
    setSecret('');
    setIsButtonDisabled(true);
    setTimeout(() => setIsButtonDisabled(false), 3000);
  }, [name, secret, addAccount, isButtonDisabled]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setName('');
        setSecret('');
        setError('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="totp-form-container">
      <form onSubmit={handleSubmit} aria-label="Add new TOTP account">
        <label htmlFor="accountName" className="visually-hidden">Account Name</label>
        <input
          id="accountName"
          type="text"
          placeholder="Account Name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength="50"
          aria-required="true"
        />
        <label htmlFor="secretKey" className="visually-hidden">Secret Key</label>
        <input
          id="secretKey"
          type="text"
          placeholder="Secret Key"
          value={secret}
          onChange={e => setSecret(e.target.value.toUpperCase())}
          maxLength="128"
          aria-required="true"
        />
        <button 
          type="submit" 
          disabled={isButtonDisabled} 
          aria-disabled={isButtonDisabled}
          aria-describedby={isButtonDisabled ? "submitHint" : undefined}
        >
          {isButtonDisabled ? 'Please wait...' : 'Add Account'}
        </button>
      </form>
      {isButtonDisabled && (
        <span id="submitHint" className="visually-hidden">
          Button is temporarily disabled. Please wait a moment before submitting again.
        </span>
      )}
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
};
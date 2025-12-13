import React, { useState } from 'react';
import { Button, Input, Label, cn } from '../Core';
import { Eye, EyeOff, RefreshCw, Download, Check, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  label?: string;
  disabled?: boolean;
}

export const PasswordField = ({ id, value, onChange, label = "Password", disabled }: PasswordFieldProps) => {
  const [showPass, setShowPass] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // Validation State
  const validations = {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };

  const isValid = Object.values(validations).every(Boolean);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    const length = 16;
    let password = "";
    // Ensure at least one of each required type
    password += "A"; // Upper
    password += "a"; // Lower
    password += "1"; // Number
    password += "!"; // Special

    // Fill rest randomly
    const cryptoObj = window.crypto || (window as any).msCrypto;
    const randomValues = new Uint32Array(length - 4);
    cryptoObj.getRandomValues(randomValues);

    for (let i = 0; i < length - 4; i++) {
      password += chars[randomValues[i] % chars.length];
    }

    // Shuffle
    password = password.split('').sort(() => 0.5 - Math.random()).join('');

    onChange(password);
    setIsGenerated(true);
    setShowPass(true); // Show generated password
    toast.success("Secure password generated!");
  };

  const downloadPassword = () => {
    const element = document.createElement("a");
    const file = new Blob([`Senzor Credentials\n\nPassword: ${value}\n\nKeep this file safe or delete it after saving to your password manager.`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "senzor-credentials.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast.success("Password copied to clipboard");
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <Label htmlFor={id}>{label}</Label>
        <button
          type="button"
          onClick={generatePassword}
          className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium transition-colors"
          disabled={disabled}
        >
          <RefreshCw className="h-3 w-3" /> Generate Secure
        </button>
      </div>

      <div className="relative group">
        <Input
          id={id}
          type={showPass ? "text" : "password"}
          required
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsGenerated(false); }}
          disabled={disabled}
          className={cn(
            "pr-10 font-mono transition-all duration-300",
            // Theme-aware focus and active states
            isGenerated
              ? "border-primary/50 bg-primary/5 focus-visible:ring-primary text-primary"
              : "focus-visible:ring-primary"
          )}
          placeholder="••••••••"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPass(!showPass)}
          disabled={disabled}
        >
          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Generated Password Actions */}
      {isGenerated && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2 text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Do not lose this password.</strong><br />
              It cannot be recovered if you leave this page without saving.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs w-full border-primary/20 hover:bg-primary/10 hover:text-primary" onClick={downloadPassword}>
              <Download className="mr-2 h-3 w-3" /> Download .txt
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs w-full border-primary/20 hover:bg-primary/10 hover:text-primary" onClick={copyToClipboard}>
              <Copy className="mr-2 h-3 w-3" /> Copy
            </Button>
          </div>
        </div>
      )}

      {/* Validation Checklist (Only show if typing) */}
      {value.length > 0 && !isValid && (
        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground bg-muted/50 p-2 rounded border border-border/50">
          <ValidationItem valid={validations.length} label="8+ Characters" />
          <ValidationItem valid={validations.upper} label="Uppercase (A-Z)" />
          <ValidationItem valid={validations.lower} label="Lowercase (a-z)" />
          <ValidationItem valid={validations.number} label="Number (0-9)" />
          <ValidationItem valid={validations.special} label="Special (!@#)" />
        </div>
      )}
    </div>
  );
};

const ValidationItem = ({ valid, label }: { valid: boolean, label: string }) => (
  <div className={`flex items-center gap-1.5 transition-colors duration-300 ${valid ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
    {valid ? <Check className="h-3 w-3" /> : <div className="h-1 w-1 rounded-full bg-current opacity-50 ml-1 mr-1" />}
    <span>{label}</span>
  </div>
);
'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Shield, Check, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function EmergencyContactWidget() {
  const [emergencyContact, setEmergencyContact] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    console.log('🔵 WIDGET: Component mounted, calling fetchEmergencyContact');
    fetchEmergencyContact();
  }, []);

  const fetchEmergencyContact = async () => {
    try {
      console.log('🔵 WIDGET: Starting fetch...');
      setLoading(true);
      setError('');
      
      console.log('🔵 WIDGET: Making GET request to /api/emergency-contact');
      const response = await fetch(`/api/emergency-contact?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      console.log('🔵 WIDGET: Response received, status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch emergency contact');
      }
      
      const data = await response.json();
      console.log('🔵 WIDGET: Response data:', data);
      
      if (data.success) {
        console.log('✅ WIDGET: Setting state - email:', data.emergencyContactEmail, 'linked:', data.isLinked);
        setEmergencyContact(data.emergencyContactEmail);
        setIsLinked(data.isLinked);
        setEmailInput(data.emergencyContactEmail || '');
      } else {
        console.log('❌ WIDGET: Response success=false');
      }
    } catch (err: any) {
      console.error('❌ WIDGET: Error:', err);
      setError('Failed to load emergency contact');
    } finally {
      console.log('🔵 WIDGET: Setting loading=false');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput || !emailRegex.test(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/emergency-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyContactEmail: emailInput }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmergencyContact(emailInput);
        setIsLinked(true);
        setEditing(false);
        setSuccess('Emergency contact linked successfully!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to link emergency contact');
      }
    } catch (err: any) {
      setError('Failed to link emergency contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your emergency contact?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/emergency-contact', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmergencyContact(null);
        setIsLinked(false);
        setEmailInput('');
        setSuccess('Emergency contact removed successfully');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to remove emergency contact');
      }
    } catch (err: any) {
      setError('Failed to remove emergency contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  console.log('🔵 WIDGET: Rendering - loading:', loading, 'isLinked:', isLinked, 'email:', emergencyContact);

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 hover:shadow-[0_8px_30px_rgb(239,68,68,0.15)] transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-linear-to-br from-error to-warning rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            Emergency Contact
          </h3>
          <p className="text-sm text-muted-foreground">
            Crisis alert system
          </p>
        </div>
        <button
          onClick={fetchEmergencyContact}
          className="p-2 hover:bg-muted rounded-2xl transition-all duration-200"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 glass border-error/30 rounded-2xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 glass border-success/30 rounded-2xl flex items-start gap-2">
          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {!isLinked && !editing ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Link a trusted person who will be notified if our system detects you're in crisis.
          </p>

          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-success" />
              Automatic crisis detection
            </li>
            <li className="flex items-center gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-success" />
              Instant email alerts
            </li>
            <li className="flex items-center gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-success" />
              Emergency resources included
            </li>
          </ul>

          <button
            onClick={() => setEditing(true)}
            className="w-full bg-linear-to-r from-error to-warning text-white py-3 rounded-2xl font-medium hover:shadow-[0_8px_30px_rgb(239,68,68,0.3)] transition-all duration-300 transform hover:scale-[1.02]"
          >
            Link Emergency Contact
          </button>
        </>
      ) : editing ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Emergency Contact Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-error transition-colors" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="contact@example.com"
                className="w-full pl-10 pr-4 py-3 glass rounded-2xl focus:ring-2 focus:ring-error focus:border-error/50 text-foreground placeholder-muted-foreground transition-all duration-200"
                disabled={saving}
              />
            </div>
          </div>

          <div className="mb-4 p-3 glass border-warning/30 rounded-2xl">
            <p className="text-xs text-foreground">
              <strong>Important:</strong> This person will receive urgent alerts if you express thoughts of self-harm. Choose someone you trust.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-linear-to-r from-error to-warning text-white py-2 rounded-2xl font-medium hover:shadow-[0_8px_30px_rgb(239,68,68,0.3)] transition-all duration-300 disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEmailInput(emergencyContact || '');
                setError('');
              }}
              disabled={saving}
              className="px-4 py-2 glass rounded-2xl hover:bg-muted transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 p-4 glass border-success/30 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-success" />
              <p className="font-medium text-foreground">
                Emergency Contact Active
              </p>
            </div>
            <p className="text-sm text-success break-all">
              <Mail className="w-4 h-4 inline mr-1" />
              {emergencyContact}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 px-4 py-2 glass text-foreground rounded-2xl hover:bg-muted transition-all duration-200 text-sm"
            >
              Update
            </button>
            <button
              onClick={handleRemove}
              disabled={saving}
              className="px-4 py-2 text-error hover:bg-error/10 rounded-2xl transition-all duration-200 text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
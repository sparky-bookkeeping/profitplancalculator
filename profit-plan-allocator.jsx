import React, { useState, useEffect } from 'react';
import { Download, LogOut, DollarSign, TrendingUp, PieChart, FileText, Save, Plus } from 'lucide-react';

const ProfitPlanAllocator = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState('email'); // 'email' | 'check-email' | 'verify'
  const [email, setEmail] = useState('');
  const [magicCode, setMagicCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  
  // Stored data
  const [savedUsers, setSavedUsers] = useState({});
  const [pendingMagicLinks, setPendingMagicLinks] = useState({});

  // Load saved data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('profit_plan_users');
    if (stored) {
      setSavedUsers(JSON.parse(stored));
    }
    
    const pending = localStorage.getItem('pending_magic_links');
    if (pending) {
      setPendingMagicLinks(JSON.parse(pending));
    }
    
    // Check if we have a magic link code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const userEmail = params.get('email');
    
    if (code && userEmail) {
      setEmail(userEmail);
      setMagicCode(code);
      setAuthStep('verify');
      // Auto-verify
      setTimeout(() => verifyMagicLink(userEmail, code), 100);
    }
  }, []);

  // Generate 6-digit code
  const generateMagicCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendMagicLink = () => {
    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email');
      return;
    }

    const code = generateMagicCode();
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
    
    // Store pending magic link
    const pending = { ...pendingMagicLinks };
    pending[email] = { code, expiresAt, sentAt: Date.now() };
    setPendingMagicLinks(pending);
    localStorage.setItem('pending_magic_links', JSON.stringify(pending));

    // In a real app, you'd send this via email
    // For demo purposes, we'll show it in console and create a link
    console.log(`🔐 Magic Code for ${email}: ${code}`);
    console.log(`Magic Link: ${window.location.origin}${window.location.pathname}?code=${code}&email=${encodeURIComponent(email)}`);
    
    // Show the "check your email" screen
    setAuthStep('check-email');
    setAuthError('');
    
    // For demo: also show an alert with the code
    alert(`🔐 DEMO MODE: Your magic code is ${code}\n\nIn production, this would be sent to ${email}`);
  };

  const verifyMagicLink = (emailToVerify = email, codeToVerify = magicCode) => {
    const pending = pendingMagicLinks[emailToVerify];
    
    if (!pending) {
      setAuthError('No magic link found for this email. Please request a new one.');
      setAuthStep('email');
      return;
    }

    if (Date.now() > pending.expiresAt) {
      setAuthError('This magic link has expired. Please request a new one.');
      setAuthStep('email');
      // Clean up expired link
      const updated = { ...pendingMagicLinks };
      delete updated[emailToVerify];
      setPendingMagicLinks(updated);
      localStorage.setItem('pending_magic_links', JSON.stringify(updated));
      return;
    }

    if (pending.code !== codeToVerify) {
      setAuthError('Invalid code. Please try again.');
      return;
    }

    // Success! Log them in
    const users = { ...savedUsers };
    
    if (!users[emailToVerify]) {
      // New user - create account
      users[emailToVerify] = {
        email: emailToVerify,
        buckets: [
          { id: 1, name: 'Your Bonus', percentage: 40, color: 'from-pink-500 to-rose-500', account: 'Owner Draw' },
          { id: 2, name: 'Taxes', percentage: 25, color: 'from-blue-500 to-cyan-500', account: 'Tax Savings Account' },
          { id: 3, name: 'Savings', percentage: 15, color: 'from-purple-500 to-violet-500', account: 'Business Savings' },
          { id: 4, name: 'Reinvestment', percentage: 20, color: 'from-orange-500 to-amber-500', account: 'Operating Account' }
        ],
        createdAt: new Date().toISOString()
      };
    }
    
    setSavedUsers(users);
    localStorage.setItem('profit_plan_users', JSON.stringify(users));
    
    // Load user's buckets
    setBuckets(users[emailToVerify].buckets);
    
    // Clean up used magic link
    const updated = { ...pendingMagicLinks };
    delete updated[emailToVerify];
    setPendingMagicLinks(updated);
    localStorage.setItem('pending_magic_links', JSON.stringify(updated));
    
    // Set authenticated
    setIsAuthenticated(true);
    setCurrentUser(emailToVerify);
    setAuthError('');
    
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleLogout = () => {
    // Save current buckets before logout
    const users = { ...savedUsers };
    users[currentUser].buckets = buckets;
    setSavedUsers(users);
    localStorage.setItem('profit_plan_users', JSON.stringify(users));
    
    setIsAuthenticated(false);
    setEmail('');
    setMagicCode('');
    setCurrentUser('');
    setAuthStep('email');
    setProfitAmount('');
    setAllocations([]);
    setNotes('');
  };

  // Profit plan state
  const [profitAmount, setProfitAmount] = useState('');
  const [buckets, setBuckets] = useState([
    { id: 1, name: 'Your Bonus', percentage: 40, color: 'from-pink-500 to-rose-500', account: 'Owner Draw' },
    { id: 2, name: 'Taxes', percentage: 25, color: 'from-blue-500 to-cyan-500', account: 'Tax Savings Account' },
    { id: 3, name: 'Savings', percentage: 15, color: 'from-purple-500 to-violet-500', account: 'Business Savings' },
    { id: 4, name: 'Reinvestment', percentage: 20, color: 'from-orange-500 to-amber-500', account: 'Operating Account' }
  ]);
  
  const [allocations, setAllocations] = useState([]);
  const [notes, setNotes] = useState('');
  // Profit plan state
  const [profitAmount, setProfitAmount] = useState('');
  const [buckets, setBuckets] = useState([
    { id: 1, name: 'Your Bonus', percentage: 40, color: 'from-pink-500 to-rose-500', account: 'Owner Draw' },
    { id: 2, name: 'Taxes', percentage: 25, color: 'from-blue-500 to-cyan-500', account: 'Tax Savings Account' },
    { id: 3, name: 'Savings', percentage: 15, color: 'from-purple-500 to-violet-500', account: 'Business Savings' },
    { id: 4, name: 'Reinvestment', percentage: 20, color: 'from-orange-500 to-amber-500', account: 'Operating Account' }
  ]);
    const updated = buckets.map(b => 
      b.id === id ? { ...b, percentage: parseFloat(newPercentage) || 0 } : b
    );
    setBuckets(updated);
  };

  const updateBucketName = (id, newName) => {
    const updated = buckets.map(b => 
      b.id === id ? { ...b, name: newName } : b
    );
    setBuckets(updated);
  };

  const updateBucketAccount = (id, newAccount) => {
    const updated = buckets.map(b => 
      b.id === id ? { ...b, account: newAccount } : b
    );
    setBuckets(updated);
  };

  const addBucket = () => {
    const newBucket = {
      id: Date.now(),
      name: 'New Bucket',
      percentage: 0,
      color: 'from-gray-500 to-gray-600',
      account: 'Account Name'
    };
    setBuckets([...buckets, newBucket]);
  };

  const deleteBucket = (id) => {
    setBuckets(buckets.filter(b => b.id !== id));
  };

  const calculateAllocations = () => {
    const profit = parseFloat(profitAmount) || 0;
    
    const calculated = buckets.map(bucket => ({
      bucketName: bucket.name,
      percentage: bucket.percentage,
      amount: (profit * bucket.percentage) / 100,
      account: bucket.account
    }));

    setAllocations(calculated);
  };

  const totalPercentage = buckets.reduce((sum, b) => sum + b.percentage, 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

  const generateJournalEntryCSV = () => {
    if (allocations.length === 0) {
      alert('Please calculate allocations first!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const memo = notes || 'Profit allocation transfer';
    
    // CSV Header (QuickBooks format - works with most accounting software)
    let csv = '*Date,*Account,Debit,Credit,*Description,Name\n';
    
    // Credit the operating account (source)
    const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);
    csv += `${today},Operating Account,,${totalAmount.toFixed(2)},"${memo}",\n`;
    
    // Debit each allocation bucket
    allocations.forEach(allocation => {
      if (allocation.amount > 0) {
        csv += `${today},${allocation.account},${allocation.amount.toFixed(2)},,"${memo} - ${allocation.bucketName}",\n`;
      }
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-allocation-${today}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateDetailedReport = () => {
    if (allocations.length === 0) {
      alert('Please calculate allocations first!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    let report = `Profit Allocation Report\n`;
    report += `Date: ${today}\n`;
    report += `User: ${currentUser}\n`;
    report += `\n`;
    report += `Total Profit: $${parseFloat(profitAmount).toFixed(2)}\n`;
    report += `\n`;
    report += `Allocations:\n`;
    report += `----------------------------------------\n`;
    
    allocations.forEach(a => {
      report += `${a.bucketName.padEnd(25)} ${a.percentage.toFixed(1)}%  $${a.amount.toFixed(2).padStart(12)}\n`;
    });
    
    report += `----------------------------------------\n`;
    report += `Total Allocated: $${totalAllocated.toFixed(2)}\n`;
    report += `\n`;
    
    if (notes) {
      report += `Notes: ${notes}\n`;
    }
    
    report += `\n`;
    report += `Journal Entry Instructions:\n`;
    report += `1. Import the CSV file into your accounting software\n`;
    report += `2. Review the entries for accuracy\n`;
    report += `3. Post the journal entry\n`;
    report += `4. Make the actual bank transfers\n`;
    report += `5. Match the transfers in your bank feed\n`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-allocation-report-${today}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const saveBucketConfig = () => {
    const users = { ...savedUsers };
    users[currentUser].buckets = buckets;
    setSavedUsers(users);
    localStorage.setItem('profit_plan_users', JSON.stringify(users));
    alert('Bucket configuration saved! ✨');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@600;800&display=swap');
          * { font-family: 'DM Sans', sans-serif; }
          .heading-font { font-family: 'Outfit', sans-serif; }
          .gradient-text {
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
        `}</style>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-4xl font-black heading-font gradient-text mb-2">
              Profit Plan Allocator
            </h1>
            <p className="text-gray-600">Plan your profit, get your journal entry</p>
          </div>

          {/* Step 1: Enter Email */}
          {authStep === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMagicLink()}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold text-center">
                  {authError}
                </div>
              )}

              <button
                onClick={sendMagicLink}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
              >
                Send Magic Link
              </button>

              <div className="text-center text-sm text-gray-500 mt-4">
                We'll send you a magic link to sign in. No password needed! ✨
              </div>
            </div>
          )}

          {/* Step 2: Check Email */}
          {authStep === 'check-email' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📧</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Check your email!</h2>
                <p className="text-gray-600">
                  We sent a magic code to <strong>{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Enter 6-digit code</label>
                <input
                  type="text"
                  value={magicCode}
                  onChange={(e) => setMagicCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyPress={(e) => e.key === 'Enter' && magicCode.length === 6 && verifyMagicLink()}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-center text-3xl tracking-widest font-bold"
                  maxLength="6"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold text-center">
                  {authError}
                </div>
              )}

              <button
                onClick={() => verifyMagicLink()}
                disabled={magicCode.length !== 6}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify & Sign In
              </button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setAuthStep('email');
                    setMagicCode('');
                    setAuthError('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                >
                  ← Use different email
                </button>
                <span className="mx-3 text-gray-300">|</span>
                <button
                  onClick={sendMagicLink}
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Resend code
                </button>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 text-sm text-blue-900">
                <strong>📝 Demo Mode:</strong> The magic code is shown in an alert and in your browser console. 
                In production, this would be sent to your email.
              </div>
            </div>
          )}

          {/* Step 3: Verifying (auto-triggered from URL) */}
          {authStep === 'verify' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying...</h2>
              <p className="text-gray-600">Please wait while we sign you in</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 md:p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@600;800&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .heading-font { font-family: 'Outfit', sans-serif; }
        .gradient-text {
          background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black heading-font gradient-text mb-2">
              Profit Plan Allocator 💰
            </h1>
            <p className="text-gray-600">Hey! Let's allocate your profit.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Profit Input */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-green-500" size={32} />
            <h2 className="text-2xl font-black heading-font text-gray-800">Enter Your Profit</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Profit Amount</label>
              <input
                type="number"
                value={profitAmount}
                onChange={(e) => setProfitAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-2xl font-bold"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Q4 2024 profit allocation"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Buckets Configuration */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PieChart className="text-purple-500" size={32} />
              <h2 className="text-2xl font-black heading-font text-gray-800">Your Profit Buckets</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveBucketConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
              >
                <Save size={18} />
                Save Config
              </button>
              <button
                onClick={addBucket}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all"
              >
                <Plus size={18} />
                Add Bucket
              </button>
            </div>
          </div>

          {totalPercentage !== 100 && (
            <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
              <p className="text-orange-700 font-semibold">
                ⚠️ Total percentage is {totalPercentage.toFixed(1)}% - should be 100%
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buckets.map(bucket => (
              <div key={bucket.id} className="bg-white rounded-2xl p-5 shadow-md border-2 border-gray-100">
                <div className={`w-full h-2 bg-gradient-to-r ${bucket.color} rounded-full mb-4`} />
                
                <div className="space-y-3">
                  <input
                    type="text"
                    value={bucket.name}
                    onChange={(e) => updateBucketName(bucket.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none font-bold"
                  />
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Percentage</label>
                      <input
                        type="number"
                        value={bucket.percentage}
                        onChange={(e) => updateBucketPercentage(bucket.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none font-bold"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                    </div>
                    
                    {profitAmount && (
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Amount</label>
                        <div className="px-3 py-2 bg-gray-50 rounded-lg font-bold text-purple-600">
                          ${((parseFloat(profitAmount) * bucket.percentage) / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Account Name (for journal entry)</label>
                    <input
                      type="text"
                      value={bucket.account}
                      onChange={(e) => updateBucketAccount(bucket.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                      placeholder="e.g., Owner Draw, Tax Savings"
                    />
                  </div>
                  
                  <button
                    onClick={() => deleteBucket(bucket.id)}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-all text-sm"
                  >
                    Delete Bucket
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={calculateAllocations}
            disabled={!profitAmount || totalPercentage !== 100}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-black text-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp className="inline mr-2" size={24} />
            Calculate Allocations
          </button>
        </div>

        {/* Results */}
        {allocations.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-blue-500" size={32} />
              <h2 className="text-2xl font-black heading-font text-gray-800">Your Allocation Plan</h2>
            </div>

            <div className="mb-6 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl border-2 border-purple-200">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700 mb-2">Total Profit to Allocate</div>
                <div className="text-5xl font-black text-purple-600 heading-font">
                  ${parseFloat(profitAmount).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {allocations.map(allocation => (
                <div key={allocation.bucketName} className="bg-white rounded-xl p-5 shadow-md border-2 border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800 text-lg">{allocation.bucketName}</span>
                    <span className="text-sm font-semibold text-purple-600">{allocation.percentage}%</span>
                  </div>
                  <div className="text-3xl font-black text-green-600 heading-font mb-2">
                    ${allocation.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">→ {allocation.account}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={generateJournalEntryCSV}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                <Download size={24} />
                Download Journal Entry CSV
              </button>
              
              <button
                onClick={generateDetailedReport}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                <FileText size={24} />
                Download Report
              </button>
            </div>

            <div className="mt-6 p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
              <p className="text-sm text-blue-900 leading-relaxed">
                <strong>Next steps:</strong> Import the CSV into QuickBooks/Xero/Wave/FreshBooks. 
                The journal entry will record the allocation. Then make your actual bank transfers. 
                When the transfers show up in your bank feed, just match them to the journal entry. Done! ✨
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600">
          <p className="font-medium">Made with ✨ by @YourGayCFO</p>
          <p className="text-sm mt-2">Simple profit planning, export-ready 💅</p>
        </div>
      </div>
    </div>
  );
};

export default ProfitPlanAllocator;

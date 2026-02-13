import React, { useEffect, useMemo, useState } from 'react';
import { Download, LogOut, DollarSign, TrendingUp, PieChart, FileText, Save, Plus } from 'lucide-react';
import { supabase } from './supabaseClient.js';

const DEFAULT_BUCKETS = [
  { id: 1, name: 'Your Bonus', percentage: 40, color: 'from-pink-500 to-rose-500', account: 'Owner Draw' },
  { id: 2, name: 'Taxes', percentage: 25, color: 'from-blue-500 to-cyan-500', account: 'Tax Savings Account' },
  { id: 3, name: 'Savings', percentage: 15, color: 'from-purple-500 to-violet-500', account: 'Business Savings' },
  { id: 4, name: 'Reinvestment', percentage: 20, color: 'from-orange-500 to-amber-500', account: 'Operating Account' }
];

const ProfitPlanAllocator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState('email');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [profitAmount, setProfitAmount] = useState('');
  const [buckets, setBuckets] = useState(DEFAULT_BUCKETS);
  const [allocations, setAllocations] = useState([]);
  const [notes, setNotes] = useState('');
  const [dataStatus, setDataStatus] = useState('');

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        setAuthError(error.message);
      }

      if (data?.session?.user) {
        setIsAuthenticated(true);
        setCurrentUser(data.session.user.email || '');
        await loadUserBuckets(data.session.user);
      }

      setIsAuthLoading(false);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUser(session.user.email || '');
        await loadUserBuckets(session.user);
        setAuthStep('email');
        setAuthError('');
      } else {
        setIsAuthenticated(false);
        setCurrentUser('');
        setBuckets(DEFAULT_BUCKETS);
        setProfitAmount('');
        setAllocations([]);
        setNotes('');
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const loadUserBuckets = async (user) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profit_plan_profiles')
      .select('buckets')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      setDataStatus('Could not load your saved buckets. Using defaults.');
      setBuckets(DEFAULT_BUCKETS);
      return;
    }

    if (data?.buckets?.length) {
      setBuckets(data.buckets);
    } else {
      setBuckets(DEFAULT_BUCKETS);
      await saveBucketConfig(DEFAULT_BUCKETS, user);
    }
  };

  const saveBucketConfig = async (nextBuckets = buckets, userOverride) => {
    const user = userOverride || (await supabase.auth.getUser()).data?.user;
    if (!user) {
      setDataStatus('Please sign in to save your bucket configuration.');
      return;
    }

    const payload = {
      user_id: user.id,
      email: user.email,
      buckets: nextBuckets,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('profit_plan_profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      setDataStatus('Save failed. Please try again.');
      return;
    }

    setDataStatus('Bucket configuration saved.');
  };

  const sendMagicLink = async () => {
    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email');
      return;
    }

    setAuthError('');
    setAuthStep('check-email');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setAuthError(error.message);
      setAuthStep('email');
    }
  };

  const handleLogout = async () => {
    await saveBucketConfig();
    await supabase.auth.signOut();
  };

  const updateBucketPercentage = (id, newPercentage) => {
    const updated = buckets.map((bucket) =>
      bucket.id === id
        ? { ...bucket, percentage: parseFloat(newPercentage) || 0 }
        : bucket
    );
    setBuckets(updated);
  };

  const updateBucketName = (id, newName) => {
    const updated = buckets.map((bucket) =>
      bucket.id === id ? { ...bucket, name: newName } : bucket
    );
    setBuckets(updated);
  };

  const updateBucketAccount = (id, newAccount) => {
    const updated = buckets.map((bucket) =>
      bucket.id === id ? { ...bucket, account: newAccount } : bucket
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
    setBuckets(buckets.filter((bucket) => bucket.id !== id));
  };

  const calculateAllocations = () => {
    const profit = parseFloat(profitAmount) || 0;

    const calculated = buckets.map((bucket) => ({
      bucketName: bucket.name,
      percentage: bucket.percentage,
      amount: (profit * bucket.percentage) / 100,
      account: bucket.account
    }));

    setAllocations(calculated);
  };

  const totalPercentage = useMemo(
    () => buckets.reduce((sum, bucket) => sum + bucket.percentage, 0),
    [buckets]
  );
  const totalAllocated = useMemo(
    () => allocations.reduce((sum, allocation) => sum + allocation.amount, 0),
    [allocations]
  );

  const generateJournalEntryCSV = () => {
    if (allocations.length === 0) {
      alert('Please calculate allocations first!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const memo = notes || 'Profit allocation transfer';

    let csv = '*Date,*Account,Debit,Credit,*Description,Name\n';

    const totalAmount = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    csv += `${today},Operating Account,,${totalAmount.toFixed(2)},"${memo}",\n`;

    allocations.forEach((allocation) => {
      if (allocation.amount > 0) {
        csv += `${today},${allocation.account},${allocation.amount.toFixed(2)},,"${memo} - ${allocation.bucketName}",\n`;
      }
    });

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

    let report = 'Profit Allocation Report\n';
    report += `Date: ${today}\n`;
    report += `User: ${currentUser}\n\n`;
    report += `Total Profit: $${parseFloat(profitAmount).toFixed(2)}\n\n`;
    report += 'Allocations:\n';
    report += '----------------------------------------\n';

    allocations.forEach((allocation) => {
      report += `${allocation.bucketName.padEnd(25)} ${allocation.percentage.toFixed(1)}%  $${allocation.amount
        .toFixed(2)
        .padStart(12)}\n`;
    });

    report += '----------------------------------------\n';
    report += `Total Allocated: $${totalAllocated.toFixed(2)}\n\n`;

    if (notes) {
      report += `Notes: ${notes}\n`;
    }

    report += '\n';
    report += 'Journal Entry Instructions:\n';
    report += '1. Import the CSV file into your accounting software\n';
    report += '2. Review the entries for accuracy\n';
    report += '3. Post the journal entry\n';
    report += '4. Make the actual bank transfers\n';
    report += '5. Match the transfers in your bank feed\n';

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-allocation-report-${today}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-700 font-semibold">Loading...</div>
      </div>
    );
  }

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

          {authStep === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMagicLink()}
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
                We will email you a secure sign-in link.
              </div>
            </div>
          )}

          {authStep === 'check-email' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📧</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Check your email!</h2>
                <p className="text-gray-600">
                  We sent a sign-in link to <strong>{email}</strong>
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold text-center">
                  {authError}
                </div>
              )}

              <button
                onClick={() => setAuthStep('email')}
                className="w-full py-3 border-2 border-purple-300 text-purple-600 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all"
              >
                Use a different email
              </button>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black heading-font gradient-text mb-2">
              Profit Plan Allocator
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

        {dataStatus && (
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-900 font-semibold">
            {dataStatus}
          </div>
        )}

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

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PieChart className="text-purple-500" size={32} />
              <h2 className="text-2xl font-black heading-font text-gray-800">Your Profit Buckets</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => saveBucketConfig()}
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
                Total percentage is {totalPercentage.toFixed(1)}% - should be 100%
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buckets.map((bucket) => (
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
              {allocations.map((allocation) => (
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
                When the transfers show up in your bank feed, just match them to the journal entry. Done.
              </p>
            </div>
          </div>
        )}

        <div className="text-center mt-12 text-gray-600">
          <p className="font-medium">Made with care by YourGayCFO</p>
          <p className="text-sm mt-2">Simple profit planning, export-ready</p>
        </div>
      </div>
    </div>
  );
};

export default ProfitPlanAllocator;

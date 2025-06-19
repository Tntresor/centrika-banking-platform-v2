import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/auth';

interface LedgerEntry {
  id: number;
  transactionId: number;
  entryType: string;
  accountType: string;
  accountId: number;
  amount: string;
  currency: string;
  description: string;
  reference: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
  transaction?: {
    id: number;
    type: string;
    status: string;
    description: string;
  };
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netPosition: number;
  entriesCount: number;
  accountBreakdown: {
    [key: string]: {
      debits: number;
      credits: number;
      balance: number;
    };
  };
}

export default function MicroLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    accountType: '',
    entryType: '',
    search: ''
  });

  useEffect(() => {
    fetchLedgerData();
  }, [dateRange, filters]);

  const fetchLedgerData = async () => {
    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...filters
      });

      const [entriesRes, summaryRes] = await Promise.all([
        apiRequest(`/api/admin/ledger/entries?${queryParams}`),
        apiRequest(`/api/admin/ledger/summary?${queryParams}`)
      ]);

      setEntries(entriesRes.data || []);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to fetch ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLedger = async () => {
    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'csv'
      });

      const response = await apiRequest(`/api/admin/ledger/export?${queryParams}`);
      
      // Create and download CSV file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger_${dateRange.startDate}_${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export ledger:', error);
    }
  };

  const reconcileDay = async (date: string) => {
    try {
      await apiRequest('/api/admin/ledger/reconcile', {
        method: 'POST',
        body: JSON.stringify({ date })
      });
      fetchLedgerData();
    } catch (error) {
      console.error('Failed to reconcile:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Micro-Ledger</h1>
          <div className="flex space-x-3">
            <button
              onClick={exportLedger}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Export CSV
            </button>
            <button
              onClick={() => reconcileDay(dateRange.endDate)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Reconcile Today
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <select
                value={filters.accountType}
                onChange={(e) => setFilters({...filters, accountType: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="user_wallet">User Wallets</option>
                <option value="agent_float">Agent Float</option>
                <option value="bank_nostro">Bank Nostro</option>
                <option value="commission">Commission</option>
                <option value="fee">Fees</option>
                <option value="tax">Tax</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Entry Type</label>
              <select
                value={filters.entryType}
                onChange={(e) => setFilters({...filters, entryType: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Debits</h3>
              <p className="text-2xl font-bold text-red-600">
                {summary.totalDebits.toLocaleString()} RWF
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Credits</h3>
              <p className="text-2xl font-bold text-green-600">
                {summary.totalCredits.toLocaleString()} RWF
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Net Position</h3>
              <p className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.netPosition.toLocaleString()} RWF
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Entries</h3>
              <p className="text-2xl font-bold text-gray-900">
                {summary.entriesCount.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Account Breakdown */}
        {summary?.accountBreakdown && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Account Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(summary.accountBreakdown).map(([accountType, data]) => (
                      <tr key={accountType}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {accountType.replace('_', ' ').toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {data.debits.toLocaleString()} RWF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {data.credits.toLocaleString()} RWF
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          data.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {data.balance.toLocaleString()} RWF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Ledger Entries */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Ledger Entries
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">TXN-{entry.transactionId}</div>
                          {entry.transaction && (
                            <div className="text-xs text-gray-500">
                              {entry.transaction.type} • {entry.transaction.status}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {entry.accountType.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-500">ID: {entry.accountId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{entry.description}</div>
                        {entry.reference && (
                          <div className="text-xs text-gray-500">Ref: {entry.reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {entry.entryType === 'debit' ? 
                          `${parseFloat(entry.amount).toLocaleString()} RWF` : 
                          '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {entry.entryType === 'credit' ? 
                          `${parseFloat(entry.amount).toLocaleString()} RWF` : 
                          '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(entry.balanceAfter).toLocaleString()} RWF
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {entries.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No ledger entries found for the selected criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
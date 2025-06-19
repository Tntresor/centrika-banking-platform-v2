import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/auth';

interface NostroAccount {
  id: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  currentBalance: string;
  availableBalance: string;
  minimumBalance: string;
  currency: string;
  isActive: boolean;
  lastReconciled: string;
}

interface CashMovement {
  id: number;
  type: string;
  amount: string;
  description: string;
  fromAccount?: string;
  toAccount?: string;
  reference: string;
  status: string;
  createdAt: string;
}

export default function CashManagement() {
  const [nostroAccounts, setNostroAccounts] = useState<NostroAccount[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    reference: ''
  });

  useEffect(() => {
    fetchCashData();
  }, []);

  const fetchCashData = async () => {
    try {
      const [accountsRes, movementsRes] = await Promise.all([
        apiRequest('/api/admin/nostro-accounts'),
        apiRequest('/api/admin/cash-movements')
      ]);
      
      setNostroAccounts(accountsRes.data || []);
      setCashMovements(movementsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch cash data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/cash-transfer', {
        method: 'POST',
        body: JSON.stringify(transferData)
      });
      setShowTransferForm(false);
      setTransferData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        description: '',
        reference: ''
      });
      fetchCashData();
    } catch (error) {
      console.error('Failed to process transfer:', error);
    }
  };

  const handleReconciliation = async (accountId: number) => {
    try {
      await apiRequest(`/api/admin/nostro-accounts/${accountId}/reconcile`, {
        method: 'POST'
      });
      fetchCashData();
    } catch (error) {
      console.error('Failed to reconcile account:', error);
    }
  };

  const totalBalance = nostroAccounts.reduce((sum, acc) => 
    sum + parseFloat(acc.currentBalance || '0'), 0
  );

  const totalAvailable = nostroAccounts.reduce((sum, acc) => 
    sum + parseFloat(acc.availableBalance || '0'), 0
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Cash Management</h1>
          <button
            onClick={() => setShowTransferForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            New Transfer
          </button>
        </div>

        {/* Cash Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Balance</h3>
            <p className="text-2xl font-bold text-gray-900">
              {totalBalance.toLocaleString()} RWF
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Available Balance</h3>
            <p className="text-2xl font-bold text-green-600">
              {totalAvailable.toLocaleString()} RWF
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Reserved Funds</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {(totalBalance - totalAvailable).toLocaleString()} RWF
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Accounts</h3>
            <p className="text-2xl font-bold text-blue-600">
              {nostroAccounts.filter(acc => acc.isActive).length}
            </p>
          </div>
        </div>

        {/* Nostro Accounts */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Nostro Accounts
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Reconciled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nostroAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {account.accountName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {account.bankName} • {account.accountNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.accountType === 'nostro' ? 'bg-blue-100 text-blue-800' :
                          account.accountType === 'settlement' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {account.accountType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(account.currentBalance).toLocaleString()} {account.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(account.availableBalance).toLocaleString()} {account.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.lastReconciled ? 
                          new Date(account.lastReconciled).toLocaleDateString() : 
                          'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleReconciliation(account.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Reconcile
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Cash Movements */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Cash Movements
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cashMovements.slice(0, 10).map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          movement.type === 'transfer_in' ? 'bg-green-100 text-green-800' :
                          movement.type === 'transfer_out' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {movement.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(movement.amount).toLocaleString()} RWF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          movement.status === 'completed' ? 'bg-green-100 text-green-800' :
                          movement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {movement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Transfer Modal */}
        {showTransferForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">New Cash Transfer</h3>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Account</label>
                  <select
                    value={transferData.fromAccountId}
                    onChange={(e) => setTransferData({...transferData, fromAccountId: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select account</option>
                    {nostroAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - {acc.bankName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Account</label>
                  <select
                    value={transferData.toAccountId}
                    onChange={(e) => setTransferData({...transferData, toAccountId: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select account</option>
                    {nostroAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - {acc.bankName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (RWF)</label>
                  <input
                    type="number"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={transferData.description}
                    onChange={(e) => setTransferData({...transferData, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <input
                    type="text"
                    value={transferData.reference}
                    onChange={(e) => setTransferData({...transferData, reference: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTransferForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/auth';

interface Agent {
  id: number;
  agentCode: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  district: string;
  sector: string;
  status: string;
  commissionRate: string;
  cashLimit: string;
  kycStatus: string;
  createdAt: string;
  float?: {
    availableBalance: string;
    totalBalance: string;
    currency: string;
  };
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    address: '',
    commissionRate: '0.0025',
    cashLimit: '500000'
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await apiRequest('/api/admin/agents');
      setAgents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/agents', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowAddForm(false);
      setFormData({
        businessName: '',
        ownerName: '',
        phone: '',
        email: '',
        district: '',
        sector: '',
        cell: '',
        village: '',
        address: '',
        commissionRate: '0.0025',
        cashLimit: '500000'
      });
      fetchAgents();
    } catch (error) {
      console.error('Failed to add agent:', error);
    }
  };

  const handleStatusChange = async (agentId: number, newStatus: string) => {
    try {
      await apiRequest(`/api/admin/agents/${agentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchAgents();
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  const handleFloatTopup = async (agentId: number, amount: string) => {
    try {
      await apiRequest(`/api/admin/agents/${agentId}/float`, {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      fetchAgents();
    } catch (error) {
      console.error('Failed to topup float:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Agent Network Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Agent
          </button>
        </div>

        {/* Agent Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Agents</h3>
            <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Agents</h3>
            <p className="text-2xl font-bold text-green-600">
              {agents.filter(a => a.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Pending KYC</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {agents.filter(a => a.kycStatus === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Float</h3>
            <p className="text-2xl font-bold text-blue-600">
              {agents.reduce((sum, a) => sum + parseFloat(a.float?.totalBalance || '0'), 0).toLocaleString()} RWF
            </p>
          </div>
        </div>

        {/* Agents Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Float Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {agent.businessName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {agent.agentCode} • {agent.ownerName}
                            </div>
                            <div className="text-sm text-gray-500">{agent.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agent.district}</div>
                        <div className="text-sm text-gray-500">{agent.sector}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          agent.status === 'active' ? 'bg-green-100 text-green-800' :
                          agent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          agent.status === 'suspended' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.float ? (
                          <div>
                            <div>{parseFloat(agent.float.availableBalance).toLocaleString()} RWF</div>
                            <div className="text-xs text-gray-500">
                              Total: {parseFloat(agent.float.totalBalance).toLocaleString()} RWF
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No float</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(parseFloat(agent.commissionRate) * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedAgent(agent)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {agent.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(agent.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                        {agent.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(agent.id, 'suspended')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Agent Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Agent</h3>
              <form onSubmit={handleAddAgent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sector</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({...formData, sector: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add Agent
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
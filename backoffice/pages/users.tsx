import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  Select,
  HStack,
  VStack,
  Card,
  CardBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { ViewIcon, EditIcon } from '@chakra-ui/icons';
import Layout from '../components/Layout';
import UserSearch from '../components/UserSearch';
import { isAuthenticated, getAuthToken } from '../utils/auth';

interface User {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
}

interface UserDetails extends User {
  wallet?: {
    balance: string;
    currency: string;
    isActive: boolean;
  };
  kycDocuments: Array<{
    id: number;
    documentType: string;
    verificationStatus: string;
    verificationScore: number;
    reviewNotes: string;
    createdAt: string;
  }>;
  cards: Array<{
    id: number;
    maskedPan: string;
    cardType: string;
    isActive: boolean;
    createdAt: string;
  }>;
  recentTransactions: Array<{
    id: number;
    amount: string;
    type: string;
    status: string;
    description: string;
    createdAt: string;
  }>;
}

export default function Users() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadUsers();
  }, [router, searchQuery, statusFilter, currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const params = new URLSearchParams({
        query: searchQuery,
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.data || []);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: number) => {
    try {
      setUserDetailsLoading(true);
      const token = getAuthToken();

      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load user details');
      }

      const data = await response.json();
      if (data.success) {
        setSelectedUser(data.data);
        onOpen();
      } else {
        setError(data.error || 'Failed to load user details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      approved: 'green',
      pending: 'yellow',
      rejected: 'red',
    };
    
    return (
      <Badge colorScheme={colors[status as keyof typeof colors] || 'gray'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string, currency: string = 'RWF') => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Layout>
      <Container maxW="7xl" py={6}>
        <Box mb={8}>
          <Heading size="lg" mb={2}>
            User Management
          </Heading>
          <Text color="gray.600">
            Search and manage Centrika users
          </Text>
        </Box>

        {error && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Card bg={bg} border="1px" borderColor={borderColor} mb={6}>
          <CardBody>
            <UserSearch
              onSearch={(query, status) => {
                setSearchQuery(query);
                setStatusFilter(status);
                setCurrentPage(1);
              }}
            />
          </CardBody>
        </Card>

        <Card bg={bg} border="1px" borderColor={borderColor}>
          <CardBody>
            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4} color="gray.600">Loading users...</Text>
              </Box>
            ) : users.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.600">No users found</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th>Email</Th>
                    <Th>KYC Status</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((user) => (
                    <Tr key={user.id}>
                      <Td fontWeight="medium">
                        {user.firstName} {user.lastName}
                      </Td>
                      <Td>{user.phone}</Td>
                      <Td>{user.email || '-'}</Td>
                      <Td>{getStatusBadge(user.kycStatus)}</Td>
                      <Td>
                        <Badge colorScheme={user.isActive ? 'green' : 'red'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td>{formatDate(user.createdAt)}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label="View Details">
                            <IconButton
                              aria-label="View user details"
                              icon={<ViewIcon />}
                              size="sm"
                              variant="ghost"
                              onClick={() => loadUserDetails(user.id)}
                              isLoading={userDetailsLoading}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* User Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              User Details
              {selectedUser && (
                <Text fontSize="sm" fontWeight="normal" color="gray.600">
                  {selectedUser.firstName} {selectedUser.lastName}
                </Text>
              )}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedUser && (
                <VStack spacing={6} align="stretch">
                  {/* Basic Info */}
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={4}>Basic Information</Heading>
                      <VStack spacing={3} align="stretch">
                        <HStack justify="space-between">
                          <Text fontWeight="medium">Phone:</Text>
                          <Text>{selectedUser.phone}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="medium">Email:</Text>
                          <Text>{selectedUser.email || 'Not provided'}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="medium">KYC Status:</Text>
                          {getStatusBadge(selectedUser.kycStatus)}
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="medium">Account Status:</Text>
                          <Badge colorScheme={selectedUser.isActive ? 'green' : 'red'}>
                            {selectedUser.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="medium">Joined:</Text>
                          <Text>{formatDate(selectedUser.createdAt)}</Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Wallet Info */}
                  {selectedUser.wallet && (
                    <Card>
                      <CardBody>
                        <Heading size="sm" mb={4}>Wallet Information</Heading>
                        <VStack spacing={3} align="stretch">
                          <HStack justify="space-between">
                            <Text fontWeight="medium">Balance:</Text>
                            <Text fontSize="lg" fontWeight="bold" color="blue.500">
                              {formatCurrency(selectedUser.wallet.balance, selectedUser.wallet.currency)}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="medium">Status:</Text>
                            <Badge colorScheme={selectedUser.wallet.isActive ? 'green' : 'red'}>
                              {selectedUser.wallet.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}

                  {/* Recent Transactions */}
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={4}>Recent Transactions</Heading>
                      {selectedUser.recentTransactions.length === 0 ? (
                        <Text color="gray.600">No transactions yet</Text>
                      ) : (
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Amount</Th>
                              <Th>Type</Th>
                              <Th>Status</Th>
                              <Th>Date</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {selectedUser.recentTransactions.slice(0, 5).map((tx) => (
                              <Tr key={tx.id}>
                                <Td>{formatCurrency(tx.amount)}</Td>
                                <Td>
                                  <Badge variant="outline">
                                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge colorScheme={tx.status === 'completed' ? 'green' : 'yellow'}>
                                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                  </Badge>
                                </Td>
                                <Td>{formatDate(tx.createdAt)}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      )}
                    </CardBody>
                  </Card>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </Layout>
  );
}

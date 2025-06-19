import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  VStack,
  Select,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  useColorModeValue,
  Code,
  Collapse,
  IconButton,
  useDisclosure,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import Layout from '../components/Layout';
import { isAuthenticated, getAuthToken } from '../utils/auth';

interface AuditLog {
  id: number;
  userId?: number;
  adminUserId?: number;
  action: string;
  entity: string;
  entityId?: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function Audit() {
  const router = useRouter();
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadAuditLogs();
  }, [router, currentPage, filterAction, filterEntity]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });

      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load audit logs');
      }

      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data || []);
      } else {
        setError(data.error || 'Failed to load audit logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: { [key: string]: string } = {
      'kyc_review': 'blue',
      'wallet_adjustment': 'orange',
      'user_update': 'green',
      'login': 'purple',
      'transaction': 'teal',
    };
    
    return (
      <Badge colorScheme={colors[action] || 'gray'}>
        {action.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getEntityBadge = (entity: string) => {
    const colors: { [key: string]: string } = {
      'user': 'blue',
      'wallet': 'green',
      'transaction': 'purple',
      'kyc_document': 'orange',
      'card': 'teal',
    };
    
    return (
      <Badge variant="outline" colorScheme={colors[entity] || 'gray'}>
        {entity.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const toggleRowExpansion = (logId: number) => {
    setExpandedRow(expandedRow === logId ? null : logId);
  };

  const formatJSON = (obj: any) => {
    if (!obj) return null;
    return JSON.stringify(obj, null, 2);
  };

  // Get unique actions and entities for filtering
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  const uniqueEntities = [...new Set(auditLogs.map(log => log.entity))];

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterEntity && log.entity !== filterEntity) return false;
    return true;
  });

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Layout>
      <Container maxW="7xl" py={6}>
        <Box mb={8}>
          <Heading size="lg" mb={2}>
            Audit Trail
          </Heading>
          <Text color="gray.600">
            View system audit logs and administrative actions
          </Text>
        </Box>

        {error && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card bg={bg} border="1px" borderColor={borderColor} mb={6}>
          <CardBody>
            <HStack spacing={4} align="end">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Filter by Action:</Text>
                <Select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  placeholder="All actions"
                  width="200px"
                >
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>
                      {action.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Filter by Entity:</Text>
                <Select
                  value={filterEntity}
                  onChange={(e) => setFilterEntity(e.target.value)}
                  placeholder="All entities"
                  width="200px"
                >
                  {uniqueEntities.map(entity => (
                    <option key={entity} value={entity}>
                      {entity.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Box>

              <Button
                onClick={() => {
                  setFilterAction('');
                  setFilterEntity('');
                  setCurrentPage(1);
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Audit Logs Table */}
        <Card bg={bg} border="1px" borderColor={borderColor}>
          <CardBody>
            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4} color="gray.600">Loading audit logs...</Text>
              </Box>
            ) : filteredLogs.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.600">No audit logs found</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Timestamp</Th>
                    <Th>Action</Th>
                    <Th>Entity</Th>
                    <Th>User/Admin</Th>
                    <Th>IP Address</Th>
                    <Th>Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <Tr>
                        <Td fontSize="sm">
                          {formatDate(log.createdAt)}
                        </Td>
                        <Td>{getActionBadge(log.action)}</Td>
                        <Td>{getEntityBadge(log.entity)}</Td>
                        <Td>
                          <VStack align="start" spacing={1}>
                            {log.adminUserId && (
                              <Text fontSize="sm">Admin: {log.adminUserId}</Text>
                            )}
                            {log.userId && (
                              <Text fontSize="sm">User: {log.userId}</Text>
                            )}
                            {log.entityId && (
                              <Text fontSize="sm" color="gray.600">
                                Entity ID: {log.entityId}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td fontSize="sm">{log.ipAddress || '-'}</Td>
                        <Td>
                          <IconButton
                            aria-label="Toggle details"
                            icon={expandedRow === log.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleRowExpansion(log.id)}
                          />
                        </Td>
                      </Tr>
                      
                      <Tr>
                        <Td colSpan={6} p={0}>
                          <Collapse in={expandedRow === log.id}>
                            <Box p={4} bg="gray.50" borderRadius="md" m={2}>
                              <VStack align="stretch" spacing={4}>
                                {log.userAgent && (
                                  <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                      User Agent:
                                    </Text>
                                    <Code fontSize="xs" p={2} borderRadius="md" bg="white">
                                      {log.userAgent}
                                    </Code>
                                  </Box>
                                )}

                                {log.oldValues && (
                                  <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                      Previous Values:
                                    </Text>
                                    <Code 
                                      as="pre" 
                                      fontSize="xs" 
                                      p={2} 
                                      borderRadius="md" 
                                      bg="red.50"
                                      whiteSpace="pre-wrap"
                                      overflowX="auto"
                                    >
                                      {formatJSON(log.oldValues)}
                                    </Code>
                                  </Box>
                                )}

                                {log.newValues && (
                                  <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                                      New Values:
                                    </Text>
                                    <Code 
                                      as="pre" 
                                      fontSize="xs" 
                                      p={2} 
                                      borderRadius="md" 
                                      bg="green.50"
                                      whiteSpace="pre-wrap"
                                      overflowX="auto"
                                    >
                                      {formatJSON(log.newValues)}
                                    </Code>
                                  </Box>
                                )}
                              </VStack>
                            </Box>
                          </Collapse>
                        </Td>
                      </Tr>
                    </React.Fragment>
                  ))}
                </Tbody>
              </Table>
            )}

            {/* Pagination */}
            {!loading && filteredLogs.length > 0 && (
              <HStack justify="center" mt={6} spacing={4}>
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  isDisabled={currentPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <Text fontSize="sm" color="gray.600">
                  Page {currentPage}
                </Text>
                <Button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  isDisabled={filteredLogs.length < 50}
                  variant="outline"
                >
                  Next
                </Button>
              </HStack>
            )}
          </CardBody>
        </Card>
      </Container>
    </Layout>
  );
}

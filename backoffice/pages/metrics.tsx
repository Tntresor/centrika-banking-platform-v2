import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  Select,
  HStack,
  VStack,
  Alert,
  AlertIcon,
  Spinner,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import Layout from '../components/Layout';
import { isAuthenticated, getAuthToken } from '../utils/auth';

interface MetricsData {
  dailySignups: number;
  successfulKYCRate: number;
  transactionCount: number;
  totalLedgerBalance: number;
  activeUsers: number;
}

interface BNRReportData {
  date: string;
  totalTransactions: number;
  totalVolume: number;
  userCount: number;
  kycApprovalRate: number;
}

export default function Metrics() {
  const router = useRouter();
  
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<BNRReportData | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadMetrics();
  }, [router]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load metrics');
      }

      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      } else {
        setError(data.error || 'Failed to load metrics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateBNRReport = async () => {
    try {
      setGeneratingReport(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch('/api/admin/reports/bnr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate BNR report');
      }

      const data = await response.json();
      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.error || 'Failed to generate BNR report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Layout>
      <Container maxW="7xl" py={6}>
        <Box mb={8}>
          <Heading size="lg" mb={2}>
            Platform Metrics & Reporting
          </Heading>
          <Text color="gray.600">
            View platform performance metrics and generate regulatory reports
          </Text>
        </Box>

        {error && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Key Metrics */}
        <Box mb={8}>
          <Heading size="md" mb={4}>Platform Overview</Heading>
          {loading ? (
            <Box textAlign="center" py={8}>
              <Spinner size="lg" />
              <Text mt={4} color="gray.600">Loading metrics...</Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={6}>
              <Card bg={bg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Daily Sign-ups</StatLabel>
                    <StatNumber>{metrics?.dailySignups.toLocaleString() || '0'}</StatNumber>
                    <StatHelpText>New users today</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={bg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>KYC Success Rate</StatLabel>
                    <StatNumber>{formatPercentage(metrics?.successfulKYCRate || 0)}</StatNumber>
                    <StatHelpText>Verification success</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={bg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Daily Transactions</StatLabel>
                    <StatNumber>{metrics?.transactionCount.toLocaleString() || '0'}</StatNumber>
                    <StatHelpText>Transactions today</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={bg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Total Balance</StatLabel>
                    <StatNumber fontSize="lg">
                      {formatCurrency(metrics?.totalLedgerBalance || 0)}
                    </StatNumber>
                    <StatHelpText>Platform ledger</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={bg} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Active Users</StatLabel>
                    <StatNumber>{metrics?.activeUsers.toLocaleString() || '0'}</StatNumber>
                    <StatHelpText>30-day active</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
          )}
        </Box>

        {/* BNR Reporting */}
        <Card bg={bg} border="1px" borderColor={borderColor} mb={8}>
          <CardBody>
            <Heading size="md" mb={4}>BNR Regulatory Reporting</Heading>
            <Text color="gray.600" mb={6}>
              Generate daily transaction reports for Bank of Rwanda compliance (J+1 reporting)
            </Text>

            <HStack spacing={4} mb={6}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Select Date:</Text>
                <Select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  width="200px"
                >
                  {/* Generate last 30 days */}
                  {Array.from({ length: 30 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateString = date.toISOString().split('T')[0];
                    return (
                      <option key={dateString} value={dateString}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </option>
                    );
                  })}
                </Select>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>&nbsp;</Text>
                <Button
                  leftIcon={<DownloadIcon />}
                  colorScheme="blue"
                  onClick={generateBNRReport}
                  isLoading={generatingReport}
                  loadingText="Generating..."
                >
                  Generate Report
                </Button>
              </Box>
            </HStack>

            {reportData && (
              <Card bg="blue.50" border="1px" borderColor="blue.200">
                <CardBody>
                  <Heading size="sm" mb={4}>
                    BNR Report - {formatDate(reportData.date)}
                  </Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="gray.600">Total Transactions</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {reportData.totalTransactions.toLocaleString()}
                      </Text>
                    </VStack>
                    
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="gray.600">Transaction Volume</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {formatCurrency(reportData.totalVolume)}
                      </Text>
                    </VStack>
                    
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="gray.600">Active Users</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {reportData.userCount.toLocaleString()}
                      </Text>
                    </VStack>
                    
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="gray.600">KYC Approval Rate</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {formatPercentage(reportData.kycApprovalRate)}
                      </Text>
                    </VStack>
                  </SimpleGrid>

                  <Box mt={4} p={3} bg="yellow.100" borderRadius="md">
                    <Text fontSize="sm" color="yellow.800">
                      <strong>Note:</strong> This report has been generated and saved to the designated BNR reporting folder. 
                      The CSV file follows the required YYYYMMDD.csv naming convention.
                    </Text>
                  </Box>
                </CardBody>
              </Card>
            )}
          </CardBody>
        </Card>

        {/* Compliance Status */}
        <Card bg={bg} border="1px" borderColor={borderColor}>
          <CardBody>
            <Heading size="md" mb={4}>Compliance Status</Heading>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Compliance Item</Th>
                  <Th>Status</Th>
                  <Th>Last Updated</Th>
                  <Th>Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>BNR Tier II Limits</Td>
                  <Td>
                    <Badge colorScheme="green">Compliant</Badge>
                  </Td>
                  <Td>{new Date().toLocaleDateString()}</Td>
                  <Td>Single txn: 1M RWF, Daily: 1M RWF, Balance: 2M RWF</Td>
                </Tr>
                <Tr>
                  <Td>J+1 Reporting</Td>
                  <Td>
                    <Badge colorScheme="green">Active</Badge>
                  </Td>
                  <Td>{new Date().toLocaleDateString()}</Td>
                  <Td>Automated daily reports at 09:00</Td>
                </Tr>
                <Tr>
                  <Td>KYC Verification</Td>
                  <Td>
                    <Badge colorScheme="green">Operational</Badge>
                  </Td>
                  <Td>{new Date().toLocaleDateString()}</Td>
                  <Td>AWS Rekognition + Manual review fallback</Td>
                </Tr>
                <Tr>
                  <Td>PII Data Protection</Td>
                  <Td>
                    <Badge colorScheme="green">Compliant</Badge>
                  </Td>
                  <Td>{new Date().toLocaleDateString()}</Td>
                  <Td>24h auto-purge for KYC documents</Td>
                </Tr>
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Container>
    </Layout>
  );
}

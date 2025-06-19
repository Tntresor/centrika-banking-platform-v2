import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Grid,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  SimpleGrid,
  Card,
  CardBody,
} from '@chakra-ui/react';
import Layout from '../components/Layout';
import MetricsPanel from '../components/MetricsPanel';
import { isAuthenticated, getAuthToken } from '../utils/auth';

interface DashboardMetrics {
  dailySignups: number;
  successfulKYCRate: number;
  transactionCount: number;
  totalLedgerBalance: number;
  activeUsers: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Layout>
      <Container maxW="7xl" py={6}>
        <Box mb={8}>
          <Heading size="lg" mb={2}>
            Centrika Neobank Dashboard
          </Heading>
          <Text color="gray.600">
            Overview of platform metrics and performance
          </Text>
        </Box>

        {error && (
          <Box
            bg="red.50"
            border="1px"
            borderColor="red.200"
            borderRadius="md"
            p={4}
            mb={6}
          >
            <Text color="red.800">{error}</Text>
          </Box>
        )}

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Daily Sign-ups</StatLabel>
                <StatNumber>
                  {loading ? '-' : metrics?.dailySignups.toLocaleString() || '0'}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  New users today
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>KYC Success Rate</StatLabel>
                <StatNumber>
                  {loading ? '-' : formatPercentage(metrics?.successfulKYCRate || 0)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Verification success
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Daily Transactions</StatLabel>
                <StatNumber>
                  {loading ? '-' : metrics?.transactionCount.toLocaleString() || '0'}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Transactions today
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Total Balance</StatLabel>
                <StatNumber fontSize="lg">
                  {loading ? '-' : formatCurrency(metrics?.totalLedgerBalance || 0)}
                </StatNumber>
                <StatHelpText>
                  Platform ledger balance
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          <MetricsPanel />
          
          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Heading size="md" mb={4}>
                Active Users
              </Heading>
              <Box textAlign="center" py={8}>
                <Text fontSize="3xl" fontWeight="bold" color="blue.500">
                  {loading ? '-' : metrics?.activeUsers.toLocaleString() || '0'}
                </Text>
                <Text color="gray.600">Active users (30 days)</Text>
              </Box>
            </CardBody>
          </Card>
        </Grid>

        <Card bg={bg} border="1px" borderColor={borderColor} mt={6}>
          <CardBody>
            <Heading size="md" mb={4}>
              Platform Status
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box textAlign="center" p={4} bg="green.50" borderRadius="md">
                <Text fontSize="sm" color="green.600" fontWeight="medium">
                  SYSTEM STATUS
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="green.700">
                  Operational
                </Text>
              </Box>
              
              <Box textAlign="center" p={4} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" color="blue.600" fontWeight="medium">
                  BNR COMPLIANCE
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.700">
                  Compliant
                </Text>
              </Box>
              
              <Box textAlign="center" p={4} bg="purple.50" borderRadius="md">
                <Text fontSize="sm" color="purple.600" fontWeight="medium">
                  PAYMENT RAILS
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="purple.700">
                  Active
                </Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Container>
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  VStack,
  HStack,
  Badge,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';

interface MetricsData {
  dailySignups: number;
  successfulKYCRate: number;
  transactionCount: number;
  totalLedgerBalance: number;
  activeUsers: number;
}

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    loadMetrics();
    
    // Refresh metrics every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      setError(null);
      // Note: This would normally use the auth token
      // For now, we'll simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate metrics data
      setMetrics({
        dailySignups: Math.floor(Math.random() * 50) + 10,
        successfulKYCRate: Math.floor(Math.random() * 20) + 80,
        transactionCount: Math.floor(Math.random() * 1000) + 500,
        totalLedgerBalance: Math.floor(Math.random() * 10000000) + 5000000,
        activeUsers: Math.floor(Math.random() * 500) + 100,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
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

  if (loading) {
    return (
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Box textAlign="center" py={8}>
            <Spinner size="lg" />
            <Text mt={4} color="gray.600">Loading metrics...</Text>
          </Box>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Box textAlign="center" py={8}>
            <Text color="red.500">{error}</Text>
          </Box>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Real-time Metrics */}
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Heading size="md" mb={4}>Real-time Metrics</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Stat>
              <StatLabel>Transaction Volume (24h)</StatLabel>
              <StatNumber fontSize="lg">
                {metrics ? formatCurrency(metrics.totalLedgerBalance / 10) : '0'}
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                +12.5% from yesterday
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Success Rate</StatLabel>
              <StatNumber fontSize="lg">
                {metrics ? formatPercentage(metrics.successfulKYCRate) : '0%'}
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                +2.3% from last week
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Performance Indicators */}
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Heading size="md" mb={4}>Performance Indicators</Heading>
          
          <VStack spacing={4} align="stretch">
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">KYC Processing</Text>
                <Badge colorScheme="green">Optimal</Badge>
              </HStack>
              <Progress value={95} colorScheme="green" size="sm" />
              <Text fontSize="xs" color="gray.600" mt={1}>
                Average processing time: 2.3 minutes
              </Text>
            </Box>

            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">Transaction Success</Text>
                <Badge colorScheme="green">Healthy</Badge>
              </HStack>
              <Progress value={98.5} colorScheme="green" size="sm" />
              <Text fontSize="xs" color="gray.600" mt={1}>
                98.5% success rate (last 24h)
              </Text>
            </Box>

            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">System Load</Text>
                <Badge colorScheme="yellow">Moderate</Badge>
              </HStack>
              <Progress value={67} colorScheme="yellow" size="sm" />
              <Text fontSize="xs" color="gray.600" mt={1}>
                CPU: 67%, Memory: 54%
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Recent Activity */}
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Heading size="md" mb={4}>Recent Activity</Heading>
          
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm">New KYC submission</Text>
              <Text fontSize="xs" color="gray.600">2 min ago</Text>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm">P2P transfer completed</Text>
              <Text fontSize="xs" color="gray.600">5 min ago</Text>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm">User registration</Text>
              <Text fontSize="xs" color="gray.600">8 min ago</Text>
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="sm">MoMo deposit processed</Text>
              <Text fontSize="xs" color="gray.600">12 min ago</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}

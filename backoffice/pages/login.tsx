import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  InputGroup,
  InputRightElement,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { setAuthToken } from '../utils/auth';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        setAuthToken(data.data.token);
        router.push('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="md">
        <Box textAlign="center" mb={8}>
          <Heading size="xl" color="blue.600" mb={2}>
            Centrika
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Back Office Administration
          </Text>
        </Box>

        <Card bg={bg} border="1px" borderColor={borderColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} as="form" onSubmit={handleSubmit}>
              <Box textAlign="center" mb={4}>
                <Heading size="lg" mb={2}>
                  Sign In
                </Heading>
                <Text color="gray.600">
                  Access the Centrika administration panel
                </Text>
              </Box>

              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <FormControl isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@centrika.rw"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup size="lg">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="sm"
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="full"
                isLoading={loading}
                loadingText="Signing in..."
                isDisabled={!email || !password}
              >
                Sign In
              </Button>

              <Box textAlign="center" pt={4} borderTop="1px" borderColor="gray.200" width="full">
                <Text fontSize="sm" color="gray.600">
                  For support, contact: support@centrika.rw
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        <Box textAlign="center" mt={8}>
          <Text fontSize="sm" color="gray.500">
            © 2024 Centrika Neobank Rwanda. All rights reserved.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}

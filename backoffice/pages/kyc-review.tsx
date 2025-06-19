import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  Card,
  CardBody,
  VStack,
  HStack,
  Badge,
  Button,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Alert,
  AlertIcon,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  SimpleGrid,
  Progress,
} from '@chakra-ui/react';
import Layout from '../components/Layout';
import KYCReview from '../components/KYCReview';
import { isAuthenticated, getAuthToken } from '../utils/auth';

interface KYCDocument {
  id: number;
  userId: number;
  documentType: string;
  documentUrl: string;
  verificationStatus: string;
  verificationScore: number;
  reviewNotes: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
}

export default function KYCReviewPage() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadPendingKYC();
  }, [router]);

  const loadPendingKYC = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch('/api/kyc/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load pending KYC documents');
      }

      const data = await response.json();
      if (data.success) {
        setKycDocuments(data.data || []);
      } else {
        setError(data.error || 'Failed to load KYC documents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDocument = (document: KYCDocument) => {
    setSelectedDocument(document);
    setReviewNotes(document.reviewNotes || '');
    onOpen();
  };

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!selectedDocument) return;

    try {
      setReviewing(true);
      const token = getAuthToken();

      const response = await fetch(`/api/kyc/review/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes: reviewNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const data = await response.json();
      if (data.success) {
        // Remove reviewed document from list
        setKycDocuments(prev => prev.filter(doc => doc.id !== selectedDocument.id));
        onClose();
        setSelectedDocument(null);
        setReviewNotes('');
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setReviewing(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Layout>
      <Container maxW="7xl" py={6}>
        <Box mb={8}>
          <Heading size="lg" mb={2}>
            KYC Document Review
          </Heading>
          <Text color="gray.600">
            Review and approve pending KYC verification documents
          </Text>
        </Box>

        {error && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color="yellow.500">
                {kycDocuments.length}
              </Text>
              <Text color="gray.600">Pending Reviews</Text>
            </CardBody>
          </Card>
          
          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color="blue.500">
                {kycDocuments.filter(doc => doc.verificationScore >= 85).length}
              </Text>
              <Text color="gray.600">High Confidence</Text>
            </CardBody>
          </Card>
          
          <Card bg={bg} border="1px" borderColor={borderColor}>
            <CardBody textAlign="center">
              <Text fontSize="3xl" fontWeight="bold" color="red.500">
                {kycDocuments.filter(doc => doc.verificationScore < 70).length}
              </Text>
              <Text color="gray.600">Needs Attention</Text>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Card bg={bg} border="1px" borderColor={borderColor}>
          <CardBody>
            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4} color="gray.600">Loading KYC documents...</Text>
              </Box>
            ) : kycDocuments.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.600">No pending KYC documents</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>User</Th>
                    <Th>Document Type</Th>
                    <Th>Verification Score</Th>
                    <Th>Status</Th>
                    <Th>Submitted</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {kycDocuments.map((document) => (
                    <Tr key={document.id}>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">
                            {document.user?.firstName} {document.user?.lastName}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {document.user?.phone}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Badge variant="outline">
                          {document.documentType.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text 
                            fontWeight="bold" 
                            color={`${getScoreColor(document.verificationScore)}.500`}
                          >
                            {document.verificationScore?.toFixed(1)}%
                          </Text>
                          <Progress
                            value={document.verificationScore}
                            colorScheme={getScoreColor(document.verificationScore)}
                            size="sm"
                            width="60px"
                          />
                        </VStack>
                      </Td>
                      <Td>{getStatusBadge(document.verificationStatus)}</Td>
                      <Td>{formatDate(document.createdAt)}</Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleReviewDocument(document)}
                        >
                          Review
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Review Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              KYC Document Review
              {selectedDocument && (
                <Text fontSize="sm" fontWeight="normal" color="gray.600">
                  {selectedDocument.user?.firstName} {selectedDocument.user?.lastName} - {selectedDocument.documentType.replace('_', ' ').toUpperCase()}
                </Text>
              )}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedDocument && (
                <VStack spacing={6} align="stretch">
                  {/* Document Info */}
                  <Card>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <VStack align="start" spacing={2}>
                          <Text fontWeight="medium">User Information:</Text>
                          <Text>{selectedDocument.user?.firstName} {selectedDocument.user?.lastName}</Text>
                          <Text color="gray.600">{selectedDocument.user?.phone}</Text>
                          <Text color="gray.600">{selectedDocument.user?.email}</Text>
                        </VStack>
                        
                        <VStack align="start" spacing={2}>
                          <Text fontWeight="medium">Document Details:</Text>
                          <HStack>
                            <Text>Type:</Text>
                            <Badge variant="outline">
                              {selectedDocument.documentType.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </HStack>
                          <HStack>
                            <Text>Score:</Text>
                            <Text 
                              fontWeight="bold" 
                              color={`${getScoreColor(selectedDocument.verificationScore)}.500`}
                            >
                              {selectedDocument.verificationScore?.toFixed(1)}%
                            </Text>
                          </HStack>
                          <HStack>
                            <Text>Submitted:</Text>
                            <Text>{formatDate(selectedDocument.createdAt)}</Text>
                          </HStack>
                        </VStack>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  {/* Document Image */}
                  {selectedDocument.documentUrl && (
                    <Card>
                      <CardBody>
                        <Text fontWeight="medium" mb={4}>Document Image:</Text>
                        <Box textAlign="center">
                          <Image
                            src={selectedDocument.documentUrl}
                            alt="KYC Document"
                            maxH="400px"
                            objectFit="contain"
                            border="1px"
                            borderColor="gray.200"
                            borderRadius="md"
                          />
                        </Box>
                      </CardBody>
                    </Card>
                  )}

                  {/* Review Notes */}
                  <Card>
                    <CardBody>
                      <Text fontWeight="medium" mb={4}>Review Notes:</Text>
                      <Textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Enter review notes (optional)"
                        rows={4}
                      />
                    </CardBody>
                  </Card>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <HStack spacing={4}>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  onClick={() => submitReview('rejected')}
                  isLoading={reviewing}
                >
                  Reject
                </Button>
                <Button
                  colorScheme="green"
                  onClick={() => submitReview('approved')}
                  isLoading={reviewing}
                >
                  Approve
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </Layout>
  );
}

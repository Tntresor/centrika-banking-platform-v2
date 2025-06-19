import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Image,
  Card,
  CardBody,
  Badge,
  Textarea,
  Alert,
  AlertIcon,
  SimpleGrid,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react';

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

interface KYCReviewProps {
  document: KYCDocument;
  onReview: (documentId: number, status: 'approved' | 'rejected', notes: string) => void;
  isLoading?: boolean;
}

export default function KYCReview({ document, onReview, isLoading = false }: KYCReviewProps) {
  const [reviewNotes, setReviewNotes] = useState(document.reviewNotes || '');
  const [selectedStatus, setSelectedStatus] = useState<'approved' | 'rejected' | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSubmitReview = () => {
    if (selectedStatus) {
      onReview(document.id, selectedStatus, reviewNotes);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
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

  return (
    <VStack spacing={6} align="stretch">
      {/* Document Information */}
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="lg" fontWeight="bold">User Information</Text>
              <Box>
                <Text fontWeight="medium">
                  {document.user?.firstName} {document.user?.lastName}
                </Text>
                <Text color="gray.600" fontSize="sm">{document.user?.phone}</Text>
                <Text color="gray.600" fontSize="sm">{document.user?.email}</Text>
              </Box>
            </VStack>

            <VStack align="start" spacing={3}>
              <Text fontSize="lg" fontWeight="bold">Document Details</Text>
              <VStack align="start" spacing={2}>
                <HStack>
                  <Text fontWeight="medium">Type:</Text>
                  <Badge variant="outline">
                    {document.documentType.replace('_', ' ').toUpperCase()}
                  </Badge>
                </HStack>
                
                <HStack>
                  <Text fontWeight="medium">Score:</Text>
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
                      width="100px"
                    />
                  </VStack>
                </HStack>
                
                <HStack>
                  <Text fontWeight="medium">Submitted:</Text>
                  <Text fontSize="sm">{formatDate(document.createdAt)}</Text>
                </HStack>
              </VStack>
            </VStack>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Document Image */}
      {document.documentUrl && (
        <Card bg={bg} border="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="lg" fontWeight="bold" mb={4}>Document Image</Text>
            <Box textAlign="center">
              <Image
                src={document.documentUrl}
                alt="KYC Document"
                maxHeight="400px"
                objectFit="contain"
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                mx="auto"
              />
            </Box>
          </CardBody>
        </Card>
      )}

      {/* Review Section */}
      <Card bg={bg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Text fontSize="lg" fontWeight="bold" mb={4}>Review Decision</Text>
          
          {/* Score-based recommendation */}
          {document.verificationScore >= 85 && (
            <Alert status="success" mb={4}>
              <AlertIcon />
              High confidence score ({document.verificationScore.toFixed(1)}%) - Recommended for approval
            </Alert>
          )}
          
          {document.verificationScore < 70 && (
            <Alert status="warning" mb={4}>
              <AlertIcon />
              Low confidence score ({document.verificationScore.toFixed(1)}%) - Manual review required
            </Alert>
          )}

          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontWeight="medium" mb={2}>Review Notes:</Text>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes (optional)"
                rows={4}
              />
            </Box>

            <HStack spacing={4} justify="center">
              <Button
                colorScheme={selectedStatus === 'rejected' ? 'red' : 'gray'}
                variant={selectedStatus === 'rejected' ? 'solid' : 'outline'}
                onClick={() => setSelectedStatus('rejected')}
                size="lg"
                px={8}
              >
                Reject
              </Button>
              
              <Button
                colorScheme={selectedStatus === 'approved' ? 'green' : 'gray'}
                variant={selectedStatus === 'approved' ? 'solid' : 'outline'}
                onClick={() => setSelectedStatus('approved')}
                size="lg"
                px={8}
              >
                Approve
              </Button>
            </HStack>

            {selectedStatus && (
              <Box textAlign="center" pt={4}>
                <Button
                  colorScheme="blue"
                  onClick={handleSubmitReview}
                  isLoading={isLoading}
                  loadingText="Submitting..."
                  size="lg"
                >
                  Submit Review
                </Button>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}

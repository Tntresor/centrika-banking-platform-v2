import React, { useState } from 'react';
import {
  HStack,
  Input,
  Select,
  Button,
  InputGroup,
  InputLeftElement,
  Box,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

interface UserSearchProps {
  onSearch: (query: string, status: string) => void;
}

export default function UserSearch({ onSearch }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const handleSearch = () => {
    onSearch(query, status);
  };

  const handleClear = () => {
    setQuery('');
    setStatus('');
    onSearch('', '');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <HStack spacing={4} align="end">
      <Box flex={1}>
        <InputGroup>
          <InputLeftElement>
            <SearchIcon color="gray.500" />
          </InputLeftElement>
          <Input
            placeholder="Search by name, phone, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </InputGroup>
      </Box>
      
      <Box minWidth="150px">
        <Select
          placeholder="All statuses"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">Pending KYC</option>
          <option value="approved">KYC Approved</option>
          <option value="rejected">KYC Rejected</option>
        </Select>
      </Box>

      <Button colorScheme="blue" onClick={handleSearch}>
        Search
      </Button>

      <Button variant="outline" onClick={handleClear}>
        Clear
      </Button>
    </HStack>
  );
}

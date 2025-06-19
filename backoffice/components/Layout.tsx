import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Heading,
  useColorModeValue,
  Container,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
} from '@chakra-ui/react';
import {
  ChevronDownIcon,
  HamburgerIcon,
  SettingsIcon,
  ViewIcon,
  SearchIcon,
  TimeIcon,
  BarChartIcon,
} from '@chakra-ui/icons';
import { clearAuthToken, isAuthenticated } from '../utils/auth';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const sidebarBg = useColorModeValue('gray.50', 'gray.900');

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: BarChartIcon },
    { name: 'Users', href: '/users', icon: ViewIcon },
    { name: 'KYC Review', href: '/kyc-review', icon: SearchIcon },
    { name: 'Metrics', href: '/metrics', icon: BarChartIcon },
    { name: 'Audit Trail', href: '/audit', icon: TimeIcon },
  ];

  const getCurrentPageName = () => {
    const currentPath = router.pathname;
    const currentItem = navigationItems.find(item => item.href === currentPath);
    return currentItem?.name || 'Dashboard';
  };

  const SidebarContent = () => (
    <VStack spacing={4} align="stretch" p={4}>
      <Box mb={6}>
        <Heading size="lg" color="blue.600" textAlign="center">
          Centrika
        </Heading>
        <Text fontSize="sm" color="gray.600" textAlign="center">
          Back Office
        </Text>
      </Box>

      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = router.pathname === item.href;
        
        return (
          <Button
            key={item.name}
            leftIcon={<Icon />}
            variant={isActive ? 'solid' : 'ghost'}
            colorScheme={isActive ? 'blue' : 'gray'}
            justifyContent="flex-start"
            onClick={() => {
              router.push(item.href);
              onClose();
            }}
            w="full"
          >
            {item.name}
          </Button>
        );
      })}
    </VStack>
  );

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* Desktop Sidebar */}
      <Box
        display={{ base: 'none', md: 'block' }}
        w="250px"
        bg={sidebarBg}
        borderRight="1px"
        borderColor={borderColor}
      >
        <SidebarContent />
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Navigation</DrawerHeader>
          <DrawerBody p={0}>
            <SidebarContent />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Flex direction="column" flex={1}>
        {/* Header */}
        <Box bg={bg} borderBottom="1px" borderColor={borderColor} px={6} py={4}>
          <Flex justify="space-between" align="center">
            <HStack spacing={4}>
              <IconButton
                display={{ base: 'block', md: 'none' }}
                aria-label="Open menu"
                icon={<HamburgerIcon />}
                onClick={onOpen}
                variant="ghost"
              />
              
              <Breadcrumb>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <BreadcrumbLink>{getCurrentPageName()}</BreadcrumbLink>
                </BreadcrumbItem>
              </Breadcrumb>
            </HStack>

            <HStack spacing={4}>
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost">
                  <HStack spacing={2}>
                    <Avatar size="sm" name="Admin User" />
                    <Text fontSize="sm">Admin</Text>
                  </HStack>
                </MenuButton>
                <MenuList>
                  <MenuItem icon={<SettingsIcon />}>
                    Settings
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout}>
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Box>

        {/* Page Content */}
        <Box flex={1} overflow="auto">
          {children}
        </Box>

        {/* Footer */}
        <Box bg={bg} borderTop="1px" borderColor={borderColor} px={6} py={4}>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.600">
              © 2024 Centrika Neobank Rwanda
            </Text>
            <Text fontSize="sm" color="gray.600">
              Version 1.0.0
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
}

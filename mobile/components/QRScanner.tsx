import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    onScan(data);
  };

  const resetScanner = () => {
    setScanned(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>{t('qr_scanner.requesting_permission')}</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Feather name="camera-off" size={64} color={colors.gray[400]} />
        <Text style={styles.permissionTitle}>{t('qr_scanner.permission.title')}</Text>
        <Text style={styles.permissionText}>{t('qr_scanner.permission.message')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
          <Text style={styles.permissionButtonText}>{t('common.ok')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Feather name="x" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('qr_scanner.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>{t('qr_scanner.instruction')}</Text>
      </View>

      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={styles.frameCorner} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
            
            <View style={styles.scanLine} />
          </View>
        </View>
      </BarCodeScanner>

      {scanned && (
        <View style={styles.scannedContainer}>
          <Text style={styles.scannedText}>{t('qr_scanner.scanned')}</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
            <Text style={styles.resetButtonText}>{t('qr_scanner.scan_again')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },
  instructionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  instructionText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: colors.white,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    transform: [{ rotate: '90deg' }],
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    transform: [{ rotate: '-90deg' }],
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    transform: [{ rotate: '180deg' }],
  },
  scanLine: {
    width: 200,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  scannedContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  scannedText: {
    ...typography.body,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resetButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

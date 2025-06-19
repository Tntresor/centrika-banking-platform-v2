import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Camera as ExpoCamera, CameraType } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface CameraProps {
  mode: 'document' | 'selfie';
  onCapture: (imageUri: string) => void;
  onClose: () => void;
}

export default function Camera({ mode, onCapture, onClose }: CameraProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<ExpoCamera>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await ExpoCamera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      
      onCapture(photo.uri);
    } catch (error) {
      Alert.alert(t('error.title'), t('camera.error.capture_failed'));
    } finally {
      setCapturing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>{t('camera.requesting_permission')}</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Feather name="camera-off" size={64} color={colors.gray[400]} />
        <Text style={styles.permissionTitle}>{t('camera.permission.title')}</Text>
        <Text style={styles.permissionText}>{t('camera.permission.message')}</Text>
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
        <Text style={styles.headerTitle}>
          {mode === 'document' ? t('camera.document.title') : t('camera.selfie.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {mode === 'document' ? t('camera.document.instruction') : t('camera.selfie.instruction')}
        </Text>
      </View>

      <ExpoCamera
        style={styles.camera}
        type={mode === 'selfie' ? CameraType.front : CameraType.back}
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          {mode === 'document' && (
            <View style={styles.documentFrame}>
              <View style={styles.frameCorner} />
              <View style={[styles.frameCorner, styles.topRight]} />
              <View style={[styles.frameCorner, styles.bottomLeft]} />
              <View style={[styles.frameCorner, styles.bottomRight]} />
            </View>
          )}
          
          {mode === 'selfie' && (
            <View style={styles.selfieFrame}>
              <View style={styles.selfieCircle} />
            </View>
          )}
        </View>
      </ExpoCamera>

      <View style={styles.controls}>
        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={capturing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </View>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderLeftWidth: 3,
    borderTopWidth: 3,
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
  selfieFrame: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfieCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: 'transparent',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 32,
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.gray[300],
  },
  captureButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
});

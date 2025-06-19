import React, { useContext, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';
import { AuthContext } from '../contexts/AuthContext';
import KYCService from '../services/KYCService';
import Colors from '../constants/Colors';

const KYC_STEPS = {
  DOCUMENT_CAPTURE: 'document',
  FACE_CAPTURE: 'face',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
};

export default function KYCScreen({ navigation }) {
  const { strings } = useContext(LanguageContext);
  const { signUp } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(KYC_STEPS.DOCUMENT_CAPTURE);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [documentImage, setDocumentImage] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });

        if (currentStep === KYC_STEPS.DOCUMENT_CAPTURE) {
          setDocumentImage(photo);
          setCameraVisible(false);
          setCurrentStep(KYC_STEPS.FACE_CAPTURE);
        } else if (currentStep === KYC_STEPS.FACE_CAPTURE) {
          setFaceImage(photo);
          setCameraVisible(false);
          await processKYC(documentImage, photo);
        }
      } catch (error) {
        Alert.alert(strings.error, strings.cameraError);
      }
    }
  };

  const processKYC = async (docImage, faceImg) => {
    try {
      setCurrentStep(KYC_STEPS.PROCESSING);
      setIsProcessing(true);

      const kycResult = await KYCService.processKYC({
        documentImage: docImage.base64,
        faceImage: faceImg.base64,
      });

      if (kycResult.success) {
        // Create user account
        const userData = {
          firstName: kycResult.extractedData.firstName,
          lastName: kycResult.extractedData.lastName,
          idNumber: kycResult.extractedData.idNumber,
          phoneNumber: kycResult.extractedData.phoneNumber,
          kycStatus: 'approved',
        };

        await signUp(userData);
        setCurrentStep(KYC_STEPS.COMPLETED);
        
        setTimeout(() => {
          // Navigation will be handled by AuthContext
        }, 2000);
      } else {
        Alert.alert(
          strings.kycFailed,
          kycResult.message || strings.kycFailedMessage,
          [
            {
              text: strings.retry,
              onPress: () => {
                setCurrentStep(KYC_STEPS.DOCUMENT_CAPTURE);
                setDocumentImage(null);
                setFaceImage(null);
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(strings.error, error.message);
      setCurrentStep(KYC_STEPS.DOCUMENT_CAPTURE);
      setDocumentImage(null);
      setFaceImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setCameraVisible(true);
    } else {
      Alert.alert(
        strings.permissionRequired,
        strings.cameraPermissionMessage,
        [
          { text: strings.cancel, style: 'cancel' },
          { text: strings.settings, onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case KYC_STEPS.DOCUMENT_CAPTURE:
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={60} color={Colors.primary} />
            </View>
            <Text style={styles.stepTitle}>{strings.captureID}</Text>
            <Text style={styles.stepDescription}>
              {strings.captureIDDescription}
            </Text>
            {documentImage && (
              <Image source={{ uri: documentImage.uri }} style={styles.previewImage} />
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.cameraButtonText}>
                {documentImage ? strings.retake : strings.takePhoto}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case KYC_STEPS.FACE_CAPTURE:
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-circle" size={60} color={Colors.primary} />
            </View>
            <Text style={styles.stepTitle}>{strings.captureSelfie}</Text>
            <Text style={styles.stepDescription}>
              {strings.captureSelfieDescription}
            </Text>
            {faceImage && (
              <Image source={{ uri: faceImage.uri }} style={styles.previewImage} />
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.cameraButtonText}>
                {faceImage ? strings.retake : strings.takePhoto}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case KYC_STEPS.PROCESSING:
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="hourglass" size={60} color={Colors.warning} />
            </View>
            <Text style={styles.stepTitle}>{strings.processing}</Text>
            <Text style={styles.stepDescription}>{strings.processingKYC}</Text>
          </View>
        );

      case KYC_STEPS.COMPLETED:
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={60} color={Colors.success} />
            </View>
            <Text style={styles.stepTitle}>{strings.kycCompleted}</Text>
            <Text style={styles.stepDescription}>{strings.kycCompletedMessage}</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{strings.kyc}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  currentStep === KYC_STEPS.DOCUMENT_CAPTURE
                    ? 25
                    : currentStep === KYC_STEPS.FACE_CAPTURE
                    ? 50
                    : currentStep === KYC_STEPS.PROCESSING
                    ? 75
                    : 100
                }%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.content}>{renderStepContent()}</View>

      {/* Camera Modal */}
      <Modal visible={cameraVisible} animationType="slide">
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={
              currentStep === KYC_STEPS.FACE_CAPTURE
                ? Camera.Constants.Type.front
                : Camera.Constants.Type.back
            }
          >
            <View style={styles.cameraOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setCameraVisible(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>

              <View style={styles.captureContainer}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              </View>
            </View>
          </Camera>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    padding: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.lightGray,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stepContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 20,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  captureContainer: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
  },
});

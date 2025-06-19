import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

// Components
import Camera from '../components/Camera';

// Services
import { apiService } from '../services/api';
import { mlkitService } from '../services/mlkit';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type KYCStep = 'intro' | 'document' | 'selfie' | 'processing' | 'completed' | 'failed';

interface CapturedImages {
  document?: string;
  selfie?: string;
}

export default function KYCScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const [step, setStep] = useState<KYCStep>('intro');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'document' | 'selfie'>('document');
  const [capturedImages, setCapturedImages] = useState<CapturedImages>({});
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleStartKYC = () => {
    setStep('document');
    setCameraMode('document');
    setShowCamera(true);
  };

  const handleImageCapture = async (imageUri: string) => {
    setShowCamera(false);
    
    if (cameraMode === 'document') {
      // Validate document image with ML Kit
      const isValidDocument = await mlkitService.validateDocument(imageUri);
      
      if (!isValidDocument) {
        Alert.alert(
          t('kyc.error.title'),
          t('kyc.error.invalid_document'),
          [{ text: t('common.ok'), onPress: () => setShowCamera(true) }]
        );
        return;
      }

      setCapturedImages(prev => ({ ...prev, document: imageUri }));
      setStep('selfie');
    } else {
      // Validate selfie with ML Kit
      const isValidSelfie = await mlkitService.validateSelfie(imageUri);
      
      if (!isValidSelfie) {
        Alert.alert(
          t('kyc.error.title'),
          t('kyc.error.invalid_selfie'),
          [{ text: t('common.ok'), onPress: () => setShowCamera(true) }]
        );
        return;
      }

      setCapturedImages(prev => ({ ...prev, selfie: imageUri }));
      await processKYC(capturedImages.document!, imageUri);
    }
  };

  const processKYC = async (documentUri: string, selfieUri: string) => {
    setStep('processing');
    setLoading(true);

    try {
      // Convert images to base64
      const documentBase64 = await convertImageToBase64(documentUri);
      const selfieBase64 = await convertImageToBase64(selfieUri);

      const response = await apiService.submitKYC({
        documentType: 'national_id',
        documentImage: documentBase64,
        selfieImage: selfieBase64,
      });

      if (response.success) {
        setVerificationResult(response.data);
        
        if (response.data.status === 'approved') {
          setStep('completed');
        } else if (response.data.status === 'rejected') {
          setStep('failed');
        } else {
          // Pending - show processing message
          setTimeout(() => {
            setStep('completed'); // For demo, assume success after delay
          }, 3000);
        }
      } else {
        setStep('failed');
        Alert.alert(t('kyc.error.title'), response.error || t('kyc.error.processing_failed'));
      }
    } catch (error) {
      setStep('failed');
      Alert.alert(t('kyc.error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    // This is a simplified conversion - in production, you'd use proper libraries
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleRetakePhoto = () => {
    if (step === 'selfie') {
      setCameraMode('selfie');
      setShowCamera(true);
    } else {
      setStep('document');
      setCameraMode('document');
      setShowCamera(true);
    }
  };

  const handleContinueToSelfie = () => {
    setCameraMode('selfie');
    setShowCamera(true);
  };

  const handleComplete = () => {
    navigation.goBack();
  };

  const renderIntro = () => (
    <View style={styles.content}>
      <Feather name="shield" size={64} color={colors.primary} style={styles.icon} />
      <Text style={styles.title}>{t('kyc.intro.title')}</Text>
      <Text style={styles.description}>{t('kyc.intro.description')}</Text>
      
      <View style={styles.requirements}>
        <Text style={styles.requirementsTitle}>{t('kyc.intro.requirements_title')}</Text>
        <View style={styles.requirement}>
          <Feather name="check" size={16} color={colors.success} />
          <Text style={styles.requirementText}>{t('kyc.intro.requirement_id')}</Text>
        </View>
        <View style={styles.requirement}>
          <Feather name="check" size={16} color={colors.success} />
          <Text style={styles.requirementText}>{t('kyc.intro.requirement_photo')}</Text>
        </View>
        <View style={styles.requirement}>
          <Feather name="check" size={16} color={colors.success} />
          <Text style={styles.requirementText}>{t('kyc.intro.requirement_lighting')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleStartKYC}>
        <Text style={styles.buttonText}>{t('kyc.intro.start_verification')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDocumentPreview = () => (
    <View style={styles.content}>
      <Text style={styles.title}>{t('kyc.document.title')}</Text>
      <Text style={styles.description}>{t('kyc.document.description')}</Text>
      
      {capturedImages.document && (
        <Image source={{ uri: capturedImages.document }} style={styles.previewImage} />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRetakePhoto}>
          <Text style={styles.secondaryButtonText}>{t('kyc.retake_photo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleContinueToSelfie}>
          <Text style={styles.buttonText}>{t('kyc.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSelfiePreview = () => (
    <View style={styles.content}>
      <Text style={styles.title}>{t('kyc.selfie.title')}</Text>
      <Text style={styles.description}>{t('kyc.selfie.description')}</Text>
      
      {capturedImages.selfie && (
        <Image source={{ uri: capturedImages.selfie }} style={styles.previewImage} />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRetakePhoto}>
          <Text style={styles.secondaryButtonText}>{t('kyc.retake_photo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={() => processKYC(capturedImages.document!, capturedImages.selfie!)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? t('common.processing') : t('kyc.submit')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.content}>
      <Feather name="clock" size={64} color={colors.warning} style={styles.icon} />
      <Text style={styles.title}>{t('kyc.processing.title')}</Text>
      <Text style={styles.description}>{t('kyc.processing.description')}</Text>
    </View>
  );

  const renderCompleted = () => (
    <View style={styles.content}>
      <Feather name="check-circle" size={64} color={colors.success} style={styles.icon} />
      <Text style={styles.title}>{t('kyc.completed.title')}</Text>
      <Text style={styles.description}>{t('kyc.completed.description')}</Text>
      
      {verificationResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{t('kyc.completed.result_title')}</Text>
          <Text style={styles.resultScore}>
            {t('kyc.completed.score', { score: verificationResult.score?.toFixed(1) || 'N/A' })}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleComplete}>
        <Text style={styles.buttonText}>{t('kyc.completed.continue')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFailed = () => (
    <View style={styles.content}>
      <Feather name="x-circle" size={64} color={colors.error} style={styles.icon} />
      <Text style={styles.title}>{t('kyc.failed.title')}</Text>
      <Text style={styles.description}>{t('kyc.failed.description')}</Text>

      <TouchableOpacity style={styles.button} onPress={() => setStep('intro')}>
        <Text style={styles.buttonText}>{t('kyc.failed.try_again')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 'intro' && renderIntro()}
        {step === 'document' && !showCamera && renderDocumentPreview()}
        {step === 'selfie' && !showCamera && renderSelfiePreview()}
        {step === 'processing' && renderProcessing()}
        {step === 'completed' && renderCompleted()}
        {step === 'failed' && renderFailed()}
      </ScrollView>

      <Modal visible={showCamera} animationType="slide">
        <Camera
          mode={cameraMode}
          onCapture={handleImageCapture}
          onClose={() => setShowCamera(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  requirements: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  requirementsTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 16,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    ...typography.body,
    color: colors.text.secondary,
    marginLeft: 12,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[400],
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 120,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  resultTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 8,
  },
  resultScore: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
});

import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';
import { AuthContext } from '../contexts/AuthContext';
import ApiService from '../services/ApiService';
import QRUtils from '../utils/QRUtils';
import Colors from '../constants/Colors';

export default function QRPaymentScreen({ navigation }) {
  const { strings } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    
    try {
      const qrData = QRUtils.parseEMVCoQR(data);
      
      if (qrData) {
        setPaymentData(qrData);
        setShowPaymentModal(true);
      } else {
        Alert.alert(
          strings.error,
          strings.invalidQRCode,
          [{ text: strings.ok, onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      Alert.alert(
        strings.error,
        strings.qrScanError,
        [{ text: strings.ok, onPress: () => setScanned(false) }]
      );
    }
  };

  const processPayment = async () => {
    try {
      setIsProcessing(true);

      const response = await ApiService.post('/transactions/qr-payment', {
        qrData: paymentData,
        userId: user.id,
        amount: paymentData.amount,
        merchantId: paymentData.merchantId,
      });

      if (response.success) {
        Alert.alert(
          strings.success,
          strings.paymentSuccess,
          [
            {
              text: strings.ok,
              onPress: () => {
                setShowPaymentModal(false);
                setScanned(false);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(strings.error, response.message || strings.paymentFailed);
      }
    } catch (error) {
      Alert.alert(strings.error, error.message || strings.paymentFailed);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()} RWF`;
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text>{strings.requestingPermission}</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{strings.qrPayment}</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={60} color={Colors.secondary} />
          <Text style={styles.permissionText}>{strings.noCameraPermission}</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => BarCodeScanner.requestPermissionsAsync()}
          >
            <Text style={styles.permissionButtonText}>{strings.grantPermission}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{strings.qrPayment}</Text>
        <TouchableOpacity style={styles.flashButton}>
          <Ionicons name="flash" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.camera}
        />
        
        {/* Scan Overlay */}
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame}>
            <View style={styles.scanCorner} />
            <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
            <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
            <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
          </View>
          
          <Text style={styles.scanInstruction}>
            {strings.scanQRInstruction}
          </Text>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <Text style={styles.instructionText}>
            {strings.qrPaymentInstruction}
          </Text>
        </View>

        {scanned && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => setScanned(false)}
          >
            <Ionicons name="refresh" size={20} color={Colors.primary} />
            <Text style={styles.rescanButtonText}>{strings.scanAgain}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPaymentModal(false);
          setScanned(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{strings.confirmPayment}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setScanned(false);
                }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {paymentData && (
              <View style={styles.paymentDetails}>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantIcon}>
                    <Ionicons name="storefront" size={32} color={Colors.primary} />
                  </View>
                  <Text style={styles.merchantName}>
                    {paymentData.merchantName || strings.merchant}
                  </Text>
                  <Text style={styles.merchantId}>
                    ID: {paymentData.merchantId}
                  </Text>
                </View>

                <View style={styles.amountSection}>
                  <Text style={styles.amountLabel}>{strings.amount}</Text>
                  <Text style={styles.amountValue}>
                    {formatCurrency(paymentData.amount)}
                  </Text>
                </View>

                {paymentData.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.descriptionLabel}>{strings.description}</Text>
                    <Text style={styles.descriptionValue}>
                      {paymentData.description}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowPaymentModal(false);
                      setScanned(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{strings.cancel}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.confirmButton, isProcessing && styles.buttonDisabled]}
                    onPress={processPayment}
                    disabled={isProcessing}
                  >
                    <Text style={styles.confirmButtonText}>
                      {isProcessing ? strings.processing : strings.pay}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  flashButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  scanCornerTopRight: {
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: 0,
    right: 0,
  },
  scanCornerBottomLeft: {
    borderBottomWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    left: 0,
  },
  scanCornerBottomRight: {
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    right: 0,
  },
  scanInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  bottomSection: {
    backgroundColor: Colors.background,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  rescanButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentDetails: {
    alignItems: 'center',
  },
  merchantInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  merchantIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  merchantId: {
    fontSize: 14,
    color: Colors.secondary,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  descriptionSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  descriptionValue: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

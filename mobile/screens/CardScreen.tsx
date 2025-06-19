import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

// Services
import { apiService } from '../services/api';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface Card {
  id: number;
  maskedPan: string;
  expiryDate: string;
  cardType: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

interface CardDetails {
  pan: string;
  cvv: string;
  expiryDate: string;
  maskedPan: string;
}

export default function CardScreen() {
  const { t } = useTranslation();
  
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserCards();
      if (response.success) {
        setCards(response.data);
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    setCreating(true);
    try {
      const response = await apiService.generateCard({ cardType: 'virtual' });
      if (response.success) {
        setShowCreateModal(false);
        await loadCards();
        Alert.alert(
          t('card.create.success_title'),
          t('card.create.success_message')
        );
      } else {
        Alert.alert(t('error.title'), response.error || t('card.create.error'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setCreating(false);
    }
  };

  const handleViewCardDetails = async (card: Card) => {
    try {
      const response = await apiService.getCardDetails(card.id);
      if (response.success) {
        setSelectedCard(card);
        setCardDetails(response.data);
        setShowDetailsModal(true);
      } else {
        Alert.alert(t('error.title'), response.error || t('card.details.error'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    }
  };

  const handleToggleCardStatus = async (card: Card) => {
    const newStatus = !card.isActive;
    
    Alert.alert(
      newStatus ? t('card.activate.title') : t('card.deactivate.title'),
      newStatus ? t('card.activate.message') : t('card.deactivate.message'),
      [
        { text: t('common.cancel') },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              const response = await apiService.updateCardStatus(card.id, newStatus);
              if (response.success) {
                await loadCards();
                Alert.alert(
                  t('common.success'),
                  newStatus ? t('card.activate.success') : t('card.deactivate.success')
                );
              } else {
                Alert.alert(t('error.title'), response.error || t('card.status.error'));
              }
            } catch (error) {
              Alert.alert(t('error.title'), t('error.network_error'));
            }
          }
        }
      ]
    );
  };

  const formatCardNumber = (pan: string) => {
    // Format as XXXX XXXX XXXX XXXX
    return pan.replace(/(.{4})/g, '$1 ').trim();
  };

  const renderVirtualCard = (card: Card) => (
    <View key={card.id} style={styles.cardContainer}>
      <LinearGradient
        colors={card.isActive ? [colors.primary, colors.blue[600]] : [colors.gray[400], colors.gray[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Centrika</Text>
          <Text style={styles.cardType}>
            {card.provider.toUpperCase()} {card.cardType.toUpperCase()}
          </Text>
        </View>

        <View style={styles.cardChip}>
          <View style={styles.chip} />
        </View>

        <View style={styles.cardNumber}>
          <Text style={styles.cardNumberText}>
            {formatCardNumber(card.maskedPan)}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardLabel}>{t('card.expiry')}</Text>
            <Text style={styles.cardValue}>{card.expiryDate}</Text>
          </View>
          
          <View style={styles.cardStatus}>
            <View style={[
              styles.statusDot,
              { backgroundColor: card.isActive ? colors.green[400] : colors.red[400] }
            ]} />
            <Text style={styles.statusText}>
              {card.isActive ? t('card.status.active') : t('card.status.inactive')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleViewCardDetails(card)}
        >
          <Feather name="eye" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>{t('card.actions.view_details')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleCardStatus(card)}
        >
          <Feather 
            name={card.isActive ? 'pause-circle' : 'play-circle'} 
            size={20} 
            color={card.isActive ? colors.warning : colors.success} 
          />
          <Text style={[
            styles.actionButtonText,
            { color: card.isActive ? colors.warning : colors.success }
          ]}>
            {card.isActive ? t('card.actions.deactivate') : t('card.actions.activate')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="credit-card" size={64} color={colors.gray[400]} />
      <Text style={styles.emptyStateTitle}>{t('card.empty.title')}</Text>
      <Text style={styles.emptyStateDescription}>{t('card.empty.description')}</Text>
      
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Feather name="plus" size={20} color={colors.white} />
        <Text style={styles.createButtonText}>{t('card.empty.create_button')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Feather name="credit-card" size={48} color={colors.primary} />
            <Text style={styles.modalTitle}>{t('card.create.title')}</Text>
          </View>

          <Text style={styles.modalDescription}>{t('card.create.description')}</Text>

          <View style={styles.cardFeatures}>
            <View style={styles.feature}>
              <Feather name="check" size={16} color={colors.success} />
              <Text style={styles.featureText}>{t('card.create.feature_1')}</Text>
            </View>
            <View style={styles.feature}>
              <Feather name="check" size={16} color={colors.success} />
              <Text style={styles.featureText}>{t('card.create.feature_2')}</Text>
            </View>
            <View style={styles.feature}>
              <Feather name="check" size={16} color={colors.success} />
              <Text style={styles.featureText}>{t('card.create.feature_3')}</Text>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, creating && styles.confirmButtonDisabled]}
              onPress={handleCreateCard}
              disabled={creating}
            >
              <Text style={styles.confirmButtonText}>
                {creating ? t('common.creating') : t('card.create.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Feather name="shield" size={48} color={colors.warning} />
            <Text style={styles.modalTitle}>{t('card.details.title')}</Text>
          </View>

          <Text style={styles.modalDescription}>{t('card.details.security_note')}</Text>

          {cardDetails && (
            <View style={styles.cardDetailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('card.details.number')}</Text>
                <Text style={styles.detailValue}>
                  {formatCardNumber(cardDetails.pan)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('card.details.expiry')}</Text>
                <Text style={styles.detailValue}>{cardDetails.expiryDate}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('card.details.cvv')}</Text>
                <Text style={styles.detailValue}>{cardDetails.cvv}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowDetailsModal(false);
              setCardDetails(null);
            }}
          >
            <Text style={styles.modalButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('card.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('card.subtitle')}</Text>
        </View>

        {cards.length === 0 ? renderEmptyState() : (
          <>
            {cards.map(renderVirtualCard)}
            
            {cards.length > 0 && (
              <TouchableOpacity
                style={styles.addCardButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Feather name="plus" size={20} color={colors.primary} />
                <Text style={styles.addCardButtonText}>{t('card.add_card')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('card.info.title')}</Text>
            <Text style={styles.infoText}>{t('card.info.description')}</Text>
          </View>
        </View>
      </ScrollView>

      {renderCreateModal()}
      {renderDetailsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  cardContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  cardType: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
  },
  cardChip: {
    alignSelf: 'flex-start',
  },
  chip: {
    width: 32,
    height: 24,
    backgroundColor: colors.white,
    borderRadius: 4,
    opacity: 0.9,
  },
  cardNumber: {
    marginTop: 16,
  },
  cardNumberText: {
    ...typography.h3,
    color: colors.white,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardLabel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 2,
  },
  cardValue: {
    ...typography.button,
    color: colors.white,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: -16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.primary,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  createButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: 8,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addCardButtonText: {
    ...typography.button,
    color: colors.primary,
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.blue[50],
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    ...typography.button,
    color: colors.primary,
    marginBottom: 4,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 12,
  },
  modalDescription: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  cardFeatures: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    ...typography.body,
    color: colors.text.secondary,
    marginLeft: 12,
  },
  cardDetailsContainer: {
    alignSelf: 'stretch',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  detailLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.button,
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.white,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

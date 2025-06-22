# Guide d'Intégration UI/UX - Centrika Banking Platform

## 📁 Comment Fournir Vos Fichiers de Design

### 1. Formats Acceptés
- **Figma**: Partagez le lien Figma avec accès en lecture
- **Adobe XD**: Exportez en format .xd ou partagez le lien cloud
- **Sketch**: Fichiers .sketch avec assets exportés
- **Images**: PNG, JPG, SVG (haute résolution recommandée)
- **Prototypes**: Liens InVision, Marvel, Principle

### 2. Structure Recommandée
```
design-assets/
├── mobile-screens/
│   ├── login.png
│   ├── dashboard.png
│   ├── transfer.png
│   ├── credit-request.png
│   └── ...
├── components/
│   ├── buttons.png
│   ├── forms.png
│   ├── cards.png
│   └── ...
├── colors/
│   ├── palette.png
│   └── brand-colors.json
├── typography/
│   ├── fonts.txt
│   └── text-styles.png
└── icons/
    ├── svg/
    └── png/
```

### 3. Informations à Inclure

#### A. Spécifications Techniques
- **Résolutions cibles**: 375x812 (iPhone), 360x640 (Android)
- **Grille**: Système de 8px ou 4px
- **Breakpoints**: Mobile, tablet si applicable

#### B. Guide de Style
```json
{
  "colors": {
    "primary": "#007bff",
    "secondary": "#6c757d",
    "success": "#28a745",
    "warning": "#ffc107",
    "error": "#dc3545",
    "background": "#f8f9fa"
  },
  "typography": {
    "primary_font": "Inter",
    "secondary_font": "Roboto",
    "heading_sizes": ["32px", "24px", "20px", "16px"],
    "body_sizes": ["16px", "14px", "12px"]
  },
  "spacing": {
    "base_unit": "8px",
    "margins": ["8px", "16px", "24px", "32px"],
    "padding": ["8px", "16px", "24px", "32px"]
  }
}
```

#### C. États Interactifs
- **Default**: État normal
- **Hover**: Survol (desktop)
- **Active**: Touché/cliqué
- **Disabled**: Désactivé
- **Loading**: En cours de chargement
- **Error**: État d'erreur

### 4. Écrans Prioritaires

#### 🏦 Core Banking
1. **Connexion/Inscription**
   - Écran de bienvenue
   - Formulaire de connexion
   - PIN/biométrie
   - Récupération de mot de passe

2. **Dashboard Principal**
   - Solde et carte virtuelle
   - Actions rapides
   - Transactions récentes
   - Notifications

3. **Transferts et Paiements**
   - Sélection destinataire
   - Saisie montant
   - Confirmation
   - Reçu/succès

#### 💳 Services Financiers
4. **Crédit et Découvert**
   - Demande de crédit
   - Calculateur de remboursement
   - État des facilités
   - Historique des paiements

5. **KYC et Vérification**
   - Upload de documents
   - Capture photo/selfie
   - Statut de vérification
   - Étapes de validation

### 5. Composants Réutilisables

#### Buttons
```css
.btn-primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
}
```

#### Cards
```css
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 16px;
}
```

#### Form Elements
```css
.form-control {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.3s ease;
}

.form-control:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
```

### 6. Micro-Interactions Suggérées

#### Animations Actuellement Implémentées
- ✅ **Button Press**: Effet de vague (ripple)
- ✅ **Card Hover**: Élévation et légère rotation
- ✅ **Loading States**: Spinners et progress bars
- ✅ **Success States**: Checkmark animé
- ✅ **List Items**: Slide-in avec délai échelonné
- ✅ **Form Focus**: Scale et glow effects

#### Animations à Ajouter (selon vos designs)
- 🎯 **Pull-to-refresh**: Animation de refresh
- 🎯 **Swipe actions**: Actions sur les transactions
- 🎯 **Number counters**: Animation des montants
- 🎯 **Progress indicators**: Étapes de validation
- 🎯 **Gesture feedback**: Vibrations tactiles

### 7. Instructions d'Intégration

1. **Partagez vos fichiers** via :
   - Upload direct dans le chat
   - Lien Google Drive/Dropbox
   - Repository GitHub
   - Lien Figma/XD

2. **Spécifiez les priorités** :
   - Écrans critiques à implémenter en premier
   - Composants réutilisables
   - Animations spécifiques

3. **Fournissez le contexte** :
   - Persona utilisateur cible
   - Scenarios d'usage principaux
   - Contraintes techniques spécifiques

### 8. Format de Livraison

#### Fichiers Assets
```
assets/
├── images/
│   ├── logo@2x.png
│   ├── background@2x.png
│   └── illustrations/
├── icons/
│   ├── send.svg
│   ├── receive.svg
│   └── credit.svg
└── fonts/
    ├── Inter-Regular.woff2
    ├── Inter-Medium.woff2
    └── Inter-Bold.woff2
```

#### Documentation
- **Design System**: Couleurs, typographie, espacements
- **Component Library**: Guide des composants
- **Interaction Guide**: Animations et transitions
- **Responsive Behavior**: Adaptations mobile/tablet

### 9. Outils d'Extraction Automatique

Si vous utilisez **Figma**, je peux :
- Extraire automatiquement les couleurs
- Récupérer les spacings et typography
- Exporter les assets en format optimisé
- Générer le CSS correspondant

### 10. Timeline d'Intégration

1. **Phase 1** (2-4h): Analyse des designs et extraction des tokens
2. **Phase 2** (4-6h): Implémentation des écrans prioritaires
3. **Phase 3** (2-3h): Intégration des micro-interactions
4. **Phase 4** (1-2h): Tests et optimisations finales

---

## 🚀 Prêt à Commencer ?

Partagez vos designs et spécifiez vos priorités. Je commencerai l'intégration immédiatement en respectant votre identité visuelle et vos interactions souhaitées.

**Contact**: Uploadez directement vos fichiers ou partagez les liens dans le chat.
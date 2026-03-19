## Epics et User Stories Jira – Projet MaCack

Ce fichier regroupe les **epics** et **user stories** dérivés des services et méthodes définis dans `services et methods.txt`, en cohérence avec le cahier des charges MaCack.  
Chaque user story commence par « En tant que … » pour être directement exploitable dans Jira.

---

## Epic AUTH-1 – Gestion du compte utilisateur et authentification (Auth Service)

### UsersService

- **User Story AUTH-US-01 – Inscription d’un nouvel utilisateur**
  - Description : En tant que visiteur, je veux pouvoir créer un compte utilisateur en renseignant mes informations de base afin d’accéder aux fonctionnalités de la plateforme en tant que client, pâtissière ou livreur.

- **User Story AUTH-US-02 – Connexion avec email et mot de passe**
  - Description : En tant qu’utilisateur enregistré, je veux pouvoir me connecter avec mon email et mon mot de passe afin d’accéder de façon sécurisée à mon espace personnel.

- **User Story AUTH-US-03 – Déconnexion sécurisée**
  - Description : En tant qu’utilisateur connecté, je veux pouvoir me déconnecter de la plateforme afin de sécuriser mon compte lorsque je n’utilise plus l’application.

- **User Story AUTH-US-04 – Rafraîchissement du token d’accès**
  - Description : En tant qu’utilisateur connecté, je veux que ma session reste active sans devoir me reconnecter trop souvent afin d’avoir une expérience fluide tout en gardant la sécurité de mon compte.

- **User Story AUTH-US-05 – Récupération d’un utilisateur par email (interne)**
  - Description : En tant que service backend, je veux pouvoir retrouver un utilisateur à partir de son email afin de vérifier son identité ou ses permissions lors des appels entre microservices.

- **User Story AUTH-US-06 – Récupération de plusieurs utilisateurs par id (interne)**
  - Description : En tant que service backend, je veux pouvoir récupérer plusieurs utilisateurs à partir de leurs identifiants afin de construire des réponses agrégées (commandes, notations, livraisons).

- **User Story AUTH-US-07 – Gestion de la photo de profil**
  - Description : En tant qu’utilisateur, je veux pouvoir télécharger, mettre à jour ou supprimer ma photo de profil afin de personnaliser mon compte sur la plateforme.

- **User Story AUTH-US-08 – Consultation de mon profil**
  - Description : En tant qu’utilisateur connecté, je veux pouvoir consulter mon profil (nom, photo, téléphone, ville, adresse, description) afin de vérifier mes informations personnelles.

- **User Story AUTH-US-09 – Mise à jour de mon profil**
  - Description : En tant qu’utilisateur connecté, je veux pouvoir modifier mes informations de profil (nom, téléphone, adresse, description, photo) afin de garder mes données à jour.

- **User Story AUTH-US-10 – Rechargement de wallet**
  - Description : En tant que client, je veux pouvoir recharger mon wallet interne afin de payer mes commandes et livraisons plus rapidement sur la plateforme.

- **User Story AUTH-US-11 – Consultation du compte plateforme (interne)**
  - Description : En tant qu’administrateur de la plateforme, je veux pouvoir consulter le compte global de la plateforme afin de suivre les flux financiers et les commissions MaCack.

- **User Story AUTH-US-12 – Débit du wallet utilisateur**
  - Description : En tant que client, je veux que mon wallet soit débité automatiquement lors de la validation d’une commande ou d’une livraison afin de sécuriser le paiement via la plateforme.

### TokenService

- **User Story AUTH-US-13 – Génération de token d’accès**
  - Description : En tant que système d’authentification, je veux pouvoir générer un token d’accès sécurisé pour chaque utilisateur connecté afin de protéger les routes et microservices.

- **User Story AUTH-US-14 – Génération de token de rafraîchissement**
  - Description : En tant que système d’authentification, je veux pouvoir générer un token de rafraîchissement afin de permettre aux utilisateurs de prolonger leur session sans ressaisir leurs identifiants.

### Auth RedisService

- **User Story AUTH-US-15 – Enregistrement du service Auth dans le registre**
  - Description : En tant qu’administrateur technique, je veux que le service d’authentification s’enregistre automatiquement dans Redis avec son host, port et clé de routage afin de permettre la découverte des services.

- **User Story AUTH-US-16 – Récupération du client Redis Auth**
  - Description : En tant que développeur backend, je veux pouvoir accéder facilement au client Redis du service Auth afin de gérer le cache et les informations de registre.

### S3Service (auth)

- **User Story AUTH-US-17 – Initialisation de la connexion S3**
  - Description : En tant qu’administrateur technique, je veux que le service S3 Auth initialise correctement la connexion au bucket afin que le stockage des images de profil soit fiable.

- **User Story AUTH-US-18 – Upload d’image de profil sur S3**
  - Description : En tant qu’utilisateur, je veux que ma photo de profil soit stockée de manière sécurisée sur le cloud afin qu’elle soit disponible sur tous mes appareils.

- **User Story AUTH-US-19 – Suppression d’un objet S3 par clé**
  - Description : En tant qu’administrateur technique, je veux pouvoir supprimer un fichier stocké sur S3 à partir de sa clé afin de gérer le nettoyage et le respect de la vie privée.

- **User Story AUTH-US-20 – Suppression d’un objet S3 par chemin stocké**
  - Description : En tant que système, je veux pouvoir supprimer une image de profil à partir de son chemin stocké dans la base de données afin de garder la cohérence entre les données et le stockage.

---

## Epic ORDER-1 – Gestion des commandes et du cycle de vie (Order Service)

### OrderService

- **User Story ORDER-US-01 – Création d’une commande client**
  - Description : En tant que client, je veux pouvoir créer une commande de gâteau personnalisée (choix du gâteau, couleurs, garniture, message, date et heure) afin de passer ma demande à une pâtissière.

- **User Story ORDER-US-02 – Liste de mes commandes**
  - Description : En tant qu’utilisateur (client, pâtissière ou livreur), je veux pouvoir consulter la liste de mes commandes en fonction de mon rôle afin de suivre mon activité sur la plateforme.

- **User Story ORDER-US-03 – Liste des commandes pour une pâtissière**
  - Description : En tant que pâtissière, je veux pouvoir voir toutes les commandes qui me sont destinées afin d’organiser ma production.

- **User Story ORDER-US-04 – Acceptation d’une commande par la pâtissière**
  - Description : En tant que pâtissière, je veux pouvoir accepter une commande de gâteau afin de confirmer au client que je prendrai sa commande en charge.

- **User Story ORDER-US-05 – Finalisation d’une commande par la pâtissière**
  - Description : En tant que pâtissière, je veux pouvoir marquer une commande comme terminée afin d’indiquer que le gâteau est prêt à être livré.

- **User Story ORDER-US-06 – Consultation détaillée d’une commande**
  - Description : En tant qu’utilisateur associé à une commande, je veux pouvoir consulter le détail complet de la commande afin de vérifier les informations avant préparation ou livraison.

- **User Story ORDER-US-07 – Marquer la commande comme payée**
  - Description : En tant que système de paiement, je veux pouvoir marquer une commande comme payée une fois le paiement validé afin de déclencher la préparation et la livraison.

- **User Story ORDER-US-08 – Confirmation de livraison par le client**
  - Description : En tant que client, je veux pouvoir marquer la commande comme livrée afin de déclencher le versement des gains à la pâtissière et au livreur.

- **User Story ORDER-US-09 – Accès interne à une commande par id**
  - Description : En tant que microservice interne, je veux pouvoir récupérer une commande par son identifiant afin de synchroniser les informations avec les autres services (paiement, notation, livraison).

- **User Story ORDER-US-10 – Accès interne à une commande avec ses items**
  - Description : En tant que microservice interne, je veux pouvoir récupérer une commande avec tous ses items afin de calculer correctement les montants, commissions et statistiques.

- **User Story ORDER-US-11 – Marquer la commande comme livrée par le livreur**
  - Description : En tant que livreur, je veux pouvoir marquer une commande comme livrée afin d’indiquer que la livraison a été effectuée.

- **User Story ORDER-US-12 – Démarrer une livraison**
  - Description : En tant que livreur, je veux pouvoir démarrer officiellement la livraison d’une commande afin que le client et la pâtissière puissent suivre le statut en temps réel.

- **User Story ORDER-US-13 – Suppression d’une commande (interne / admin)**
  - Description : En tant qu’administrateur ou service interne, je veux pouvoir supprimer une commande dans certains cas (tests, données invalides, litiges résolus) afin de garder une base de données propre.

### EstimationService

- **User Story ORDER-US-14 – Création d’une estimation de livraison par le client**
  - Description : En tant que client, je veux pouvoir créer une estimation de livraison pour ma commande afin d’obtenir une proposition de prix d’un ou plusieurs livreurs.

- **User Story ORDER-US-15 – Création d’une estimation de livraison par un livreur**
  - Description : En tant que livreur, je veux pouvoir proposer un prix de livraison pour une commande afin de négocier ma rémunération avec le client.

- **User Story ORDER-US-16 – Confirmation d’une estimation par le client**
  - Description : En tant que client, je veux pouvoir confirmer une estimation de livraison proposée afin de valider définitivement le prix de la course.

- **User Story ORDER-US-17 – Marquer une estimation comme payée**
  - Description : En tant que système de paiement, je veux pouvoir marquer une estimation comme payée afin de sécuriser le montant de la livraison avant le début de la course.

- **User Story ORDER-US-18 – Consultation des estimations acceptées par un livreur**
  - Description : En tant que livreur, je veux pouvoir consulter les estimations qui ont été acceptées par les clients afin de planifier mes livraisons.

- **User Story ORDER-US-19 – Consultation des estimations en attente / estimées**
  - Description : En tant que livreur, je veux pouvoir voir les estimations en attente, estimées ou livrées afin de suivre l’état de mes propositions de prix.

- **User Story ORDER-US-20 – Recherche d’une estimation par id ou par commande**
  - Description : En tant que système, je veux pouvoir retrouver une estimation à partir de son identifiant ou de celui de la commande afin de synchroniser les informations entre services.

- **User Story ORDER-US-21 – Acceptation d’une offre de livraison par le client**
  - Description : En tant que client, je veux pouvoir accepter une offre de livraison spécifique d’un livreur afin de finaliser mon choix et bloquer ce livreur pour ma commande.

- **User Story ORDER-US-22 – Liste des estimations client en attente**
  - Description : En tant qu’administrateur ou service interne, je veux pouvoir voir toutes les estimations client en attente afin de monitorer l’activité et détecter les blocages potentiels.

### OrderItemService

- **User Story ORDER-US-23 – Gestion des items de commande**
  - Description : En tant que système de commandes, je veux pouvoir créer, lire, mettre à jour et supprimer des items de commande afin de décomposer chaque commande en éléments détaillés (type de gâteau, options, quantités).

### Orders RedisService

- **User Story ORDER-US-24 – Enregistrement du service Orders dans le registre**
  - Description : En tant qu’administrateur technique, je veux que le service de commandes s’enregistre automatiquement dans Redis afin de permettre la découverte et la haute disponibilité des microservices.

- **User Story ORDER-US-25 – Accès au client Redis Orders**
  - Description : En tant que développeur backend, je veux pouvoir utiliser facilement le client Redis du service Orders afin de gérer le cache, la file d’attente et la communication entre services.

---

## Epic PAY-1 – Infrastructure de paiement et escrow (Payment Service)

### RedisService (payment)

- **User Story PAY-US-01 – Enregistrement du service Payment dans le registre**
  - Description : En tant qu’administrateur technique, je veux que le service de paiement s’enregistre dans Redis avec ses informations afin de garantir sa découverte par les autres microservices.

- **User Story PAY-US-02 – Accès au client Redis Payment**
  - Description : En tant que développeur backend, je veux pouvoir accéder au client Redis du service Payment afin de gérer les transactions, le cache et les événements liés au paiement.

- **User Story PAY-US-03 – Gestion de l’escrow et des commissions (côté métier)**
  - Description : En tant que client, je veux que mon paiement soit bloqué de manière sécurisée jusqu’à la livraison afin de protéger à la fois mes intérêts et ceux de la pâtissière et du livreur, tout en laissant la plateforme appliquer sa commission.

---

## Epic RATE-1 – Notation, likes et followers (Notation Service)

### RatingService

- **User Story RATE-US-01 – Création d’une note**
  - Description : En tant que client, je veux pouvoir attribuer une note à une pâtissière ou à un livreur après une commande afin de partager mon niveau de satisfaction.

- **User Story RATE-US-02 – Consultation des notes d’un utilisateur**
  - Description : En tant qu’utilisateur, je veux pouvoir voir les notes qu’un client a laissées à une pâtissière ou à un livreur afin d’évaluer sa fiabilité avant de collaborer avec lui.

- **User Story RATE-US-03 – Consultation des notes d’un produit**
  - Description : En tant que client, je veux pouvoir consulter les notes d’un gâteau spécifique afin de choisir un produit de qualité.

- **User Story RATE-US-04 – Calcul de la note moyenne pour un utilisateur**
  - Description : En tant que système, je veux pouvoir calculer la note moyenne d’un utilisateur afin d’afficher un score global simple (étoiles) sur son profil.

- **User Story RATE-US-05 – Calcul de la note moyenne pour plusieurs utilisateurs**
  - Description : En tant que système, je veux pouvoir calculer les notes moyennes pour un ensemble d’utilisateurs afin d’optimiser les affichages de listes (recherche, suggestions).

- **User Story RATE-US-06 – Suppression d’une note**
  - Description : En tant qu’administrateur, je veux pouvoir supprimer une note inappropriée ou abusive afin de préserver l’équité du système de notation.

### LikeService (likes de produits)

- **User Story RATE-US-07 – Like / Unlike d’un produit**
  - Description : En tant que client, je veux pouvoir aimer ou ne plus aimer un produit (gâteau) afin d’exprimer mon intérêt et de le retrouver plus facilement.

- **User Story RATE-US-08 – Compteur de likes d’un produit**
  - Description : En tant que client, je veux voir le nombre de likes d’un produit afin de juger sa popularité.

- **User Story RATE-US-09 – Compteur de likes pour plusieurs produits**
  - Description : En tant que système, je veux pouvoir obtenir le nombre de likes pour une liste de produits afin d’afficher cette information dans les listes et les résultats de recherche.

- **User Story RATE-US-10 – Vérifier si un utilisateur a liké un produit**
  - Description : En tant que client, je veux savoir si j’ai déjà liké un produit afin de ne pas ajouter un like en double et de pouvoir faire un unlike.

- **User Story RATE-US-11 – Liste des produits likés par un utilisateur**
  - Description : En tant que client, je veux pouvoir voir tous les produits que j’ai likés afin de retrouver rapidement mes gâteaux préférés.

- **User Story RATE-US-12 – Récupération des ids des utilisateurs qui ont liké plusieurs produits**
  - Description : En tant que système, je veux pouvoir récupérer les identifiants des utilisateurs qui ont liké plusieurs produits afin de faire des statistiques et des recommandations.

### FollowerService (followers de pâtissières)

- **User Story RATE-US-13 – Suivre / ne plus suivre une pâtissière**
  - Description : En tant que client, je veux pouvoir suivre ou ne plus suivre une pâtissière afin d’être informé de ses nouvelles publications et promotions.

- **User Story RATE-US-14 – Liste des followers d’une pâtissière**
  - Description : En tant que pâtissière, je veux pouvoir voir la liste de mes followers afin de mieux connaître ma communauté.

- **User Story RATE-US-15 – Compteur de followers d’une pâtissière**
  - Description : En tant que pâtissière, je veux voir le nombre de mes followers afin de mesurer ma popularité sur la plateforme.

- **User Story RATE-US-16 – Vérifier si un client suit une pâtissière**
  - Description : En tant que client, je veux savoir si je suis déjà une pâtissière afin de gérer facilement mes abonnements.

### ProfileLikeService (likes de profils)

- **User Story RATE-US-17 – Like / Unlike du profil d’une pâtissière**
  - Description : En tant que client, je veux pouvoir aimer ou ne plus aimer le profil d’une pâtissière afin d’exprimer mon appréciation globale de son travail.

- **User Story RATE-US-18 – Compteur de likes d’un profil**
  - Description : En tant que pâtissière, je veux voir le nombre de likes sur mon profil afin de mesurer l’intérêt des clients pour mon activité.

- **User Story RATE-US-19 – Vérifier si un utilisateur a liké un profil**
  - Description : En tant que client, je veux savoir si j’ai déjà liké le profil d’une pâtissière afin de gérer facilement mes interactions.

### Notation RedisService

- **User Story RATE-US-20 – Enregistrement du service Notation dans le registre**
  - Description : En tant qu’administrateur technique, je veux que le service de notation s’enregistre automatiquement dans Redis afin d’assurer sa découverte par les autres microservices.

- **User Story RATE-US-21 – Accès au client Redis Notation**
  - Description : En tant que développeur backend, je veux pouvoir accéder au client Redis du service Notation afin de gérer le cache et la performance des opérations de notation, likes et followers.

---

## Epic FRONT-AUTH-1 – Expérience d’authentification et d’inscription (Front mobile/web)

Ces stories couvrent les écrans `/(auth)/login` et `/(auth)/register` (Expo Router).

- **User Story FRONT-AUTH-US-01 – Écran de connexion MaCake**
  - Description : En tant qu’utilisateur, je veux un écran de connexion simple et esthétique avec email et mot de passe pour accéder rapidement à mon compte MaCake.

- **User Story FRONT-AUTH-US-02 – Validation côté client sur le formulaire de connexion**
  - Description : En tant qu’utilisateur, je veux être informé immédiatement si mon email ou mon mot de passe ne sont pas valides afin de corriger mes informations avant l’envoi.

- **User Story FRONT-AUTH-US-03 – Gestion des états de chargement et d’erreurs à la connexion**
  - Description : En tant qu’utilisateur, je veux voir un indicateur de chargement et des messages d’erreur clairs lorsque je me connecte afin de comprendre ce qui se passe en cas de problème.

- **User Story FRONT-AUTH-US-04 – Navigation vers l’inscription depuis la connexion**
  - Description : En tant que nouveau visiteur, je veux pouvoir accéder facilement à l’écran d’inscription depuis l’écran de connexion afin de créer un compte si je n’en ai pas.

- **User Story FRONT-AUTH-US-05 – Flow d’inscription en plusieurs étapes**
  - Description : En tant que nouveau visiteur, je veux un flow d’inscription en plusieurs étapes (choix du rôle puis détails du compte) afin de créer mon compte client, pâtissière ou livreur de manière guidée.

- **User Story FRONT-AUTH-US-06 – Sélection du rôle (client, pâtissière, livreur)**
  - Description : En tant que nouveau visiteur, je veux pouvoir choisir mon rôle (client, pâtissière ou livreur) pendant l’inscription afin d’avoir une expérience adaptée à mon profil.

- **User Story FRONT-AUTH-US-07 – Saisie des informations de compte (profil + coordonnées)**
  - Description : En tant que nouveau visiteur, je veux saisir mon nom, email, mot de passe, téléphone et adresse afin de créer un compte complet prêt à l’utilisation.

- **User Story FRONT-AUTH-US-08 – Indication visuelle d’avancement dans l’inscription**
  - Description : En tant que nouveau visiteur, je veux voir la progression de mon inscription (étapes, indicateur) afin de savoir où j’en suis dans le processus.

- **User Story FRONT-AUTH-US-09 – Redirection automatique après inscription/réauthentification**
  - Description : En tant que nouvel utilisateur, je veux être redirigé automatiquement vers l’accueil adapté à mon rôle après mon inscription ou ma connexion afin de commencer à utiliser la plateforme sans friction.

---

## Epic FRONT-CLIENT-1 – Expérience Client : exploration, favoris et commandes

Ces stories couvrent l’écran client principal `/(client)/index`, la navigation client et la découverte de produits.

- **User Story FRONT-CLIENT-US-01 – Écran d’accueil client avec header MaCake**
  - Description : En tant que client, je veux un écran d’accueil avec une barre supérieure claire (logo, menu, avatar) afin de reconnaître facilement la marque MaCake et accéder aux actions principales.

- **User Story FRONT-CLIENT-US-02 – Recherche de gâteaux par mots-clés**
  - Description : En tant que client, je veux pouvoir rechercher des gâteaux par texte (nom, type, description) afin de trouver rapidement un produit correspondant à mon besoin.

- **User Story FRONT-CLIENT-US-03 – Filtrage par catégories visuelles**
  - Description : En tant que client, je veux filtrer les gâteaux par catégories (Anniversaire, Mariage, Chocolat, Enfants, etc.) afin de parcourir des listes adaptées à mon contexte.

- **User Story FRONT-CLIENT-US-04 – Section “Featured Masterpieces”**
  - Description : En tant que client, je veux voir une section de gâteaux mis en avant avec de belles images afin d’être inspiré et découvrir des créations premium.

- **User Story FRONT-CLIENT-US-05 – Section “Trending Near You” alimentée par l’API**
  - Description : En tant que client, je veux voir une liste de gâteaux populaires près de chez moi, alimentée par le backend, afin de choisir parmi les produits les plus appréciés.

- **User Story FRONT-CLIENT-US-06 – Carte produit détaillée (image, prix, lieu, pâtissière, note)**
  - Description : En tant que client, je veux voir pour chaque produit une carte avec image, prix, lieu, nom de la pâtissière, likes et note moyenne afin de décider rapidement quel gâteau sélectionner.

- **User Story FRONT-CLIENT-US-07 – Gestion du like produit côté client**
  - Description : En tant que client, je veux pouvoir liker ou enlever mon like sur un gâteau directement depuis la liste afin de sauvegarder mes favoris et influencer la popularité.

- **User Story FRONT-CLIENT-US-08 – Redirection vers le détail d’un produit**
  - Description : En tant que client, je veux pouvoir cliquer sur un produit pour accéder à une page de détail afin de voir toutes les informations avant de personnaliser et commander.

- **User Story FRONT-CLIENT-US-09 – Accès rapide au profil de la pâtissière depuis un produit**
  - Description : En tant que client, je veux pouvoir ouvrir le profil d’une pâtissière depuis une carte produit afin de voir sa note globale, ses autres gâteaux et sa réputation.

- **User Story FRONT-CLIENT-US-10 – Ouverture du menu latéral (sidebar)**
  - Description : En tant que client, je veux pouvoir ouvrir un menu latéral depuis l’accueil afin d’accéder facilement à mes commandes, favoris, paramètres et déconnexion.

- **User Story FRONT-CLIENT-US-11 – Popup de profil utilisateur**
  - Description : En tant que client, je veux voir un popup de profil lorsque je clique sur mon avatar afin d’accéder rapidement à mon espace profil, mes paramètres ou ma déconnexion.

- **User Story FRONT-CLIENT-US-12 – Gestion de l’état de chargement et des erreurs produits**
  - Description : En tant que client, je veux voir des indicateurs de chargement et des messages d’erreur en cas de problème lors du chargement des produits afin de comprendre la situation.

- **User Story FRONT-CLIENT-US-13 – Affichage d’un message “aucun produit”**
  - Description : En tant que client, je veux être informé clairement lorsqu’aucun produit n’est disponible dans la catégorie ou la recherche afin d’ajuster mes filtres ou mes mots-clés.

---

## Epic FRONT-CLIENT-2 – Panier, personnalisation et paiement

- **User Story FRONT-CLIENT-US-14 – Écran de détail produit avec personnalisation de commande**
  - Description : En tant que client, je veux un écran de détail pour chaque gâteau me permettant de choisir la taille, les couleurs, la garniture et un message personnalisé afin de créer une commande sur mesure.

- **User Story FRONT-CLIENT-US-15 – Ajout au panier depuis le détail produit**
  - Description : En tant que client, je veux pouvoir ajouter un produit personnalisé à mon panier afin de préparer ma commande avant validation finale.

- **User Story FRONT-CLIENT-US-16 – Gestion du panier client (liste, modification, suppression)**
  - Description : En tant que client, je veux voir la liste des articles dans mon panier, modifier les quantités ou supprimer des éléments afin de finaliser ma commande selon mon budget.

- **User Story FRONT-CLIENT-US-17 – Écran de checkout avec récapitulatif**
  - Description : En tant que client, je veux un écran de checkout qui récapitule les produits, options, prix et frais de livraison estimés afin de valider ma commande en toute confiance.

- **User Story FRONT-CLIENT-US-18 – Écran de paiement et confirmation visuelle**
  - Description : En tant que client, je veux un écran de paiement avec un retour visuel clair (succès/échec) afin de savoir si mon paiement a bien été pris en compte.

- **User Story FRONT-CLIENT-US-19 – Animation de succès de commande**
  - Description : En tant que client, je veux voir une animation ou un écran de succès après avoir passé ma commande afin d’avoir un feedback positif et rassurant.

---

## Epic FRONT-CLIENT-3 – Suivi de commandes, évaluations et wallet

- **User Story FRONT-CLIENT-US-20 – Onglet “Mes commandes” pour le client**
  - Description : En tant que client, je veux un onglet listant toutes mes commandes avec leurs statuts (en attente, acceptée, en préparation, en livraison, livrée) afin de suivre l’avancement en temps réel.

- **User Story FRONT-CLIENT-US-21 – Détail d’une commande avec statut et timeline**
  - Description : En tant que client, je veux un écran de détail de commande affichant les statuts successifs et les informations de livraison afin de comprendre où en est ma commande.

- **User Story FRONT-CLIENT-US-22 – Évaluation de la pâtissière et du livreur**
  - Description : En tant que client, je veux pouvoir noter la pâtissière et le livreur à la fin d’une commande afin de contribuer à la réputation de chacun.

- **User Story FRONT-CLIENT-US-23 – Gestion des favoris (produits aimés)**
  - Description : En tant que client, je veux un onglet “Favoris” qui regroupe les produits que j’ai likés afin de les retrouver et commander plus facilement.

- **User Story FRONT-CLIENT-US-24 – Consultation et utilisation du wallet client**
  - Description : En tant que client, je veux un onglet ou une section pour voir mon solde wallet, mes recharges et mes paiements afin de gérer mes dépenses sur MaCake.

---

## Epic FRONT-PATISSIERE-1 – Espace pâtissière : produits, commandes et réputation

- **User Story FRONT-PATISSIERE-US-01 – Accueil pâtissière avec résumé de performance**
  - Description : En tant que pâtissière, je veux un écran d’accueil dédié avec un résumé de mes commandes, revenus et note moyenne afin de suivre facilement mes performances.

- **User Story FRONT-PATISSIERE-US-02 – Gestion de mes produits (liste)**
  - Description : En tant que pâtissière, je veux voir la liste de tous mes gâteaux publiés afin de pouvoir les mettre à jour ou les supprimer.

- **User Story FRONT-PATISSIERE-US-03 – Création d’un nouveau produit**
  - Description : En tant que pâtissière, je veux un écran pour créer un nouveau gâteau avec images, prix, description et options de personnalisation afin de proposer mes créations aux clients.

- **User Story FRONT-PATISSIERE-US-04 – Modification et suppression d’un produit existant**
  - Description : En tant que pâtissière, je veux pouvoir modifier ou supprimer un produit existant afin de garder mon catalogue à jour.

- **User Story FRONT-PATISSIERE-US-05 – Consultation des commandes reçues**
  - Description : En tant que pâtissière, je veux un écran listant mes commandes reçues avec leurs statuts afin d’organiser ma production.

- **User Story FRONT-PATISSIERE-US-06 – Acceptation ou refus d’une commande**
  - Description : En tant que pâtissière, je veux pouvoir accepter ou refuser une commande depuis l’interface afin de gérer ma capacité de production.

- **User Story FRONT-PATISSIERE-US-07 – Mise à jour du statut de préparation**
  - Description : En tant que pâtissière, je veux pouvoir marquer une commande comme “en préparation” puis “prête” afin d’informer le client et les livreurs.

- **User Story FRONT-PATISSIERE-US-08 – Accès à mon profil public et à mes followers**
  - Description : En tant que pâtissière, je veux pouvoir consulter mon profil public tel que vu par les clients, avec mes notes, followers et likes afin de suivre ma réputation.

- **User Story FRONT-PATISSIERE-US-09 – Historique de gains et retraits**
  - Description : En tant que pâtissière, je veux voir l’historique de mes gains et retraits afin de suivre mes revenus générés via MaCake.

---

## Epic FRONT-LIVREUR-1 – Espace livreur : courses, revenus et profil

- **User Story FRONT-LIVREUR-US-01 – Accueil livreur avec overview des livraisons**
  - Description : En tant que livreur, je veux un écran d’accueil dédié avec une vue rapide sur mes livraisons du jour, en cours et terminées afin d’organiser ma journée.

- **User Story FRONT-LIVREUR-US-02 – Liste des commandes disponibles à livrer**
  - Description : En tant que livreur, je veux voir une liste des commandes prêtes à être livrées afin de choisir celles que je souhaite prendre.

- **User Story FRONT-LIVREUR-US-03 – Proposition de prix de livraison**
  - Description : En tant que livreur, je veux pouvoir proposer un prix de livraison pour une commande depuis l’interface afin de négocier ma rémunération avec le client.

- **User Story FRONT-LIVREUR-US-04 – Suivi des livraisons en cours**
  - Description : En tant que livreur, je veux voir mes livraisons en cours avec les points de départ et d’arrivée afin de suivre mon itinéraire.

- **User Story FRONT-LIVREUR-US-05 – Mise à jour du statut de livraison**
  - Description : En tant que livreur, je veux pouvoir mettre à jour le statut d’une livraison (en cours, livrée) afin que le client et la pâtissière soient informés en temps réel.

- **User Story FRONT-LIVREUR-US-06 – Consultation des gains par course**
  - Description : En tant que livreur, je veux voir le détail de mes gains par course et mon solde global afin de suivre mes revenus.

- **User Story FRONT-LIVREUR-US-07 – Gestion du profil livreur**
  - Description : En tant que livreur, je veux pouvoir gérer mon profil (photo, ville, description) afin de donner confiance aux clients et pâtissières.

---

## Epic FRONT-COMMON-1 – Layout, navigation, profil et paramètres

- **User Story FRONT-COMMON-US-01 – Navigation par onglets avec animations**
  - Description : En tant qu’utilisateur, je veux une navigation par onglets fluide et animée afin de passer facilement entre les sections principales de l’application.

- **User Story FRONT-COMMON-US-02 – Layouts séparés par rôle**
  - Description : En tant qu’utilisateur, je veux que l’interface s’adapte à mon rôle (client, pâtissière, livreur) afin de ne voir que les fonctionnalités pertinentes pour moi.

- **User Story FRONT-COMMON-US-03 – Écran de profil utilisateur**
  - Description : En tant qu’utilisateur, je veux un écran de profil où je peux voir et modifier mes informations (photo, nom, description, ville) afin de gérer mon identité sur MaCake.

- **User Story FRONT-COMMON-US-04 – Écran de paramètres**
  - Description : En tant qu’utilisateur, je veux un écran de paramètres regroupant les options de compte, notifications et sécurité afin de configurer la plateforme selon mes préférences.

- **User Story FRONT-COMMON-US-05 – Splash screen et transition de démarrage**
  - Description : En tant qu’utilisateur, je veux un écran de démarrage agréable pendant le chargement initial de l’application afin d’avoir une première impression professionnelle.

---

## Epic FRONT-NOTIF-1 – Notifications temps réel et feedbacks UI

- **User Story FRONT-NOTIF-US-01 – Gestion des notifications in-app (toast, banners)**
  - Description : En tant qu’utilisateur, je veux recevoir des notifications visuelles dans l’application (bannières, toasts) lors d’événements importants (nouvelle commande, commande acceptée, nouvelle offre de livraison, etc.) afin d’être informé sans devoir recharger les écrans.

- **User Story FRONT-NOTIF-US-02 – Mise à jour temps réel des statuts de commande**
  - Description : En tant que client, je veux que le statut de ma commande se mette à jour automatiquement sans recharger l’écran afin de suivre l’avancement en temps réel.

- **User Story FRONT-NOTIF-US-03 – Feedback visuel pour les actions principales**
  - Description : En tant qu’utilisateur, je veux des feedbacks visuels (chargement, états désactivés, confirmations) pour toutes les actions importantes (like, ajout au panier, paiement, modification de profil) afin de comprendre immédiatement le résultat de mes actions.

---

## Utilisation dans Jira

- **Epics** : créer un epic Jira par section principale (`AUTH-1`, `ORDER-1`, `PAY-1`, `RATE-1`, `FRONT-AUTH-1`, `FRONT-CLIENT-1`, `FRONT-CLIENT-2`, `FRONT-CLIENT-3`, `FRONT-PATISSIERE-1`, `FRONT-LIVREUR-1`, `FRONT-COMMON-1`, `FRONT-NOTIF-1`).
- **User stories** : pour chaque **User Story** ci-dessus, créer une issue de type *Story* dans Jira, en copiant la ligne de titre et la **Description** correspondante.
- **Liens** : lier les stories à leurs epics respectifs et, si besoin, ajouter les tâches techniques détaillées (implémentation, tests, déploiement) en sous-tâches.


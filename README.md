# Connection Limiter

Application Expo / React Native de suivi des quotas Internet, avec lecture expérimentale des compteurs d’interface cellulaire sur iOS.

## Démarrer

```bash
npm install
npx expo start
```

Le module Swift embarqué n’est pas disponible dans Expo Go. Pour utiliser le compteur natif, générez et lancez un development build iOS sur macOS :

```bash
npx expo run:ios
```

Expo Go ne contient pas le module de compteur Swift. Après chaque changement natif, il faut installer un nouveau build iOS. Un iPhone physique est nécessaire pour tester les interfaces cellulaires. Depuis Windows, lancez un build interne EAS (connexion Expo et compte Apple Developer requis) :

```bash
npx eas-cli@latest build --profile preview --platform ios
```

## Fonctionnalités

- Créer des quotas en Mo ou Go sur une période journalière, hebdomadaire ou mensuelle.
- Lire les compteurs d’octets des interfaces cellulaires iOS et ajouter leur évolution au quota actif.
- Recevoir des alertes locales au franchissement de 50 %, 80 % et 100 %.
- Consulter les relevés automatiques et les ajustements manuels dans l’historique.

Le relevé natif utilise `getifaddrs` et les compteurs d’interface `pdp_ip*`. Il n’identifie pas l’application qui a généré le trafic. La mesure commence à la première lecture, peut se réinitialiser au redémarrage ou lors d’un changement d’interface, et n’est pas une facture opérateur. Quand iOS suspend l’app, les notifications de seuil attendent la prochaine lecture au retour au premier plan. L’API et son comportement doivent être validés sur les appareils et versions iOS ciblés.

Cette application ne désactive pas les données cellulaires et ne bloque pas globalement Internet. Le choix « Bloquer » dans un quota est une préférence, pas une action système prise en charge par iOS dans cette version.

## Vérification

```bash
npx tsc --noEmit
npx expo lint
```

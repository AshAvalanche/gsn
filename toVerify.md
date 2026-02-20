# 📋 Rapport de Logique Métier — OpenGSN v3.0.0-beta.10

## Contexte de migration : Truffle/Hardhat → Foundry & web3js/ethers → viem

> **Source:** [`opengsn/gsn` tag `v3.0.0-beta.10`](https://github.com/opengsn/gsn/tree/v3.0.0-beta.10)

---

## 1. Architecture Générale (Monorepo Lerna)

```
packages/
├── cli/          # CLI pour déploiement/gestion
├── common/       # Types, EIP-712, ContractInteractor, Utils partagés
├── contracts/    # Contrats Solidity (RelayHub, Paymaster, Forwarder, StakeManager, Penalizer…)
├── deployer/     # Scripts de déploiement
├── dev/          # Outils de développement/tests
├── logger/       # Système de logging
├── paymasters/   # Implémentations de Paymasters
├── provider/     # RelayProvider, RelayClient côté dApp (front-end)
└── relay/        # RelayServer, TransactionManager (back-end relay)
```

### Dépendances critiques à migrer (ethers/web3js → viem)

| Dépendance actuelle | Usage | Impact migration |
|---|---|---|
| `ethers` / `@ethersproject/*` | `ContractInteractor`, signing, ABI encoding, BigNumber | **MAJEUR** — colonne vertébrale |
| `web3js` (`bn.js`, `toBN`) | Constants, calculs de gas | Moyen |
| `ethereumjs-util` (`PrefixedHexString`, `bufferToHex`) | Types hex, buffers | Moyen |
| `@metamask/eth-sig-util` | EIP-712 signature (`TypedDataUtils`, `signTypedData`) | **CRITIQUE** pour les signatures |
| `@ethereumjs/common` | Raw transaction options (chainId, networkId) | Faible |

---

## 2. Structures de Données Métier (EIP-712) — NE DOIVENT PAS CHANGER

### 2.1 `ForwardRequest` (ce que l'utilisateur signe)

```typescript name=packages/common/src/EIP712/ForwardRequest.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/EIP712/ForwardRequest.ts
type addresses = 'from' | 'to'
type data = 'data'
type intStrings = 'value' | 'nonce' | 'gas' | 'validUntilTime'

export type ForwardRequest = Record<addresses, Address> & Record<data, PrefixedHexString> & Record<intStrings, IntString>
```

**Champs EIP-712 on-chain correspondants :**
| Champ | Type Solidity | Description |
|---|---|---|
| `from` | `address` | Expéditeur original (EOA) |
| `to` | `address` | Contrat destinataire |
| `value` | `uint256` | Valeur ETH à transférer |
| `gas` | `uint256` | Gas limit pour l'appel au destinataire |
| `nonce` | `uint256` | Nonce du Forwarder (anti-replay) |
| `data` | `bytes` | Calldata de la fonction destinataire |
| `validUntilTime` | `uint256` | Timestamp d'expiration de la requête |

### 2.2 `RelayData` (paramètres du relais)

```typescript name=packages/common/src/EIP712/RelayData.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/EIP712/RelayData.ts
export interface RelayData {
  maxFeePerGas: IntString
  maxPriorityFeePerGas: IntString
  transactionCalldataGasUsed: IntString
  relayWorker: Address
  paymaster: Address
  paymasterData: PrefixedHexString
  clientId: IntString
  forwarder: Address
}
```

### 2.3 `RelayRequest` = `ForwardRequest` + `RelayData`

```typescript name=packages/common/src/EIP712/RelayRequest.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/EIP712/RelayRequest.ts
export interface RelayRequest {
  request: ForwardRequest
  relayData: RelayData
}
```

### 2.4 `RelayMetadata` + `RelayTransactionRequest` (enveloppe envoyée au Relay Server)

```typescript name=packages/common/src/types/RelayTransactionRequest.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/types/RelayTransactionRequest.ts
export interface RelayMetadata {
  approvalData: PrefixedHexString
  relayHubAddress: Address
  relayLastKnownNonce: number
  relayRequestId: PrefixedHexString
  relayMaxNonce: number
  signature: PrefixedHexString
  maxAcceptanceBudget: PrefixedHexString
  domainSeparatorName: string
}

export interface RelayTransactionRequest {
  relayRequest: RelayRequest
  metadata: RelayMetadata
}
```

> ⚠️ **Point critique migration :** La shape de validation `RelayTransactionRequestShape` utilise `ow` pour la validation runtime. Tous les champs `IntString` sont des `string` (pas des `bigint` viem).

### 2.5 `GsnTransactionDetails` (entrée utilisateur côté Provider)

```typescript name=packages/common/src/types/GsnTransactionDetails.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/types/GsnTransactionDetails.ts
export interface GsnTransactionDetails {
  readonly from: Address
  readonly data: PrefixedHexString
  readonly to: Address
  readonly value?: IntString
  gas?: PrefixedHexString
  maxFeePerGas: PrefixedHexString
  maxPriorityFeePerGas: PrefixedHexString
  readonly paymasterData?: PrefixedHexString
  readonly clientId?: IntString
  readonly useGSN?: boolean  // false = transaction directe
}
```

---

## 3. Signature EIP-712 — LOGIQUE CRITIQUE

```typescript name=packages/common/src/EIP712/TypedRequestData.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/EIP712/TypedRequestData.ts
// Domain Separator — DOIT être identique en Foundry
export const GsnDomainSeparatorType = {
  prefix: 'string name,string version',
  version: '3'
}

export function getDomainSeparator(name: string, verifier: Address, chainId: number): EIP712Domain {
  return {
    name,
    version: GsnDomainSeparatorType.version,  // TOUJOURS "3"
    chainId,
    verifyingContract: verifier               // Adresse du Forwarder
  }
}

// Types EIP-712 exacts — l'ORDRE des champs est CRITIQUE pour le hash
const RelayDataType = [
  { name: 'maxFeePerGas', type: 'uint256' },
  { name: 'maxPriorityFeePerGas', type: 'uint256' },
  { name: 'transactionCalldataGasUsed', type: 'uint256' },
  { name: 'relayWorker', type: 'address' },
  { name: 'paymaster', type: 'address' },
  { name: 'forwarder', type: 'address' },
  { name: 'paymasterData', type: 'bytes' },
  { name: 'clientId', type: 'uint256' }
]

const ForwardRequestType = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
  { name: 'validUntilTime', type: 'uint256' }
]

const RelayRequestType = [
  ...ForwardRequestType,
  { name: 'relayData', type: 'RelayData' }
]

// Le type suffix EXACT pour le registrar on-chain
export const GsnRequestType = {
  typeName: 'RelayRequest',
  typeSuffix: 'RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)'
}
```

> ⚠️ **Migration viem :** Avec `signTypedData` de viem, il faudra reconstruire **exactement** le même `domain`, `types`, et `message` en respectant que les champs `request` sont **aplatis** au niveau racine et `relayData` est un sous-objet.

```typescript
// Dans le constructeur TypedRequestData, le message est construit ainsi:
this.message = {
  ...relayRequest.request,    // from, to, value, gas, nonce, data, validUntilTime (aplatis)
  relayData: relayRequest.relayData  // sous-type
}
```

---

## 4. Contrats Solidity — Logique On-Chain

### 4.1 `RelayHub.relayCall()` — Point d'Entrée Principal

**Signature on-chain :**
```solidity
function relayCall(
    string calldata domainSeparatorName,
    uint256 maxAcceptanceBudget,
    GsnTypes.RelayRequest calldata relayRequest,
    bytes calldata signature,
    bytes calldata approvalData
) external returns (
    bool paymasterAccepted,
    uint256 charge,
    IRelayHub.RelayCallStatus status,
    bytes memory returnValue
)
```

**Flux de `relayCall` :**

1. **Vérification de non-dépréciation** : `require(!isDeprecated())`
2. **Vérification de l'appelant** :
   - Si `msg.sender != batchGateway && tx.origin != DRY_RUN_ADDRESS` :
     - `signature.length != 0`
     - `msg.sender == tx.origin` (relay worker doit être EOA)
     - `msg.sender == relayRequest.relayData.relayWorker`
3. **Vérification du stake** : `workerToManager[relayWorker] != address(0)` + `verifyRelayManagerStaked()`
4. **`verifyGasAndDataLimits()`** :
   - Appelle `paymaster.getGasAndDataLimits{gas:50000}()`
   - Vérifie `msg.data.length <= calldataSizeLimit`
   - Vérifie `maxAcceptanceBudget >= acceptanceBudget >= preRelayedCallGasLimit`
   - Calcule `maxPossibleGas = transactionCalldataGasUsed + initialGasLeft`
   - Vérifie `calculateCharge(maxPossibleGas, relayData) <= balances[paymaster]`
5. **`RelayHubValidator.verifyTransactionPacking()`** — vérification de l'encodage calldata
6. **`innerRelayCall()`** (appel atomique interne via `address(this).call`) :
   - Vérifie la signature EIP-712 via `GsnEip712Library`
   - Appelle `paymaster.preRelayedCall()`
   - Appelle `forwarder.execute()` (qui appelle le destinataire)
   - Appelle `paymaster.postRelayedCall()`
7. **Calcul des frais** via `calculateCharge()` + `calculateDevCharge()`
8. **Distribution** : balance paymaster → relayManager + devAddress

### 4.2 `RelayHubConfig` — Paramètres Critiques

```solidity name=RelayHubConfig url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/contracts/src/interfaces/IRelayHub.sol#L26-L46
struct RelayHubConfig {
    uint256 maxWorkerCount;       // Max workers par manager
    uint256 gasReserve;           // Gas réservé pour éviter OOG
    uint256 postOverhead;         // Gas overhead pour gasUseWithoutPost
    uint256 gasOverhead;          // Gas overhead global du relayCall
    uint256 minimumUnstakeDelay;  // Délai minimum d'unstake
    address devAddress;           // Adresse du développeur (pour devFee)
    uint8 devFee;                 // Pourcentage de frais dev (0-99)
    uint80 baseRelayFee;          // Frais de base en wei
    uint16 pctRelayFee;           // Pourcentage de frais relay
}
```

### 4.3 `RelayCallStatus` — Codes de Retour

```solidity
enum RelayCallStatus {
    OK,                        // 0 - Succès
    RelayedCallFailed,         // 1 - L'appel interne a échoué
    RejectedByPreRelayed,      // 2 - preRelayedCall a revert
    RejectedByForwarder,       // 3 - Vérification forwarder échouée (signature/nonce)
    RejectedByRecipientRevert, // 4 - Le destinataire a revert
    PostRelayedFailed,         // 5 - postRelayedCall a revert
    PaymasterBalanceChanged    // 6 - Balance paymaster changée pendant l'exécution
}
```

### 4.4 Événements On-Chain à Écouter

| Événement | Contrat | Rôle |
|---|---|---|
| `RelayWorkersAdded` | RelayHub | Workers ajoutés par un manager |
| `TransactionRelayed` | RelayHub | Transaction relayée (succès ou échec) |
| `TransactionRejectedByPaymaster` | RelayHub | Paymaster a refusé |
| `Deposited` | RelayHub | Dépôt ETH pour un paymaster |
| `Withdrawn` | RelayHub | Retrait de fonds |
| `RelayServerRegistered` | RelayRegistrar | Enregistrement d'un relay |
| `StakeAdded` | StakeManager | Stake ajouté |
| `HubAuthorized` / `HubUnauthorized` | StakeManager | Autorisation/retrait de hub |
| `StakeUnlocked` / `StakeWithdrawn` / `StakePenalized` | StakeManager | Cycle de vie du stake |
| `CommitAdded` | Penalizer | Commit de pénalisation |

**`ActiveManagerEvents`** (signes d'activité d'un relay) :
```typescript
const ActiveManagerEvents = [RelayWorkersAdded, TransactionRelayed, TransactionRejectedByPaymaster]
```

---

## 5. Calcul de Gas — Logique Partagée Client/Serveur

### 5.1 Formule `calculateTransactionMaxPossibleGasUsed`

```
maxPossibleGas = gasOverhead
  + (dataOnChainHandlingGasCostPerByte × msgDataLength)
  + calldataGasUsed
  + innerRecipientCallGasLimit
  + preRelayedCallGasLimit
  + postRelayedCallGasLimit
```

### 5.2 Facteur de sécurité et réserve

```typescript
const GAS_FACTOR = 1.1   // 10% de marge (règle 63/64 EIP-150, profondeur 3)
const GAS_RESERVE = 100000 // Réserve constante

maxPossibleGasUsedFactorReserve = GAS_RESERVE + Math.floor(maxPossibleGas * GAS_FACTOR)
```

### 5.3 `balanceToGas` — Conversion balance → gas limit

```typescript
balanceToGas(balance, maxFeePerGas) {
  const pctRelayFeeDev = pctRelayFee + 100
  return balance / maxFeePerGas * 100 / pctRelayFeeDev * 3 / 4  // 75% max
}
```

### 5.4 `calculateCharge` (on-chain)

```
charge = (gasUsed × maxFeePerGas) × (100 + pctRelayFee) / 100 + baseRelayFee
devCharge = charge × devFee / 100
```

> ⚠️ **Migration :** Les calculs utilisent actuellement `BigNumber` d'ethers et `BN` de bn.js. Avec viem, utiliser `bigint` natif. Attention aux arrondis entiers (division entière).

---

## 6. `ContractInteractor` — Couche d'Abstraction RPC

C'est le **fichier le plus impacté** (~47KB). Il encapsule TOUTES les interactions blockchain.

### Responsabilités clés :

| Méthode | Logique métier |
|---|---|
| `init()` | Détecte EIP-1559 (Type 2) via `eth_feeHistory`, résout le déploiement, valide versions |
| `_resolveDeploymentFromPaymaster()` | Paymaster → `getRelayHub()` + `getTrustedForwarder()` + `versionPaymaster()` |
| `_resolveDeploymentFromRelayHub()` | RelayHub → `stakeManager` + `penalizer` + `relayRegistrar` |
| `_validateCompatibility()` | Vérifie `versionHub()` compatible avec `versionManager.requiredVersionRange` |
| `_validateERC165Interfaces*()` | Vérifie les interfaces ERC-165 de chaque contrat |
| `encodeABI()` | Encode `relayCall(domainSeparatorName, maxAcceptanceBudget, relayRequest, signature, approvalData)` |
| `calculateCalldataGasUsed()` | Estimation gas calldata (stratégie selon L1/L2) |
| `calculateChargeWithRelayHub()` | View call vers `relayHub.calculateCharge()` |
| `hubBalanceOf()` | `relayHub.balanceOf(paymaster)` |
| `getBalance()` | `provider.getBalance(address)` |
| `getBlockGasLimit()` | `provider.getBlock('latest').gasLimit` |

### Transaction Type Detection :

```typescript
// Détection automatique EIP-1559
if (block.baseFeePerGas != null) {
  try {
    await this.getFeeHistory('0x1', 'latest', [0.5])
    this.transactionType = TransactionType.TYPE_TWO  // EIP-1559
  } catch {
    this.transactionType = TransactionType.LEGACY     // Fallback
  }
}
```

### ERC-165 Interface IDs (calculés dynamiquement à partir des ABIs) :

```typescript name=packages/common/src/Constants.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/Constants.ts#L37-L44
export const erc165Interfaces = {
  forwarder: getERC165InterfaceID(forwarderAbi),
  paymaster: getERC165InterfaceID(paymasterAbi),
  penalizer: getERC165InterfaceID(penalizerAbi),
  relayRegistrar: getERC165InterfaceID(relayRegistrarAbi),
  relayHub: getERC165InterfaceID(relayHubAbi),
  stakeManager: getERC165InterfaceID(stakeManagerAbi)
}
```

---

## 7. Callbacks et Types Fonctionnels

```typescript name=Callbacks url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/types/Aliases.ts#L20-L37
// Filtrage des relays par ping
type PingFilter = (pingResponse: PingResponse, gsnTransactionDetails: GsnTransactionDetails) => void

// Données paymaster (incluses dans la requête signée par l'utilisateur, PAS d'accès au relayRequestId)
type PaymasterDataCallback = (relayRequest: RelayRequest) => Promise<PrefixedHexString>

// Données d'approbation (a accès au relayRequestId)
type ApprovalDataCallback = (relayRequest: RelayRequest, relayRequestId: PrefixedHexString) => Promise<PrefixedHexString>

// Signature EIP-712 customisable
type SignTypedDataCallback = (signedData: TypedMessage<any>, from: Address) => Promise<PrefixedHexString>

// Estimation gas calldata (stratégie selon L1/L2/rollup)
type CalldataGasEstimation = (calldata: PrefixedHexString, environment: Environment, slackFactor: number, provider: JsonRpcProvider) => Promise<number>

// Filtrage des relays par info registrar
type RelayFilter = (registrarRelayInfo: RegistrarRelayInfo) => boolean
```

---

## 8. Constantes Critiques

```typescript name=packages/common/src/Constants.ts url=https://github.com/opengsn/gsn/blob/2b4c2526b71f0451f0dcceffef1dda451c1b28e1/packages/common/src/Constants.ts#L17-L35
export const constants = {
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  BURN_ADDRESS: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
  DRY_RUN_ADDRESS: '0x0000000000000000000000000000000000000000',
  DRY_RUN_KEY: 'DRY-RUN',
  ZERO_BYTES32: '0x00000000000000000000000000000000000000000000000000000000000000',
  MAX_UINT256: 2^256 - 1,
  MAX_UINT96: 2^96 - 1,
  ARBITRUM_ARBSYS: '0x0000000000000000000000000000000000000064'
}
```

---

## 9. Packages Côté Client (`provider/`) — Flux de Relayage

### Architecture du flux complet :

```
dApp → RelayProvider.send() → RelayClient.relayTransaction()
  │
  ├─ 1. AccountManager.sign()         — Signature EIP-712 du RelayRequest
  ├─ 2. KnownRelaysManager.refresh()  — Découverte des relays via RelayRegistrar events
  ├─ 3. RelaySelectionManager.select() — Sélection du meilleur relay (ping, fees, réputation)
  ├─ 4. RelayClient._prepareRelayHttpRequest() — Construction du RelayTransactionRequest
  │     ├─ Dry-run view call (calculateCharge, estimate gas)
  │     ├─ Signature EIP-712 (TypedRequestData)
  │     └─ Calcul transactionCalldataGasUsed
  ├─ 5. HttpClient.relayTransaction()  — Envoi HTTP au relay server
  ├─ 6. RelayedTransactionValidator.validateRelayResponse() — Validation de la réponse
  └─ 7. Broadcast de la transaction signée par le relay
```

### `RelayedTransactionValidator` — Vérifications post-réponse :

Vérifie que la transaction retournée par le relay server :
- A le bon `to` (RelayHub)
- A le bon gas price
- Décode correctement en `relayCall(…)` avec les bons paramètres
- Le `relayWorker` correspond bien au signer de la transaction

---

## 10. Package Côté Serveur (`relay/`) — Flux du Relay Server

### `RelayServer` (~45KB) :

| Composant | Rôle |
|---|---|
| `RelayServer.createRelayTransaction()` | Reçoit `RelayTransactionRequest`, valide, crée et signe la tx |
| `RegistrationManager` | Gère l'enregistrement on-chain (stake, addWorkers, registerRelayServer) |
| `TransactionManager` | Gère le nonce, les retry, le boosting de gas, le suivi des tx pending |
| `ReputationManager` | Système de réputation des paymasters (blacklist si trop de rejets) |
| `KeyManager` | Gestion des clés privées (manager + workers) |
| `TxStoreManager` | Persistance des transactions (nedb) |

### Validation serveur avant relayage :

1. Validation de la shape `RelayTransactionRequest` (ow)
2. Vérification `relayMaxNonce >= currentNonce`
3. Vérification `relayHubAddress` correspond
4. Vérification `relayWorker` est un des workers connus
5. Vérification de la réputation du paymaster
6. `calculateRelayRequestLimits()` — calcul gas limits
7. View call `relayHub.relayCall()` (dry run) pour vérifier acceptation paymaster
8. Création et signature de la transaction Ethereum

---

## 11. Checklist de Validation Post-Migration

### ✅ Invariants EIP-712 (MUST NOT break) :
- [ ] Le `domain` EIP-712 est `{name: <domainSeparatorName>, version: "3", chainId, verifyingContract: <forwarder>}`
- [ ] L'ordre des champs dans `RelayRequestType`, `RelayDataType`, `ForwardRequestType` est identique
- [ ] Le `typeSuffix` pour le registrar correspond exactement au `GsnRequestType.typeSuffix`
- [ ] Le message aplati (`...request, relayData: relayData`) est respecté

### ✅ Appels On-Chain (ABI encoding) :
- [ ] `relayCall(string,uint256,((...),(...)),bytes,bytes)` — l'ABI encoding est identique
- [ ] `depositFor(address)`, `withdraw(address,uint256)` — appels simples
- [ ] `addRelayWorkers(address[])` — depuis le manager
- [ ] `getGasAndDataLimits()` sur le paymaster (appelé avec `{gas:50000}`)

### ✅ Calculs de Gas :
- [ ] `maxPossibleGas` formula identique (gasOverhead + calldata + inner + pre + post)
- [ ] `GAS_FACTOR = 1.1`, `GAS_RESERVE = 100000`
- [ ] `balanceToGas` : division entière, facteur 75%
- [ ] `calculateCharge` : `(gasUsed * maxFeePerGas) * (100 + pctRelayFee) / 100 + baseRelayFee`

### ✅ Détection réseau :
- [ ] Détection EIP-1559 via `block.baseFeePerGas` + `eth_feeHistory`
- [ ] Fallback `LEGACY` si `eth_feeHistory` échoue
- [ ] `net_version` pour le networkId

### ✅ Events parsing :
- [ ] Décodage des events `TransactionRelayed`, `TransactionRejectedByPaymaster`, `RelayWorkersAdded`, `Deposited`
- [ ] Les indexed parameters doivent être correctement filtrés (topics)

### ✅ Types numériques (ethers BigNumber → viem bigint) :
- [ ] Tous les `BigNumber.from()` → `BigInt()` ou littéraux `n`
- [ ] `BN` (bn.js) dans Constants → `bigint`
- [ ] Attention aux divisions entières (pas de `.toNumber()` unsafe sur gros nombres)

### ✅ Hex / Buffer :
- [ ] `PrefixedHexString` (`0x...`) → `Hex` de viem
- [ ] `bufferToHex` → `toHex` de viem
- [ ] `@metamask/eth-sig-util` signing → `signTypedData` de viem

---

Ce rapport couvre l'ensemble de la logique métier extractible du code source. Les contrats Solidity eux-mêmes **ne changent pas** lors de la migration Truffle→Foundry (seul le framework de compilation/test change), mais il est **critique** que :

1. Les **ABIs générés par Foundry soient identiques** à ceux de Truffle/Hardhat
2. Les **tests Foundry reproduisent les mêmes scénarios** (notamment les dry-run depuis `DRY_RUN_ADDRESS`)
3. Le **client viem encode les appels et signatures EIP-712 de manière byte-identical** à l'implémentation ethers actuelle
